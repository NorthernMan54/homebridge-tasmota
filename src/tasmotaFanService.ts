import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, Characteristic } from 'homebridge';
import { TasmotaService } from './TasmotaService';
import { tasmotaPlatform } from './platform';

import createDebug from 'debug';
const debug = createDebug('Tasmota:fan');

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */

export class tasmotaFanService extends TasmotaService {

  constructor(
    public readonly platform: tasmotaPlatform,
    public readonly accessory: PlatformAccessory,
    protected readonly uniq_id: string,
  ) {

    super(platform, accessory, uniq_id);

    this.service = this.accessory.getService(this.uuid) || this.accessory.addService(this.platform.Service.Fan, accessory.context.device[this.uniq_id].name, this.uuid);

    if (!this.service.displayName) {
      this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);
    }

    if (this.service.getCharacteristic(this.platform.Characteristic.On).listenerCount('set') < 1) {
      this.characteristic = this.service.getCharacteristic(this.platform.Characteristic.On)
        .on('set', this.setOn.bind(this));
      this.enableStatus();
    }

    // Does the Fan include a RotationSpeed characteristic

    if (accessory.context.device[this.uniq_id].bri_cmd_t) {
      (this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed) || this.service.addCharacteristic(this.platform.Characteristic.RotationSpeed))
        .on('set', this.setRotationSpeed.bind(this));
    }

  }


  /**
   * Handle "STATE" messages from Tasmotastat_t:
   * These are sent when the device's state is changed, either via HomeKit, Local Control or Other control methods.
   */

  statusUpdate(topic, message) {
    debug('statusUpdate', topic, message.toString());

    this.accessory.context.timeout = this.platform.autoCleanup(this.accessory);

    try {
      const value = this.parseValue(this.accessory.context.device[this.uniq_id].val_tpl, {
        value_json: JSON.parse(message.toString()),
      });

      if (this.service.getCharacteristic(this.platform.Characteristic.On).value !== (value === this.accessory.context.device[this.uniq_id].pl_on ? true : false)) {

        // Use debug logging for no change updates, and info when a change occurred

        this.platform.log.info('Updating \'%s\' to %s', this.accessory.displayName, value);

      } else {
        this.platform.log.debug('Updating \'%s\' to %s', this.accessory.displayName, value);
      }
      this.service.getCharacteristic(this.platform.Characteristic.On).updateValue((value === this.accessory.context.device[this.uniq_id].pl_on ? true : false));

      // Update RotationSpeed if supported

      if (this.accessory.context.device[this.uniq_id].bri_val_tpl) {

        // Use debug logging for no change updates, and info when a change occurred
        const bri_val = this.parseValue(this.accessory.context.device[this.uniq_id].val_tpl, {
          value_json: JSON.parse(message.toString()),
        });

        if (this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed).value != bri_val) {
          this.platform.log.info('Updating \'%s\' RotationSpeed to %s', this.accessory.displayName, bri_val);
        } else {
          this.platform.log.debug('Updating \'%s\' RotationSpeed to %s', this.accessory.displayName, bri_val);
        }
        this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed).updateValue(bri_val);
      }
    } catch (err) {
      this.platform.log.error('ERROR: Message Parse Error', topic, message.toString());
    }
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
