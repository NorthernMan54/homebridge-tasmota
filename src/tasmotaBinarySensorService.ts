import { Service, PlatformAccessory, Characteristic, CharacteristicValue } from 'homebridge';
import { TasmotaService } from './TasmotaService';
import { tasmotaPlatform } from './platform';

import createDebug from 'debug';
const debug = createDebug('Tasmota:binarySensor');

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */

export class tasmotaBinarySensorService extends TasmotaService {

  constructor(
    public readonly platform: tasmotaPlatform,
    public readonly accessory: PlatformAccessory,
    protected readonly uniq_id: string,
  ) {

    super(platform, accessory, uniq_id);
    switch (accessory.context.device[this.uniq_id].dev_cla) {
      case 'doorbell':
        this.platform.log.debug('Creating %s binary sensor %s', accessory.context.device[this.uniq_id].dev_cla, accessory.context.device[this.uniq_id].name);

        this.service = this.accessory.getService(this.uuid) || this.accessory.addService(this.platform.Service.ContactSensor, accessory.context.device[this.uniq_id].name, this.uuid);

        if (!this.service.displayName) {
          this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);
        }
        this.characteristic = this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState);
        if (this.platform.config.history) {
          this.fakegato = 'contact';
          this.service.addOptionalCharacteristic(this.CustomCharacteristic.TimesOpened);
          this.service.addOptionalCharacteristic(this.CustomCharacteristic.LastActivation);
        }
        break;
      case 'motion':
        this.platform.log.debug('Creating %s binary sensor %s', accessory.context.device[this.uniq_id].dev_cla, accessory.context.device[this.uniq_id].name);

        this.service = this.accessory.getService(this.uuid) || this.accessory.addService(this.platform.Service.MotionSensor, accessory.context.device[this.uniq_id].name, this.uuid);

        if (!this.service.displayName) {
          this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);
        }
        this.characteristic = this.service.getCharacteristic(this.platform.Characteristic.MotionDetected);
        if (this.platform.config.history) {
          this.fakegato = 'motion';
          this.service.addOptionalCharacteristic(this.CustomCharacteristic.LastActivation);
          debug('adding', this.fakegato);
        }
        break;
      case 'moisture':
        this.platform.log.debug('Creating %s binary sensor %s', accessory.context.device[this.uniq_id].dev_cla, accessory.context.device[this.uniq_id].name);

        this.service = this.accessory.getService(this.uuid) || this.accessory.addService(this.platform.Service.LeakSensor, accessory.context.device[this.uniq_id].name, this.uuid);

        if (!this.service.displayName) {
          this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);
        }
        this.characteristic = this.service.getCharacteristic(this.platform.Characteristic.LeakDetected);
        if (this.platform.config.history) {
          // this.fakegato = 'motion';
          this.service.addOptionalCharacteristic(this.CustomCharacteristic.LastActivation);
          // debug('adding', this.fakegato);
        }
        break;
      default:
        this.platform.log.error('Warning: Unhandled Tasmota binary sensor type', accessory.context.device[this.uniq_id].dev_cla);
    }

    this.enableFakegato();

    this.enableStatus();

  }

  statusUpdate(topic, message) {
    debug('MQTT', topic, message.toString());

    this.accessory.context.timeout = this.platform.autoCleanup(this.accessory);

    try {
      let value = this.parseValue(this.accessory.context.device[this.uniq_id].val_tpl, {
        value_json: JSON.parse(message.toString()),
      });

      // Adjust value to format expected by sensor type

      switch (this.device_class) {
        case 'doorbell':
          break;
        case 'moisture':
          // 1 / 0
          debug('moisture', this.accessory.context.device[this.uniq_id].pl_on, value);
          value = (this.accessory.context.device[this.uniq_id].pl_on === value ? this.platform.Characteristic.LeakDetected.LEAK_DETECTED : this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED);
          break;
        case 'motion':
          // boolean
          value = (this.accessory.context.device[this.uniq_id].pl_on === value ? true : false);
          break;
      }

      if (this.characteristic.value !== value) {

        this.platform.log.info('Updating \'%s\' binary sensor to %s', this.service.displayName, value);
        let timesOpened;
        switch (this.device_class) {
          case 'doorbell':
            timesOpened = timesOpened + this.service.getCharacteristic(this.CustomCharacteristic.TimesOpened).value;
            this.service.updateCharacteristic(this.CustomCharacteristic.TimesOpened, timesOpened);
          // fall thru
          /* eslint-disable */
          case 'moisture':
          case 'motion':
            if (this.platform.config.history) {
              const now = Math.round(new Date().valueOf() / 1000);
              const lastActivation = now - this.accessory.context.fakegatoService.getInitialTime();
              this.service.updateCharacteristic(this.CustomCharacteristic.LastActivation, lastActivation);
            }
            break;
        }

      } else {
        this.platform.log.debug('Updating \'%s\' binary sensor to %s', this.service.displayName, value);
      }

      this.characteristic.updateValue(value);

      if (this.platform.config.history && this.fakegato && this.accessory.context.fakegatoService ?.addEntry) {
        debug('Updating fakegato', this.service.displayName, {
          [this.fakegato]: (this.characteristic.value ? 1 : 0),
        });
        this.accessory.context.fakegatoService.appendData({
          [this.fakegato]: (this.characteristic.value ? 1 : 0),
        });
      } else {
        // debug('Not updating fakegato', this.service.displayName);
      }
    } catch (err) {
      this.platform.log.error('ERROR: Message Parse Error', topic, message.toString())
    }
  }
}
