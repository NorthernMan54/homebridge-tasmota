import { Service, PlatformAccessory, Characteristic, CharacteristicValue, Nullable } from 'homebridge';
import { tasmotaPlatform } from './platform';
import nunjucks from 'nunjucks';

import createDebug from 'debug';

const debug = createDebug('Tasmota:Service');

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */

interface Subscription {
  event: string, callback: any
}

export class TasmotaService {
  public service: Service;
  protected characteristic: Characteristic;
  protected device_class: string;
  public statusSubscribe: Subscription;
  public availabilitySubscribe: Subscription;
  protected CustomCharacteristic;
  public fakegato: string;
  public nunjucksEnvironment;
  protected uuid: string;

  constructor(
    public readonly platform: tasmotaPlatform,
    public readonly accessory: PlatformAccessory,
    protected readonly uniq_id: string,
  ) {
    /* eslint-disable */
    this.CustomCharacteristic = require('./lib/CustomCharacteristics')(platform.Service, platform.Characteristic);
    this.uuid = this.platform.api.hap.uuid.generate(this.accessory.context.device[this.uniq_id].uniq_id);
    this.device_class = accessory.context.device[this.uniq_id].dev_cla;

    this.nunjucksEnvironment = new nunjucks.Environment();

    // Home Assistant device template filters

    this.nunjucksEnvironment.addFilter('is_defined', function(val, cb) {
      // console.log('is_defined', val);
      if (val) {
        cb(null, val);
      } else {
        cb(new Error('missing key'), val);
      }
    }, true);

    this.nunjucksEnvironment.addGlobal('float', float);

    nunjucks.installJinjaCompat();
    nunjucks.configure({
      autoescape: true,
    });

  }

  enableFakegato() {
    // Enable historical logging

    if (this.platform.config.history && this.fakegato && !this.accessory.context.fakegatoService ?.addEntry) {
      this.accessory.context.fakegatoService = new this.platform.FakeGatoHistoryService('custom', this.accessory, {
        storage: 'fs',
        minutes: this.platform.config.historyInterval ?? 10,
        log: this.platform.log,
      });
      this.platform.log.debug('Creating fakegato service for %s %s', this.accessory.context.device[this.uniq_id].stat_t, this.accessory.context.device[this.uniq_id].name, this.accessory.context.device[this.uniq_id].uniq_id);
    } else {
      debug('fakegatoService exists', this.accessory.context.device[this.uniq_id].name);
    }
  }

  enableStatus() {
    this.refresh();
    if (this.characteristic) {
      this.platform.log.debug('Creating statusUpdate listener for %s %s', this.accessory.context.device[this.uniq_id].stat_t, this.accessory.context.device[this.uniq_id].name);
      this.statusSubscribe = { event: this.accessory.context.device[this.uniq_id].stat_t, callback: this.statusUpdate.bind(this) };
      this.accessory.context.mqttHost.on(this.accessory.context.device[this.uniq_id].stat_t, this.statusUpdate.bind(this));
      this.accessory.context.mqttHost.statusSubscribe(this.accessory.context.device[this.uniq_id].stat_t);
      if (this.accessory.context.device[this.uniq_id].avty_t) {
        this.availabilitySubscribe = { event: this.accessory.context.device[this.uniq_id].avty_t, callback: this.availabilityUpdate.bind(this) };
        this.accessory.context.mqttHost.on(this.accessory.context.device[this.uniq_id].avty_t, this.availabilityUpdate.bind(this));
        this.availabilitySubscribe = this.accessory.context.mqttHost.availabilitySubscribe(this.accessory.context.device[this.uniq_id].avty_t);
      } else {
        this.platform.log.warn('Warning: Availability not supported for: %s', this.accessory.context.device[this.uniq_id].name);
      }
    }
  }

  deviceClassToHKCharacteristic(device_class: string) {
    switch (device_class) {
      case '_energy_current': // Amps
        return (this.CustomCharacteristic.ElectricCurrent);
      case '_energy_voltage': // Voltage
        return (this.CustomCharacteristic.Voltage);
      case '_energy_power': // Watts
        return (this.CustomCharacteristic.CurrentConsumption);
      case '_energy_total': // Total Kilowatts
        return (this.CustomCharacteristic.TotalConsumption);
        break;
    }
  }

