import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, Characteristic } from 'homebridge';
import { TasmotaService } from './TasmotaService';
import { tasmotaPlatform } from './platform';

import createDebug from 'debug';
const debug = createDebug('Tasmota:switch');

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */

export class tasmotaSwitchService extends TasmotaService {

  constructor(
    public readonly platform: tasmotaPlatform,
    public readonly accessory: PlatformAccessory,
    protected readonly uniq_id: string,
  ) {
    super(platform, accessory, uniq_id);

    this.service = this.accessory.getService(this.uuid) || this.accessory.addService(this.platform.Service.Switch, accessory.context.device[this.uniq_id].name, this.uuid);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    if (!this.service.displayName) {
      this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);
    }

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    this.characteristic = this.service.getCharacteristic(this.platform.Characteristic.On);

    this.enableFakegato();

    // register handlers for the On/Off Characteristic

    if (this.service.getCharacteristic(this.platform.Characteristic.On).listenerCount('set') < 1) {
      this.service.getCharacteristic(this.platform.Characteristic.On)
        .on('set', this.setOn.bind(this));                // SET - bind to the `setOn` method below
      // .on('get', this.getOn.bind(this));               // GET - bind to the `getOn` method below
    }
    this.enableStatus();
  }


  /**
   * Handle "STATE" messages from Tasmotastat_t:
   * These are sent when the device's state is changed, either via HomeKit, Local Control or Other control methods.
   */

  statusUpdate(topic, message) {
    debug('MQTT', topic, message.toString());

    try {
      this.accessory.context.timeout = this.platform.autoCleanup(this.accessory);
      const interim = {
        value_json: JSON.parse(message.toString()),
      };

      const value = (this.parseValue(this.accessory.context.device[this.uniq_id].val_tpl, interim) === this.accessory.context.device[this.uniq_id].pl_on ? true : false);

      if (this.characteristic.value !== value) {
        this.platform.log.info('Updating \'%s:%s\' to %s', this.service.displayName, this.characteristic.displayName, value);

        if (this.platform.config.history && this.accessory.context.fakegatoService ?.addEntry) {
          debug('Updating fakegato \'%s:%s\'', this.service.displayName, this.characteristic.displayName, {
            status: (value ? 1 : 0),
          });
          this.accessory.context.fakegatoService.appendData({
            status: (value ? 1 : 0),
          });
        } else {
          debug('Not updating fakegato \'%s:%s\'', this.service.displayName, this.characteristic.displayName);
        }

      } else {

        this.platform.log.debug('Updating \'%s\' to %s', this.service.displayName, value);
      }

      this.characteristic.updateValue(value);

    } catch (err) {
      debug('ERROR:', err.message);
      this.platform.log.error('ERROR: message parsing error', this.service.displayName, topic, message.toString());
    }
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {

    try {
      this.platform.log.info('%s Set Characteristic On ->', this.service.displayName, value);

      this.accessory.context.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].cmd_t, (value ? this.accessory.context.device[this.uniq_id].pl_on : this.accessory.context.device[this.uniq_id].pl_off));

      if (this.platform.config.history && this.accessory.context.fakegatoService ?.addEntry) {
        debug('Updating fakegato', this.service.displayName, {
          status: (value ? 1 : 0),
        });
        this.accessory.context.fakegatoService.appendData({
          status: (value ? 1 : 0),
        });
      } else {
        // debug('Not updating fakegato', this.service.displayName);
      }
    } catch (err) {
      this.platform.log.error('ERROR:', err.message);
    }
    // you must call the callback function
    callback(null);
  }

}

/* stat_t: 'tele/tasmota_00F861/STATE',
 * pl_off: 'OFF',
   pl_on: 'ON',
 *
 {"Time":"1970-01-01T18:24:07",
 "Uptime":"0T18:24:08",
 "UptimeSec":66248,
 "Heap":23,
 "SleepMode":"Dynamic",
 "Sleep":50,
 "LoadAvg":19,
 "MqttCount":1,
 "POWER":"ON",
 "Wifi":{"AP":2,"SSId":"The_Beach","BSSId":"34:12:98:08:9D:2A","Channel":11,"RSSI":82,"Signal":-59,"LinkCount":1,"Downtime":"0T00:00:03"}}

 */

/*
 {
   name: 'Stereo Tasmota',
   stat_t: 'tele/tasmota_00F861/STATE',
   avty_t: 'tele/tasmota_00F861/LWT',
   pl_avail: 'Online',
   pl_not_avail: 'Offline',
   cmd_t: 'cmnd/tasmota_00F861/POWER',
   val_tpl: '{{value_json.POWER}}',
   pl_off: 'OFF',
   pl_on: 'ON',
   uniq_id: '00F861_RL_1',
   dev: { ids: [ '00F861' ] },
   tasmotaType: 'switch'
 }
 */
