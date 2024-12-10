import createDebug from 'debug';
import {
  Characteristic,
  CharacteristicValue,
  Nullable,
  PlatformAccessory,
  Service,
} from 'homebridge';
import os from 'node:os';
import nunjucks from 'nunjucks';
import { tasmotaPlatform } from './tasmotaPlatform.js';

const debug = createDebug('Tasmota:Service');

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */

interface Subscription {
  event: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback: any
}

export class TasmotaService {
  public service?: Service;
  protected characteristic?: Characteristic;
  protected device_class: string;
  public statusSubscribe?: Subscription;
  public availabilitySubscribe?: Subscription;
  public fakegato: string;
  public nunjucksEnvironment;
  protected uuid: string;

  constructor(
    public readonly platform: tasmotaPlatform,
    public readonly accessory: PlatformAccessory,
    protected readonly uniq_id: string,
  ) {
    this.fakegato = '';
    this.uuid = this.platform.api.hap.uuid.generate(this.accessory.context.device[this.uniq_id].uniq_id);
    this.device_class = accessory.context.device[this.uniq_id].dev_cla;

    this.nunjucksEnvironment = new nunjucks.Environment();

    // Home Assistant device template filters

    this.nunjucksEnvironment.addFilter('is_defined', (val, cb) => {
      // console.log('is_defined', val, cb);
      if (val || val === 0) {
        cb(null, val);
      } else {
        cb(new Error('missing key'), val);
      }
    }, true);

    function float(val: string) {
      return (Number.parseFloat(val));
    }

    this.nunjucksEnvironment.addGlobal('float', float);

    nunjucks.installJinjaCompat();
    nunjucks.configure({
      autoescape: true,
    });
  }

  enableFakegato() {
    // Enable historical logging

    if (this.platform.config.history && !this.accessory.context.fakegatoService?.addEntry) {
      const hostname = os.hostname().split('.')[0];
      this.accessory.context.fakegatoService = new this.platform.FakeGatoHistoryService('custom', this.accessory, {
        storage: 'fs',
        minutes: this.platform.config.historyInterval ?? 10,
        log: this.platform.log,
        filename: `${hostname}_${this.uniq_id}_persist.json`,
      });
      this.platform.log.debug('Creating fakegato service for %s %s', this.accessory.context.device[this.uniq_id].stat_t,
        this.accessory.context.device[this.uniq_id].name, this.accessory.context.device[this.uniq_id].uniq_id);
    } else {
      debug('fakegatoService exists', this.accessory.context.device[this.uniq_id].name);
    }
  }

  enableStatus() {
    this.refresh();
    if (this.characteristic) {
      if (this.accessory.context.device[this.uniq_id].stat_t) {
        this.platform.log.debug('Creating statusUpdate listener for %s %s', this.accessory.context.device[this.uniq_id].stat_t,
          this.accessory.context.device[this.uniq_id].name);
        this.statusSubscribe = { event: this.accessory.context.device[this.uniq_id].stat_t, callback: this.statusUpdate.bind(this) };
        this.platform.mqttHost.on(this.accessory.context.device[this.uniq_id].stat_t, this.statusUpdate.bind(this));
        this.platform.mqttHost.statusSubscribe(this.accessory.context.device[this.uniq_id].stat_t);
      }
      if (this.accessory.context.device[this.uniq_id].avty_t) {
        this.availabilitySubscribe = { event: this.accessory.context.device[this.uniq_id].avty_t, callback: this.availabilityUpdate.bind(this) };
        this.platform.mqttHost.on(this.accessory.context.device[this.uniq_id].avty_t, this.availabilityUpdate.bind(this));
        this.availabilitySubscribe = this.platform.mqttHost.availabilitySubscribe(this.accessory.context.device[this.uniq_id].avty_t);
      } else {
        this.platform.log.warn('Warning: Availability not supported for: %s', this.accessory.context.device[this.uniq_id].name);
      }
    }
  }

  deviceClassToHKCharacteristic(device_class: string) {
    switch (device_class) {
      case '-dt24-amp':
      case '_energy_current': // Amps
        return (this.platform.CustomCharacteristics.ElectricCurrent);
      case '_energy_voltage': // Voltage
      case '-dt24-volt': // dt24
        return (this.platform.CustomCharacteristics.Voltage);
      case '_energy_power': // Watts
      case '-dt24-watt': // dt24
        return (this.platform.CustomCharacteristics.CurrentConsumption);
      case '_energy_total': // Total Kilowatts
      case '-dt24-watt-hour':
        return (this.platform.CustomCharacteristics.TotalConsumption);
        break;
    }
  }