  refresh() {
    // Get current status for accessory/service on startup
    const teleperiod = this.accessory.context.device[this.uniq_id].stat_t.substr(0, this.accessory.context.device[this.uniq_id].stat_t.lastIndexOf('/') + 1).replace('tele', 'cmnd') + 'teleperiod';
    this.accessory.context.mqttHost.sendMessage(teleperiod, this.platform.teleperiod.toString());
  }

  statusUpdate(topic, message) {
    debug('statusUpdate', this.service.displayName, topic, message.toString());

    this.accessory.context.timeout = this.platform.autoCleanup(this.accessory);

    try {
      let value = this.parseValue(this.accessory.context.device[this.uniq_id].val_tpl, message.toString());

      // Sensor value tweaks or adjustments needed for homekit

      switch (this.device_class) {
        case 'temperature':
          if (this.accessory.context.device[this.uniq_id].unit_of_meas.toUpperCase() === 'F') {
            value = Math.round((value - 32) * 5 / 9 * 10) / 10;
          }
          break;
        case 'illuminance':
          // normalize LX in the range homebridge expects
          value = (value < 0.0001 ? 0.0001 : (value > 100000 ? 100000 : value));
          break;
        case 'co2':
          if (value > 1200) {
            this.service.setCharacteristic(this.platform.Characteristic.CarbonDioxideDetected, this.platform.Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL);
          } else {
            this.service.setCharacteristic(this.platform.Characteristic.CarbonDioxideDetected, this.platform.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL);
          }
          break;
      }

      if (value instanceof Error) {
        // Error has already been handled
      } else {
        if (this.characteristic.value != value && this.delta(this.characteristic.value, value)) {
          this.platform.log.info('Updating \'%s:%s\' to %s', this.service.displayName, this.characteristic.displayName ?? '', value);
        } else {
          this.platform.log.debug('Updating \'%s:%s\' to %s', this.service.displayName, this.characteristic.displayName ?? '', value);
        }
      }

      this.characteristic.updateValue(value);

    } catch (err) {
      this.platform.log.error('ERROR: Message Parse Error', topic, message.toString())
    }
  }


  /**
   * Handle "LWT" Last Will and Testament messages from Tasmota
   * These are sent when the device is no longer available from the MQTT server.
   */

  availabilityUpdate(topic, message) {
    // debug("availabilityUpdate", this, topic, message.toString());
    this.platform.log.info('Marking accessory \'%s\' to %s', this.service.displayName, message);

    const availability: Nullable<CharacteristicValue> | Error = (message.toString() === this.accessory.context.device[this.uniq_id].pl_not_avail ? new Error(this.accessory.displayName + ' ' + message.toString()) : 0);

    this.characteristic.updateValue(availability);
  }

  // Utility functions for status update

  delta(value1, value2) {
    // debug("delta", (parseInt(value1) !== parseInt(value2)));
    return (parseInt(value1) !== parseInt(value2));
  }


  parseValue(valueTemplate, value) {
    try {
      if (valueTemplate) {
        // debug('nunjucksEnvironment', this, this.nunjucksEnvironment);
        var template = nunjucks.compile(valueTemplate, this.nunjucksEnvironment);
        const result = template.render({ value_json: JSON.parse(value), });

        if (result) {
          return result;
        } else {
          this.platform.log.error('ERROR: Template %s missing data', this.service.displayName, valueTemplate, value);
          return (new Error('Missing sensor value'));
        }
      } else {
        return value;
      }
    }
    catch (err) {
      this.platform.log.error('ERROR: Template Parsing error', err.message);
      debug('ERROR: Template Parsing error', valueTemplate, value);
      return (err);
    }
  }
}

function float(val) {
  return (parseFloat(val));
}

export function isTrue(value: string | boolean | number): boolean {
  if (typeof (value) === 'string') {
    value = value.trim().toLowerCase();
  }
  switch (value) {
    case true:
    case "true":
    case 1:
    case "1":
    case "on":
    case "yes":
      return true;
    default:
      return false;
  }
}
