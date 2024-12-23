import createDebug from 'debug';
import { CharacteristicValue, PlatformAccessory } from 'homebridge';
import { TasmotaService, isTrue } from './TasmotaService.js';
import { tasmotaPlatform } from './tasmotaPlatform.js';

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

        this.service = this.accessory.getService(this.uuid) || this.accessory.addService(this.platform.Service.ContactSensor,
          accessory.context.device[this.uniq_id].name, this.uuid);
        this.service.setCharacteristic(this.platform.Characteristic.ConfiguredName, accessory.context.device[this.uniq_id].name);

        if (!this.service.displayName) {
          this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);
        }
        this.characteristic = this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState);
        if (this.platform.config.history) {
          this.fakegato = 'contact';
          this.service.addOptionalCharacteristic(this.platform.CustomCharacteristics.TimesOpened);
          this.service.addOptionalCharacteristic(this.platform.CustomCharacteristics.LastActivation);
        }
        break;
      case 'motion':
        this.platform.log.debug('Creating %s binary sensor %s', accessory.context.device[this.uniq_id].dev_cla,
          accessory.context.device[this.uniq_id].name);

        this.service = this.accessory.getService(this.uuid) || this.accessory.addService(this.platform.Service.MotionSensor,
          accessory.context.device[this.uniq_id].name, this.uuid);
        this.service.setCharacteristic(this.platform.Characteristic.ConfiguredName, accessory.context.device[this.uniq_id].name);

        if (!this.service.displayName) {
          this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);
        }
        this.characteristic = this.service.getCharacteristic(this.platform.Characteristic.MotionDetected);
        if (this.platform.config.history) {
          this.fakegato = 'motion';
          this.service.addOptionalCharacteristic(this.platform.CustomCharacteristics.LastActivation);
          debug('adding', this.fakegato);
        }
        break;
      case 'contact':
        this.platform.log.debug('Creating %s binary sensor %s', accessory.context.device[this.uniq_id].dev_cla, accessory.context.device[this.uniq_id].name);

        this.service = this.accessory.getService(this.uuid) || this.accessory.addService(this.platform.Service.ContactSensor,
          accessory.context.device[this.uniq_id].name, this.uuid);
        this.service.setCharacteristic(this.platform.Characteristic.ConfiguredName, accessory.context.device[this.uniq_id].name);

        if (!this.service.displayName) {
          this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);
        }
        this.characteristic = this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState);
        if (this.platform.config.history) {
          this.fakegato = 'contact';
          this.service.addOptionalCharacteristic(this.platform.CustomCharacteristics.LastActivation);
          debug('adding', this.fakegato);
        }
        break;
      case 'door':
        this.platform.log.debug('Creating %s binary sensor %s', accessory.context.device[this.uniq_id].dev_cla, accessory.context.device[this.uniq_id].name);

        this.service = this.accessory.getService(this.uuid) || this.accessory.addService(this.platform.Service.ContactSensor,
          accessory.context.device[this.uniq_id].name, this.uuid);
        this.service.setCharacteristic(this.platform.Characteristic.ConfiguredName, accessory.context.device[this.uniq_id].name);

        if (!this.service.displayName) {
          this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);
        }
        this.characteristic = this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState);
        if (this.platform.config.history) {
          this.fakegato = 'motion';
          this.service.addOptionalCharacteristic(this.platform.CustomCharacteristics.LastActivation);
          debug('adding', this.fakegato);
        }
        break;
      case 'moisture':
        this.platform.log.debug('Creating %s binary sensor %s', accessory.context.device[this.uniq_id].dev_cla, accessory.context.device[this.uniq_id].name);

        this.service = this.accessory.getService(this.uuid) || this.accessory.addService(this.platform.Service.LeakSensor,
          accessory.context.device[this.uniq_id].name, this.uuid);
        this.service.setCharacteristic(this.platform.Characteristic.ConfiguredName, accessory.context.device[this.uniq_id].name);

        if (!this.service.displayName) {
          this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);
        }
        this.characteristic = this.service.getCharacteristic(this.platform.Characteristic.LeakDetected);
        if (this.platform.config.history) {
          // this.fakegato = 'motion';
          this.service.addOptionalCharacteristic(this.platform.CustomCharacteristics.LastActivation);
          // debug('adding', this.fakegato);
        }
        break;
      default:
        this.platform.log.error('Warning: Unhandled Tasmota binary sensor type', accessory.context.device[this.uniq_id].dev_cla);
    }

    this.enableFakegato();

    this.enableStatus();
  }

  statusUpdate(topic: string, message: Buffer) {
    debug('MQTT', topic, message.toString());

    this.accessory.context.timeout = this.platform.autoCleanup(this.accessory);

    try {
      // debug('this.uniq_id', this.uniq_id);
      // debug('val_tpl', this.accessory.context.device[this.uniq_id].val_tpl);
      // debug('message', message.toString());
      let value: CharacteristicValue = message.toString();

      if (this.accessory.context.device[this.uniq_id].val_tpl) {
        value = this.parseValue(this.accessory.context.device[this.uniq_id].val_tpl, message.toString());
      }
      // debug('value', value, typeof value);
      // debug('device_class', this.device_class);

      // Adjust value to format expected by sensor type

      switch (this.device_class) {
        case 'doorbell':
          break;
        case 'moisture':
          // 1 / 0
          debug('moisture', this.accessory.context.device[this.uniq_id].pl_on, value);
          value = (this.accessory.context.device[this.uniq_id].pl_on === value
            ? this.platform.Characteristic.LeakDetected.LEAK_DETECTED
            : this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED);
          break;
        case 'door':
          if (typeof this.accessory.context.device[this.uniq_id].pl_on === 'boolean') {
            value = isTrue(value);
          }
          value = (this.accessory.context.device[this.uniq_id].pl_on === value
            ? this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED
            : this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED);
          break;
        case 'motion':
          // boolean
          value = (this.accessory.context.device[this.uniq_id].pl_on === value);
          break;
        case 'contact':
          // boolean
          value = (this.accessory.context.device[this.uniq_id].pl_on === value
            ? this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED
            : this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED);
          break;
      }

      if (this.characteristic?.value !== value) {
        this.platform.log.info('Updating \'%s\' binary sensor to %s', this.service?.displayName, value);
        let timesOpened: number;
        switch (this.device_class) {
          case 'doorbell':
            timesOpened = 1 + Number(this.service?.getCharacteristic(this.platform.CustomCharacteristics.TimesOpened).value);
            this.service?.updateCharacteristic(this.platform.CustomCharacteristics.TimesOpened, timesOpened);
          // fall thru
          /* eslint-disable no-fallthrough */
          case 'moisture':
          case 'motion':
          case 'contact':
            if (this.platform.config.history) {
              const now = Math.round(new Date().valueOf() / 1000);
              const lastActivation = now - this.accessory.context.fakegatoService.getInitialTime();
              this.service?.updateCharacteristic(this.platform.CustomCharacteristics.LastActivation, lastActivation);
            }
            break;
        }
      } else {
        this.platform.log.debug('Updating \'%s\' binary sensor to %s', this.service?.displayName, value);
      }

      this.characteristic?.updateValue(value);

      if (this.platform.config.history && this.fakegato && this.accessory.context.fakegatoService?.addEntry) {
        debug('Updating fakegato', this.service?.displayName, {
          [this.fakegato]: (this.characteristic?.value ? 1 : 0),
        });
        this.accessory.context.fakegatoService.appendData({
          [this.fakegato]: (this.characteristic?.value ? 1 : 0),
        });
      } else {
        // debug('Not updating fakegato', this.service.displayName);
      }
    } catch (err: unknown) {
      this.platform.log.error('ERROR: Message Parse Error', topic, message.toString());
      this.platform.log.debug(String((err && (err as Error).message ? (err as Error).message : err)));
    }
  }
}
