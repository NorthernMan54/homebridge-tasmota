import { Service, PlatformAccessory, Characteristic, CharacteristicValue } from 'homebridge';

import { tasmotaPlatform } from './platform';

import nunjucks from 'nunjucks';

import createDebug from 'debug';
const debug = createDebug('Tasmota:binarySensor');

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */

interface Subscription {
  event: string, callback: any
}

export class tasmotaBinarySensorService {
  public service: Service;
  private characteristic: Characteristic;
  private device_class: string;
  public statusSubscribe: Subscription;
  public availabilitySubscribe: Subscription;
  private CustomCharacteristic;
  public fakegato: string;

  constructor(
    private readonly platform: tasmotaPlatform,
    public readonly accessory: PlatformAccessory,
    private readonly uniq_id: string,
  ) {
    /* eslint-disable */
    this.CustomCharacteristic = require('./lib/CustomCharacteristics')(platform.Service, platform.Characteristic);
    const uuid = this.platform.api.hap.uuid.generate(accessory.context.device[this.uniq_id].uniq_id);
    this.device_class = accessory.context.device[this.uniq_id].dev_cla;
    switch (accessory.context.device[this.uniq_id].dev_cla) {
      case 'doorbell':
        this.platform.log.debug('Creating %s binary sensor %s', accessory.context.device[this.uniq_id].dev_cla, accessory.context.device[this.uniq_id].name);

        this.service = this.accessory.getService(uuid) || this.accessory.addService(this.platform.Service.ContactSensor, accessory.context.device[this.uniq_id].name, uuid);

        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);
        this.characteristic = this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState);
        if (this.platform.config.history) {
          this.fakegato = 'custom';
          this.service.addOptionalCharacteristic(this.CustomCharacteristic.TimesOpened);
          this.service.addOptionalCharacteristic(this.CustomCharacteristic.LastActivation);
        }
        break;
      case 'motion':
        this.platform.log.debug('Creating %s binary sensor %s', accessory.context.device[this.uniq_id].dev_cla, accessory.context.device[this.uniq_id].name);

