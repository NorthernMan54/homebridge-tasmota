import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, Characteristic } from 'homebridge';

import { tasmotaPlatform } from './platform';
import nunjucks from 'nunjucks';

import createDebug from 'debug';
const debug = createDebug('Tasmota:light');

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class tasmotaLightService {
  private service: Service;
  private characteristic: Characteristic;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private exampleStates = {
    On: false,
    Brightness: 100,
  }

  constructor(
    private readonly platform: tasmotaPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly uniq_id: string,
  ) {

    /*
    {
      name: 'Kitchen Sink Kitchen Sink',
      stat_t: 'tele/tasmota_284CCF/STATE',
      avty_t: 'tele/tasmota_284CCF/LWT',
      pl_avail: 'Online',
      pl_not_avail: 'Offline',
      cmd_t: 'cmnd/tasmota_284CCF/POWER',
      val_tpl: '{{value_json.POWER}}',
      pl_off: 'OFF',
      pl_on: 'ON',
      uniq_id: '284CCF_LI_1',
      dev: { ids: [ '284CCF' ] },
      bri_cmd_t: 'cmnd/tasmota_284CCF/Dimmer',
      bri_stat_t: 'tele/tasmota_284CCF/STATE',
      bri_scl: 100,
      on_cmd_type: 'brightness',
      bri_val_tpl: '{{value_json.Dimmer}}',
      tasmotaType: 'light'
    }
    */

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory

    const uuid = this.platform.api.hap.uuid.generate(accessory.context.device[this.uniq_id].uniq_id);
    this.service = this.accessory.getService(uuid) || this.accessory.addService(this.platform.Service.Lightbulb, accessory.context.device[this.uniq_id].name, uuid);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    //
    if (this.service.getCharacteristic(this.platform.Characteristic.On).listenerCount('set') < 1) {
      this.service.getCharacteristic(this.platform.Characteristic.On)
        .on('set', this.setOn.bind(this));                // SET - bind to the `setOn` method below
      // .on('get', this.getOn.bind(this));               // GET - bind to the `getOn` method below

      debug('Creating statusUpdate listener for', accessory.context.device[this.uniq_id].stat_t);
      accessory.context.mqttHost.on(accessory.context.device[this.uniq_id].stat_t, this.statusUpdate.bind(this));
      accessory.context.mqttHost.on(accessory.context.device[this.uniq_id].avty_t, this.availabilityUpdate.bind(this));
    }

    // Does the lightbulb include a brightness characteristic

    if (accessory.context.device[this.uniq_id].bri_cmd_t) {
      (this.service.getCharacteristic(this.platform.Characteristic.Brightness) || this.service.addCharacteristic(this.platform.Characteristic.Brightness))
        .on('set', this.setBrightness.bind(this));
    }

    // Does the lightbulb include a colour temperature characteristic

    if (accessory.context.device[this.uniq_id].clr_temp_cmd_t) {
      (this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature) || this.service.addCharacteristic(this.platform.Characteristic.ColorTemperature))
        .on('set', this.setColorTemperature.bind(this));
    }

    nunjucks.configure({
      autoescape: true,
    });
    // Get current status for accessory/service on startup
    const teleperiod = this.accessory.context.device[this.uniq_id].cmd_t.substr(0, this.accessory.context.device[this.uniq_id].cmd_t.lastIndexOf('/') + 1) + 'teleperiod';
    this.accessory.context.mqttHost.sendMessage(teleperiod, '300');
  }

  /**
   * Handle "STATE" messages from Tasmotastat_t:
   * These are sent when the device's state is changed, either via HomeKit, Local Control or Other control methods.
   */

  statusUpdate(topic, message) {
    debug('statusUpdate', topic, message.toString());
    /* stat_t: 'tele/tasmota_00F861/STATE',
     * pl_off: 'OFF',
       pl_on: 'ON',
     */
    /*
    {  Arilux LC06 in
      "Time": "2020-09-04T01:09:41",
      "Uptime": "0T05:40:51",
      "UptimeSec": 20451,
      "Heap": 24,
      "SleepMode": "Dynamic",
      "Sleep": 10,
      "LoadAvg": 99, "MqttCount": 1,
      "POWER": "ON",
      "Dimmer": 74,
      "Color": "189,189",
      "HSBColor": "0,0,0",
      "Channel": [74, 74],
      "CT": 327,
      "Fade": "OFF",
      "Speed": 1,
      "LedTable": "ON",
      "Wifi": { "AP": 1, "SSId": "The_Beach", "BSSId": "34:12:98:08:9D:2A", "Channel": 11, "RSSI": 88, "Signal": -56, "LinkCount": 1, "Downtime": "0T00:00:06" }
    };
     */

    this.accessory.context.timeout = this.platform.autoCleanup(this.accessory);

    const interim = {
      value_json: JSON.parse(message.toString()),
    };

    this.service.getCharacteristic(this.platform.Characteristic.On).updateValue((nunjucks.renderString(this.accessory.context.device[this.uniq_id].val_tpl, interim) === this.accessory.context.device[this.uniq_id].pl_on ? 1 : 0));

    if (this.accessory.context.device[this.uniq_id].bri_val_tpl) {
      this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(nunjucks.renderString(this.accessory.context.device[this.uniq_id].bri_val_tpl, interim));
      this.platform.log.info('statusUpdate %s Brightness to %s', this.accessory.displayName, nunjucks.renderString(this.accessory.context.device[this.uniq_id].bri_val_tpl, interim));

    }

    if (this.accessory.context.device[this.uniq_id].clr_temp_cmd_t) {
      this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature).updateValue(nunjucks.renderString(this.accessory.context.device[this.uniq_id].clr_temp_val_tpl, interim));
      this.platform.log.info('statusUpdate %s ColorTemperature to %s', this.accessory.displayName, nunjucks.renderString(this.accessory.context.device[this.uniq_id].clr_temp_val_tpl, interim));

    }

    this.platform.log.info('statusUpdate %s to %s', this.accessory.displayName, nunjucks.renderString(this.accessory.context.device[this.uniq_id].val_tpl, interim));
  }

  /**
   * Handle "LWT" Last Will and Testament messages from Tasmota
   * These are sent when the device is no longer available from the MQTT server.
   */

  availabilityUpdate(topic, message) {
    this.platform.log.error('availabilityUpdate %s to %s', this.service.displayName, message);
    // debug("MQTT", this.accessory.displayName, topic, message.toString());
    /*

    avty_t: 'tele/tasmota_00F861/LWT',
    pl_avail: 'Online',
    pl_not_avail: 'Offline',

    */

    const availability = (message.toString() === this.accessory.context.device[this.uniq_id].pl_not_avail ? new Error(this.accessory.displayName + ' ' + message.toString()) : 0);

    this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(availability);
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {

    // implement your own code to turn your device on/off
    this.exampleStates.On = value as boolean;

    this.platform.log.info('%s Set Characteristic On ->', this.accessory.displayName, value);

    this.accessory.context.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].cmd_t, (value ? this.accessory.context.device[this.uniq_id].pl_on : this.accessory.context.device[this.uniq_id].pl_off));

    // you must call the callback function
    callback(null);
  }

  setBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {

    this.platform.log.info('%s Set Characteristic Brightness ->', this.accessory.displayName, value);

    this.accessory.context.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].bri_cmd_t, value.toString());

    // you must call the callback function
    callback(null);
  }

  setColorTemperature(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.info('%s Set Characteristic ColorTemperature ->', this.accessory.displayName, value);
    this.accessory.context.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].clr_temp_cmd_t, value.toString());
    callback(null);
  }

}