  refresh() {
    // Get current status for accessory/service on startup
    // Wild cards in topic break this
    // eslint-disable-next-line no-useless-escape
    if (this.accessory.context.device[this.uniq_id].stat_t && !this.accessory.context.device[this.uniq_id].stat_t.match('/\+|#/g')) {
      const teleperiod = `${this.accessory.context.device[this.uniq_id].stat_t.substr(0,
        this.accessory.context.device[this.uniq_id].stat_t.lastIndexOf('/') + 1).replace('tele', 'cmnd')}teleperiod`;
      this.platform.mqttHost.sendMessage(teleperiod, this.platform.teleperiod.toString());
    }
  }

  statusUpdate(topic: string, message: Buffer) {
    debug('statusUpdate for "%s" on topic "%s" ->', this.service?.displayName, topic, message.toString());

    this.accessory.context.timeout = this.platform.autoCleanup(this.accessory);

    try {
      let value = this.parseValue(this.accessory.context.device[this.uniq_id].val_tpl, message.toString());

      // Sensor value tweaks or adjustments needed for homekit

      switch (this.device_class) {
        case 'temperature':
          if (this.accessory.context.device[this.uniq_id].unit_of_meas.toUpperCase() === 'F') {
            value = String(Math.round((Number(value) - 32) * 5 / 9 * 10) / 10);
          }
          break;
        case 'illuminance':
          // normalize LX in the range homebridge expects
          value = String(Number(value) < 0.0001 ? 0.0001 : (Number(value) > 100000 ? 100000 : value));
          break;
        case 'co2':
          if (Number(value) > 1200) {
            this.service?.setCharacteristic(this.platform.Characteristic.CarbonDioxideDetected,
              this.platform.Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL);
          } else {
            this.service?.setCharacteristic(this.platform.Characteristic.CarbonDioxideDetected,
              this.platform.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL);
          }
          break;
      }


      if (this.characteristic?.value !== value && this.delta(String(this.characteristic?.value), String(value))) {
        this.platform.log.info('Updating \'%s:%s\' to %s', this.service?.displayName, this.characteristic?.displayName ?? '', value);
      } else {
        this.platform.log.debug('Updating \'%s:%s\' to %s', this.service?.displayName, this.characteristic?.displayName ?? '', value);
      }


      this.characteristic?.updateValue(value);
    } catch (err: unknown) {
      this.platform.log.error('ERROR: Message Parse Error', topic, message.toString());
      this.platform.log.debug(String((err && (err as Error).message ? (err as Error).message : err)));
    }
  }

  /**
   * Handle "LWT" Last Will and Testament messages from Tasmota
   * These are sent when the device is no longer available from the MQTT server.
   */

  availabilityUpdate(topic: string, message: Buffer) {
    // debug("availabilityUpdate", this, topic, message.toString());
    this.platform.log.info('Marking accessory \'%s\' to %s', this.service?.displayName, message.toString());

    if (message.toString() === this.accessory.context.device[this.uniq_id].pl_not_avail) {
      const availability: Nullable<CharacteristicValue> | Error = new Error(`${this.accessory.displayName} ${message.toString()}`);
      this.characteristic?.updateValue(availability);
    } else {
      // debug("availabilityUpdate", this.characteristic);
      this.characteristic?.updateValue(this.characteristic?.value);
    }
  }

  // Utility functions for status update

  delta(value1: Nullable<CharacteristicValue> | undefined, value2: Nullable<CharacteristicValue> | undefined) {
    // debug("delta", (parseInt(value1) !== parseInt(value2)));
    return (Number.parseInt(String(value1)) !== Number.parseInt(String(value2)));
  }

  parseValue(valueTemplate: string, value: string): string {
    try {
      if (valueTemplate) {
        // debug('nunjucksEnvironment', this, this.nunjucksEnvironment);
        const template = nunjucks.compile(valueTemplate, this.nunjucksEnvironment);
        // debug('nunjucksEnvironment', template, this.nunjucksEnvironment, value);
        const result: string = template.render({ value_json: JSON.parse(value) });
        // debug('nunjucksEnvironment-result', valueTemplate, value, result);
        if (result) {
          return result;
        } else {
          return '';
        }
      } else {
        return value;
      }
    } catch (err: unknown) {
      //      this.platform.log.error('ERROR: Template Parsing error', err.message);
      //      debug('ERROR: Template Parsing error', valueTemplate, value);
      //      return (err);
    }
    return '';
  }
}



export function isTrue(value: string | boolean | number): boolean {
  if (typeof (value) === 'string') {
    value = value.trim().toLowerCase();
  }
  switch (value) {
    case true:
    case 'true':
    case 1:
    case '1':
    case 'on':
    case 'yes':
      return true;
    default:
      return false;
  }
}