        this.service = this.accessory.getService(uuid) || this.accessory.addService(this.platform.Service.MotionSensor, accessory.context.device[this.uniq_id].name, uuid);

        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);
        this.characteristic = this.service.getCharacteristic(this.platform.Characteristic.MotionDetected);
        if (this.platform.config.history) {
          this.fakegato = 'custom';
          this.service.addOptionalCharacteristic(this.CustomCharacteristic.LastActivation);
          debug('adding', this.fakegato );
        }
        break;
      default:
        this.platform.log.error('Warning: Unhandled Tasmota binary sensor type', accessory.context.device[this.uniq_id].dev_cla);
    }

    // setup event listeners for services / characteristics

    if (this.characteristic) {
      this.platform.log.debug('Creating statusUpdate listener for %s %s', accessory.context.device[this.uniq_id].stat_t, accessory.context.device[this.uniq_id].name);
      // platform.statusEvent[this.uniq_id] = accessory.context.mqttHost.on(accessory.context.device[this.uniq_id].stat_t, this.statusUpdate.bind(this));
      this.statusSubscribe = { event: accessory.context.device[this.uniq_id].stat_t, callback: this.statusUpdate.bind(this) };
      accessory.context.mqttHost.on(accessory.context.device[this.uniq_id].stat_t, this.statusUpdate.bind(this));
      accessory.context.mqttHost.statusSubscribe(accessory.context.device[this.uniq_id].stat_t);

      this.availabilitySubscribe = { event: accessory.context.device[this.uniq_id].avty_t, callback: this.availabilityUpdate.bind(this) };
      accessory.context.mqttHost.on(accessory.context.device[this.uniq_id].avty_t, this.availabilityUpdate.bind(this));
      accessory.context.mqttHost.availabilitySubscribe(accessory.context.device[this.uniq_id].avty_t);
    }

    if (this.platform.config.history && this.fakegato && !this.accessory.context.fakegatoService ?.addEntry) {
      this.accessory.context.fakegatoService = new this.platform.FakeGatoHistoryService(this.fakegato, this.accessory, {
        storage: 'fs',
        minutes: this.platform.config.historyInterval ?? 10,
        log: this.platform.log,
      });
      this.platform.log.debug('Creating fakegato service for %s %s', accessory.context.device[this.uniq_id].stat_t, accessory.context.device[this.uniq_id].name, this.accessory.context.device[this.uniq_id].uniq_id);
    } else {
      debug('fakegatoService exists', this.accessory.context.device[this.uniq_id].uniq_id);
    }

    nunjucks.installJinjaCompat();
    nunjucks.configure({
      autoescape: true,
    });
    this.refresh();
  }

  refresh() {
    // Get current status for accessory/service on startup
    const teleperiod = this.accessory.context.device[this.uniq_id].stat_t.substr(0, this.accessory.context.device[this.uniq_id].stat_t.lastIndexOf('/') + 1).replace('tele', 'cmnd') + 'teleperiod';
    this.accessory.context.mqttHost.sendMessage(teleperiod, '300');
  }

  statusUpdate(topic, message) {
    debug('MQTT', topic, message.toString());

    this.accessory.context.timeout = this.platform.autoCleanup(this.accessory);
    const interim = {
      value_json: JSON.parse(message.toString()),
    };

    debug('statusUpdate: ', this.characteristic.value, (nunjucks.renderString(this.accessory.context.device[this.uniq_id].val_tpl, interim) === this.accessory.context.device[this.uniq_id].pl_on ? 1 : 0));

    if (this.characteristic.value !== (nunjucks.renderString(this.accessory.context.device[this.uniq_id].val_tpl, interim) === this.accessory.context.device[this.uniq_id].pl_on ? 1 : 0)) {

      this.platform.log.info('Updating \'%s\' to %s', this.service.displayName, nunjucks.renderString(this.accessory.context.device[this.uniq_id].val_tpl, interim));
      let timesOpened;
      switch (this.device_class) {
        case 'doorbell':
          timesOpened = timesOpened + this.service.getCharacteristic(this.CustomCharacteristic.TimesOpened).value;
          this.service.updateCharacteristic(this.CustomCharacteristic.TimesOpened, timesOpened);
        // fall thru
          /* eslint-disable */
        case 'motion':
          const now = Math.round(new Date().valueOf() / 1000);
          const lastActivation = now - this.accessory.context.fakegatoService.getInitialTime();
          this.service.updateCharacteristic(this.CustomCharacteristic.LastActivation, lastActivation);
          break;
      }

    } else {

      // this.platform.log.debug('Updating \'%s\' to %s', this.service.displayName, nunjucks.renderString(this.accessory.context.device[this.uniq_id].val_tpl, interim));
    }

    this.characteristic.updateValue((nunjucks.renderString(this.accessory.context.device[this.uniq_id].val_tpl, interim) === this.accessory.context.device[this.uniq_id].pl_on ? 1 : 0));

    if (this.platform.config.history && this.fakegato && this.accessory.context.fakegatoService ?.addEntry) {
      debug('Updating fakegato', this.service.displayName);
      this.accessory.context.fakegatoService.appendData({
        [this.accessory.context.fakegatoService.uuid.toShortFormUUID(this.characteristic.UUID)]: (this.characteristic.value ? 1 : 0),
      });
    } else {
      debug('Not updating fakegato', this.service.displayName);
    }
  }

  /**
   * Handle "LWT" Last Will and Testament messages from Tasmota
   * These are sent when the device is no longer available from the MQTT server.
   */

  availabilityUpdate(topic, message) {
    // debug("availabilityUpdate", this, topic, message.toString());
    this.platform.log.info('Marking sensor accessory \'%s\' to %s', this.service.displayName, message);

    const availability = (message.toString() === this.accessory.context.device[this.uniq_id].pl_not_avail ? new Error(this.accessory.displayName + ' ' + message.toString()) : 0);

    this.characteristic.updateValue(availability);
  }

  // Utility functions for status update

  delta(value1, value2) {
    // debug("delta", (parseInt(value1) !== parseInt(value2)));
    return (parseInt(value1) !== parseInt(value2));
  }


  parseValue(valueTemplate, value) {
    const result = nunjucks.renderString(valueTemplate, value);
    if (result) {
      return parseFloat(result);
    } else {
      this.platform.log.error('ERROR: Sensor %s missing data', this.service.displayName);
      return (new Error('Missing sensor value'));
    }
  }
}
