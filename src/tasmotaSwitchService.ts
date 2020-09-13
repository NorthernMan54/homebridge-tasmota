import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, Characteristic } from 'homebridge';

import { tasmotaPlatform } from './platform';
import nunjucks from 'nunjucks';

import createDebug from 'debug';
const debug = createDebug('Tasmota:switch');

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class tasmotaSwitchService {
  private service: Service;
  private characteristic: Characteristic;

  constructor(
    private readonly platform: tasmotaPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly uniq_id: string,
  ) {
    const uuid = this.platform.api.hap.uuid.generate(accessory.context.device[this.uniq_id].uniq_id);

    this.service = this.accessory.getService(uuid) || this.accessory.addService(this.platform.Service.Switch, accessory.context.device[this.uniq_id].name, uuid);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    this.characteristic = this.service.getCharacteristic(this.platform.Characteristic.On);

    // register handlers for the On/Off Characteristic

    if (this.service.getCharacteristic(this.platform.Characteristic.On).listenerCount('set') < 1) {
      this.service.getCharacteristic(this.platform.Characteristic.On)
        .on('set', this.setOn.bind(this));                // SET - bind to the `setOn` method below
      // .on('get', this.getOn.bind(this));               // GET - bind to the `getOn` method below

      debug('Creating statusUpdate listener for', accessory.context.device[this.uniq_id].stat_t);
      accessory.context.mqttHost.on(accessory.context.device[this.uniq_id].stat_t, this.statusUpdate.bind(this));
      accessory.context.mqttHost.on(accessory.context.device[this.uniq_id].avty_t, this.availabilityUpdate.bind(this));
    }
    nunjucks.configure({
      autoescape: true,
    });

    this.refresh();
  }

  refresh() {
    // Get current status for accessory/service on startup
    const telePeriod = this.accessory.context.device[this.uniq_id].cmd_t.substr(0, this.accessory.context.device[this.uniq_id].cmd_t.lastIndexOf('/') + 1) + 'teleperiod';
    this.accessory.context.mqttHost.sendMessage(telePeriod, '300');
  }


  /**
   * Handle "STATE" messages from Tasmotastat_t:
   * These are sent when the device's state is changed, either via HomeKit, Local Control or Other control methods.
   */

  statusUpdate(topic, message) {
    // debug("MQTT", topic, message.toString());

    this.accessory.context.timeout = this.platform.autoCleanup(this.accessory);
    const interim = {
      value_json: JSON.parse(message.toString()),
    };

    if (this.characteristic.value !== (nunjucks.renderString(this.accessory.context.device[this.uniq_id].val_tpl, interim) === this.accessory.context.device[this.uniq_id].pl_on ? true : false)) {

      this.platform.log.info('Updating \'%s\' to %s', this.service.displayName, nunjucks.renderString(this.accessory.context.device[this.uniq_id].val_tpl, interim));

    } else {

      this.platform.log.debug('Updating \'%s\' to %s', this.service.displayName, nunjucks.renderString(this.accessory.context.device[this.uniq_id].val_tpl, interim));
    }

    this.characteristic.updateValue((nunjucks.renderString(this.accessory.context.device[this.uniq_id].val_tpl, interim) === this.accessory.context.device[this.uniq_id].pl_on ? true : false));
  }

  /**
   * Handle "LWT" Last Will and Testament messages from Tasmota
   * These are sent when the device is no longer available from the MQTT server.
   */

  availabilityUpdate(topic, message) {
    this.platform.log.info('Marking switch accessory \'%s\' to %s', this.service.displayName, message);

    const availability = (message.toString() === this.accessory.context.device[this.uniq_id].pl_not_avail ? new Error(this.accessory.displayName + ' ' + message.toString()) : 0);
    this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(availability);
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {

    this.platform.log.info('%s Set Characteristic On ->', this.service.displayName, value);

    this.accessory.context.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].cmd_t, (value ? this.accessory.context.device[this.uniq_id].pl_on : this.accessory.context.device[this.uniq_id].pl_off));

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
