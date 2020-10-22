import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, Characteristic } from 'homebridge';

import { tasmotaPlatform } from './platform';
import nunjucks from 'nunjucks';

import createDebug from 'debug';
const debug = createDebug('Tasmota:fan');

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */

interface Subscription {
  event: string, callback: any
}

export class tasmotaFanService {
  public service: Service;
  private characteristic: Characteristic;
  public statusSubscribe: Subscription;
  public availabilitySubscribe: Subscription;
  public fakegato: string;

  constructor(
    private readonly platform: tasmotaPlatform,
    public readonly accessory: PlatformAccessory,
    private readonly uniq_id: string,
  ) {

    // get the Fan service if it exists, otherwise create a new Fan service
    // you can create multiple services for each accessory

    const uuid = this.platform.api.hap.uuid.generate(accessory.context.device[this.uniq_id].uniq_id);
    this.service = this.accessory.getService(uuid) || this.accessory.addService(this.platform.Service.Fan, accessory.context.device[this.uniq_id].name, uuid);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);

    if (this.service.getCharacteristic(this.platform.Characteristic.On).listenerCount('set') < 1) {
      this.service.getCharacteristic(this.platform.Characteristic.On)
        .on('set', this.setOn.bind(this));                // SET - bind to the `setOn` method below
      // .on('get', this.getOn.bind(this));               // GET - bind to the `getOn` method below

      debug('Creating statusUpdate listener for', accessory.context.device[this.uniq_id].stat_t);
      this.statusSubscribe = { event: accessory.context.device[this.uniq_id].stat_t, callback: this.statusUpdate.bind(this) };
      accessory.context.mqttHost.on(accessory.context.device[this.uniq_id].stat_t, this.statusUpdate.bind(this));
      accessory.context.mqttHost.statusSubscribe(accessory.context.device[this.uniq_id].stat_t);

      this.availabilitySubscribe = { event: accessory.context.device[this.uniq_id].avty_t, callback: this.availabilityUpdate.bind(this) };
      accessory.context.mqttHost.on(accessory.context.device[this.uniq_id].avty_t, this.availabilityUpdate.bind(this));
      accessory.context.mqttHost.availabilitySubscribe(accessory.context.device[this.uniq_id].avty_t);
    }

    // Does the Fan include a RotationSpeed characteristic

    if (accessory.context.device[this.uniq_id].bri_cmd_t) {
      (this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed) || this.service.addCharacteristic(this.platform.Characteristic.RotationSpeed))
        .on('set', this.setRotationSpeed.bind(this));
    }

    nunjucks.installJinjaCompat();
    nunjucks.configure({
      autoescape: true,
    });

    this.refresh();
  }

  refresh() {
    // Get current status for accessory/service on startup
    const teleperiod = this.accessory.context.device[this.uniq_id].cmd_t.substr(0, this.accessory.context.device[this.uniq_id].cmd_t.lastIndexOf('/') + 1) + 'teleperiod';
    this.accessory.context.mqttHost.sendMessage(teleperiod, this.platform.teleperiod.toString());
  }


  /**
   * Handle "STATE" messages from Tasmotastat_t:
   * These are sent when the device's state is changed, either via HomeKit, Local Control or Other control methods.
   */

  statusUpdate(topic, message) {
    debug('statusUpdate', topic, message.toString());

    this.accessory.context.timeout = this.platform.autoCleanup(this.accessory);

    const interim = {
      value_json: JSON.parse(message.toString()),
    };

    // Update On / Off status

    if (this.service.getCharacteristic(this.platform.Characteristic.On).value !== (nunjucks.renderString(this.accessory.context.device[this.uniq_id].val_tpl, interim) === this.accessory.context.device[this.uniq_id].pl_on ? true : false)) {

      // Use debug logging for no change updates, and info when a change occurred

      this.platform.log.info('Updating \'%s\' to %s', this.accessory.displayName, nunjucks.renderString(this.accessory.context.device[this.uniq_id].val_tpl, interim));

    } else {
      this.platform.log.debug('Updating \'%s\' to %s', this.accessory.displayName, nunjucks.renderString(this.accessory.context.device[this.uniq_id].val_tpl, interim));
    }
    this.service.getCharacteristic(this.platform.Characteristic.On).updateValue((nunjucks.renderString(this.accessory.context.device[this.uniq_id].val_tpl, interim) === this.accessory.context.device[this.uniq_id].pl_on ? true : false));

    // Update RotationSpeed if supported

    if (this.accessory.context.device[this.uniq_id].bri_val_tpl) {

      // Use debug logging for no change updates, and info when a change occurred

      if (this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed).value != nunjucks.renderString(this.accessory.context.device[this.uniq_id].bri_val_tpl, interim)) {
        this.platform.log.info('Updating \'%s\' RotationSpeed to %s', this.accessory.displayName, nunjucks.renderString(this.accessory.context.device[this.uniq_id].bri_val_tpl, interim));
      } else {
        this.platform.log.debug('Updating \'%s\' RotationSpeed to %s', this.accessory.displayName, nunjucks.renderString(this.accessory.context.device[this.uniq_id].bri_val_tpl, interim));
      }

      this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed).updateValue(nunjucks.renderString(this.accessory.context.device[this.uniq_id].bri_val_tpl, interim));
    }

  }

  /**
   * Handle "LWT" Last Will and Testament messages from Tasmota
   * These are sent when the device is no longer available from the MQTT server.
   */

  availabilityUpdate(topic, message) {
    this.platform.log.info('Marking Fan accessory \'%s\' to %s', this.service.displayName, message);
    const availability = (message.toString() === this.accessory.context.device[this.uniq_id].pl_not_avail ? new Error(this.accessory.displayName + ' ' + message.toString()) : 0);

    this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(availability);
  }

  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.info('%s Set Characteristic On ->', this.accessory.displayName, value);

    this.accessory.context.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].cmd_t, (value ? this.accessory.context.device[this.uniq_id].pl_on : this.accessory.context.device[this.uniq_id].pl_off));
    callback(null);
  }

  setRotationSpeed(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.info('%s Set Characteristic RotationSpeed ->', this.accessory.displayName, value);
    this.accessory.context.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].bri_cmd_t, value.toString());
    callback(null);
  }
}
