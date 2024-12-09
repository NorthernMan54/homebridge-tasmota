import createDebug from 'debug';
import { CharacteristicSetCallback, CharacteristicValue, Nullable, PlatformAccessory } from 'homebridge';
import { TasmotaService } from './TasmotaService.js';
import { tasmotaPlatform } from './platform.js';


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

    this.service = this.accessory.getService(this.uuid) || this.accessory.addService(this.platform.Service.Fan,
      accessory.context.device[this.uniq_id].name, this.uuid);
    this.service?.setCharacteristic(this.platform.Characteristic.ConfiguredName, accessory.context.device[this.uniq_id].name);

    if (!this.service?.displayName) {
      this.service?.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);
    }

    if (this.service?.getCharacteristic(this.platform.Characteristic.On).listenerCount('set') < 1) {
      this.characteristic = this.service?.getCharacteristic(this.platform.Characteristic.On)
        .on('set', this.setOn.bind(this));
      this.enableStatus();
    }

    // Does the Fan include a RotationSpeed characteristic

    if (accessory.context.device[this.uniq_id].bri_cmd_t) {
      (this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
        || this.service.addCharacteristic(this.platform.Characteristic.RotationSpeed))
        .on('set', this.setRotationSpeed.bind(this));
    } else if (accessory.context.device[this.uniq_id].spds) {
      (this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
        || this.service.addCharacteristic(this.platform.Characteristic.RotationSpeed))
        .on('set', this.setRotationSpeedFixed.bind(this));
      //        .setProps({     // This causes an issue with validateUserInput in Characteristic and 33.3333 becomes 0
      //          minStep: 33.33333333333333,
      //        });
    }
  }

  /**
   * Handle "STATE" messages from Tasmotastat_t:
   * These are sent when the device's state is changed, either via HomeKit, Local Control or Other control methods.
   */

  statusUpdate(topic: string, message: Buffer) {
    debug('statusUpdate', topic, message.toString());

    this.accessory.context.timeout = this.platform.autoCleanup(this.accessory);

    try {
      let value = message.toString();

      if (this.accessory.context.device[this.uniq_id].val_tpl) {
        value = this.parseValue(this.accessory.context.device[this.uniq_id].val_tpl, message.toString());
      }

      if (this.service?.getCharacteristic(this.platform.Characteristic.On).value !== (value
        === this.accessory.context.device[this.uniq_id].pl_on)) {
        // Use debug logging for no change updates, and info when a change occurred

        this.platform.log.info('Updating \'%s\' to %s', this.service?.displayName, value);
      } else {
        this.platform.log.debug('Updating \'%s\' to %s', this.service?.displayName, value);
      }
      this.platform.log.debug('Updating \'%s\' to %s ? %s', this.service?.displayName, value, this.accessory.context.device[this.uniq_id].pl_on);
      this.platform.log.debug('Updating \'%s\' to %s ? %s', this.service?.displayName, value, (value
        === this.accessory.context.device[this.uniq_id].pl_on));
      this.service?.getCharacteristic(this.platform.Characteristic.On).updateValue((value
        === this.accessory.context.device[this.uniq_id].pl_on));

      // Update RotationSpeed if supported

      if (this.accessory.context.device[this.uniq_id].bri_val_tpl) {
        // Use debug logging for no change updates, and info when a change occurred
        const bri_val = this.parseValue(this.accessory.context.device[this.uniq_id].bri_val_tpl, message.toString());

        if (this.service?.getCharacteristic(this.platform.Characteristic.RotationSpeed).value !== bri_val) {
          this.platform.log.info('Updating \'%s\' RotationSpeed to %s', this.service?.displayName, bri_val);
        } else {
          this.platform.log.debug('Updating \'%s\' RotationSpeed to %s', this.service?.displayName, bri_val);
        }
        this.service?.getCharacteristic(this.platform.Characteristic.RotationSpeed).updateValue(bri_val as Nullable<CharacteristicValue>);
      }
    } catch (err: unknown) {
      this.platform.log.error('ERROR: Message Parse Error', topic, message.toString());
    }
  }

  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.info('%s Set Characteristic On ->', this.accessory.displayName, value);

    if (!this.accessory.context.device[this.uniq_id].spds) {
      // Not hampton bay fans with speeds rather than on
      this.platform.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].cmd_t, (value
        ? this.accessory.context.device[this.uniq_id].pl_on
        : this.accessory.context.device[this.uniq_id].pl_off));
    } else if (!value) {
      // Turning off
      this.platform.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].cmd_t, (value
        ? this.accessory.context.device[this.uniq_id].pl_on
        : this.accessory.context.device[this.uniq_id].pl_off));
    } else {
      // Turning on of Hampton bay RF Fans, they don't have a ON function but can restore previous speed
      this.setRotationSpeedFixed(this.service?.getCharacteristic(this.platform.Characteristic.RotationSpeed).value || 25, callback);
      return;
    }
    callback(null);
  }

  setRotationSpeed(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.info('%s Set Characteristic RotationSpeed ->', this.accessory.displayName, value);
    this.platform.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].bri_cmd_t, value.toString());
    callback(null);
  }

  setRotationSpeedFixed(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    // debug('config', this.accessory.displayName, this.accessory.context.device[this.uniq_id]);
    this.platform.log.info('%s Set Characteristic RotationSpeedFixed ->', this.accessory.displayName, value);
    if (Number(value) < 25) { // off
      this.platform.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].cmd_t, this.accessory.context.device[this.uniq_id].pl_off);
    } else if (Number(value) < 50) { // low
      // debug('low', this.accessory.displayName, this.accessory.context.device[this.uniq_id].pl_lo_spd);
      this.platform.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].cmd_t, this.accessory.context.device[this.uniq_id].pl_lo_spd);
    } else if (Number(value) < 75) { // medium
      // debug('medium', this.accessory.displayName, this.accessory.context.device[this.uniq_id].pl_med_spd);
      this.platform.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].cmd_t, this.accessory.context.device[this.uniq_id].pl_med_spd);
    } else { // high
      // debug('high', this.accessory.displayName, this.accessory.context.device[this.uniq_id].pl_hi_spd);
      this.platform.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].cmd_t, this.accessory.context.device[this.uniq_id].pl_hi_spd);
    }
    callback(null);
  }
}
