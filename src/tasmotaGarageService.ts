import { PlatformAccessory, CharacteristicValue, CharacteristicSetCallback } from 'homebridge';
import { TasmotaService, isTrue } from './TasmotaService';
import { tasmotaPlatform } from './platform';

import createDebug from 'debug';
const debug = createDebug('Tasmota:garage');

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */

export class tasmotaGarageService extends TasmotaService {
  private doorStatusTopic: string;

  constructor(
    public readonly platform: tasmotaPlatform,
    public readonly accessory: PlatformAccessory,
    protected readonly uniq_id: string,
  ) {
    super(platform, accessory, uniq_id);

    this.service = this.accessory.getService(this.uuid) || this.accessory.addService(this.platform.Service.GarageDoorOpener,
      accessory.context.device[this.uniq_id].name, this.uuid);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    if (!this.service.displayName) {
      this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);
    }

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    this.characteristic = this.service.getCharacteristic(this.platform.Characteristic.CurrentDoorState);

    this.enableFakegato();

    // register handlers for the On/Off Characteristic

    if (this.service.getCharacteristic(this.platform.Characteristic.TargetDoorState).listenerCount('set') < 1) {
      this.service.getCharacteristic(this.platform.Characteristic.TargetDoorState)
        .on('set', this.setDoorState.bind(this));                // SET - bind to the `setOn` method below
      // .on('get', this.getOn.bind(this));               // GET - bind to the `getOn` method below
    }
    this.enableStatus();

    this.doorStatusTopic = 'tasmota_5673B2/stat/DOOR';

    // this.statusSubscribe = { event: doorStatusTopic, callback: this.statusUpdate.bind(this) };
    this.accessory.context.mqttHost.on(this.doorStatusTopic, this.statusUpdate.bind(this));
    this.accessory.context.mqttHost.statusSubscribe(this.doorStatusTopic);
  }

  /**
    enableStatus() {
      this.refresh();
      if (this.characteristic) {
        if (this.accessory.context.device[this.uniq_id].stat_t) {
          this.platform.log.debug('Creating statusUpdate listener for %s %s', this.accessory.context.device[this.uniq_id].stat_t, this.accessory.context.device[this.uniq_id].name);
          this.statusSubscribe = { event: this.accessory.context.device[this.uniq_id].stat_t, callback: this.statusUpdate.bind(this) };
          this.accessory.context.mqttHost.on(this.accessory.context.device[this.uniq_id].stat_t, this.statusUpdate.bind(this));
          this.accessory.context.mqttHost.statusSubscribe(this.accessory.context.device[this.uniq_id].stat_t);
        }
        if (this.accessory.context.device[this.uniq_id].avty_t) {
          this.availabilitySubscribe = { event: this.accessory.context.device[this.uniq_id].avty_t, callback: this.availabilityUpdate.bind(this) };
          this.accessory.context.mqttHost.on(this.accessory.context.device[this.uniq_id].avty_t, this.availabilityUpdate.bind(this));
          this.availabilitySubscribe = this.accessory.context.mqttHost.availabilitySubscribe(this.accessory.context.device[this.uniq_id].avty_t);
        } else {
          this.platform.log.warn('Warning: Availability not supported for: %s', this.accessory.context.device[this.uniq_id].name);
        }
      }
    }

    */



  /**
   * Handle "STATE" messages from Tasmotastat_t:
   * These are sent when the device's state is changed, either via HomeKit, Local Control or Other control methods.
   */

  statusUpdate(topic, message) {
    debug('MQTT', topic, message.toString());

    try {
      this.accessory.context.timeout = this.platform.autoCleanup(this.accessory);
      let value = message.toString();

      if (topic === this.doorStatusTopic) {
        switch (value) {
          case 'CLOSED':
            value = this.platform.Characteristic.CurrentDoorState.CLOSED;
            break;
          case 'OPEN':
            value = this.platform.Characteristic.CurrentDoorState.OPEN;
            break;
          case 'CLOSING':
            value = this.platform.Characteristic.CurrentDoorState.CLOSING;
            break;
          case 'OPENING':
            value = this.platform.Characteristic.CurrentDoorState.OPENING;
            break;
          default:
            this.platform.log.error('Unhandled Garage Door Status', value);
        }

      } else {

        if (this.accessory.context.device[this.uniq_id].val_tpl) {
          value = this.parseValue(this.accessory.context.device[this.uniq_id].val_tpl, value);
        }

        value = (value === this.accessory.context.device[this.uniq_id].pl_on ? 1 : 0);
      }

      if (this.characteristic.value !== value) {
        this.platform.log.info('Updating \'%s:%s\' to %s', this.service.displayName, this.characteristic.displayName, value);

      } else {

        this.platform.log.debug('Updating \'%s\' to %s', this.service.displayName, value);
      }

      this.characteristic.updateValue(value);

      if (topic === this.doorStatusTopic) {
        this.service.getCharacteristic(this.platform.Characteristic.TargetDoorState).updateValue(value % 2);
      }

    } catch (err) {
      debug('ERROR:', err.message);
      this.platform.log.error('ERROR: message parsing error', this.service.displayName, topic, message.toString());
    }
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  setDoorState(value: CharacteristicValue, callback: CharacteristicSetCallback) {

    try {
      if (this.service.getCharacteristic(this.platform.Characteristic.TargetDoorState).value != value) {
        this.platform.log.info('%s Pushing Garage Door Button ->', this.service.displayName, value);

        this.accessory.context.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].cmd_t,
          this.accessory.context.device[this.uniq_id].pl_on);
      } else {
        this.platform.log.error('%s Not Pushing Garage Door Button ->', this.service.displayName, value);
      }

    } catch (err) {
      this.platform.log.error('ERROR:', err.message);
    }
    // you must call the callback function
    callback(null);
  }

}

/*

Tasmota:platform Discovered -> homeassistant/switch/FB6A07_RL_1/config Garage Door {
  name: 'Garage Door',
  stat_t: 'tele/tasmota_FB6A07/STATE',
  avty_t: 'tele/tasmota_FB6A07/LWT',
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  cmd_t: 'cmnd/tasmota_FB6A07/POWER',
  val_tpl: '{{value_json.POWER}}',
  pl_off: 'OFF',
  pl_on: 'ON',
  uniq_id: 'FB6A07_RL_1',
  dev: { ids: [ 'FB6A07' ] },
  tasmotaType: 'garageDoor'
}
*/
