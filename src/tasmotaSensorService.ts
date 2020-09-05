import { Service, PlatformAccessory, Characteristic } from 'homebridge';

import { tasmotaPlatform } from './platform';
// import { nunjucks } from 'nunjucks';

import nunjucks from 'nunjucks';

import createDebug from 'debug';
const debug = createDebug('Tasmota:sensor');

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class tasmotaSensorService {
  private service: Service;
  private characteristic: Characteristic;

  constructor(
    private readonly platform: tasmotaPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly uniq_id: string,
  ) {

    if (accessory.context.device[this.uniq_id].dev_cla) {

      const uuid = this.platform.api.hap.uuid.generate(accessory.context.device[this.uniq_id].uniq_id);
      switch (accessory.context.device[this.uniq_id].dev_cla) {
        case 'temperature':
          debug('Creating %s sensor %s', accessory.context.device[this.uniq_id].dev_cla, accessory.context.device[this.uniq_id].name);

          this.service = this.accessory.getService(uuid) || this.accessory.addService(this.platform.Service.TemperatureSensor, accessory.context.device[this.uniq_id].name, uuid);

          this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);

          this.characteristic = this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature);

          debug('Creating statusUpdate listener for %s %s', accessory.context.device[this.uniq_id].stat_t, accessory.context.device[this.uniq_id].name);

          accessory.context.mqttHost.on(accessory.context.device[this.uniq_id].stat_t, this.statusUpdate.bind(this));
          accessory.context.mqttHost.on(accessory.context.device[this.uniq_id].avty_t, this.availabilityUpdate.bind(this));
          break;
        case 'humidity':
          debug('Creating %s sensor %s', accessory.context.device[this.uniq_id].dev_cla, accessory.context.device[this.uniq_id].name);

          this.service = this.accessory.getService(uuid) || this.accessory.addService(this.platform.Service.HumiditySensor, accessory.context.device[this.uniq_id].name, uuid);

          this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);

          this.characteristic = this.service.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity);

          debug('Creating statusUpdate listener for %s %s', accessory.context.device[this.uniq_id].stat_t, accessory.context.device[this.uniq_id].name);

          accessory.context.mqttHost.on(accessory.context.device[this.uniq_id].stat_t, this.statusUpdate.bind(this));
          accessory.context.mqttHost.on(accessory.context.device[this.uniq_id].avty_t, this.availabilityUpdate.bind(this));
          break;
      }

    } else {
      // Home Assistant State and device details
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].dev.name)
        .setCharacteristic(this.platform.Characteristic.Manufacturer, accessory.context.device[this.uniq_id].dev.mf)
        .setCharacteristic(this.platform.Characteristic.Model, accessory.context.device[this.uniq_id].dev.mdl)
        .setCharacteristic(this.platform.Characteristic.FirmwareRevision, accessory.context.device[this.uniq_id].dev.sw)
        .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device[this.uniq_id].dev.ids[0]);
    }

    nunjucks.configure({
      autoescape: true,
    });

  }

  /*

  {"Time":"2020-08-28T17:39:01",
  "BME280":{"Temperature":21.2,"Humidity":64.5,"Pressure":991.4}
  ,"PressureUnit":"hPa","TempUnit":"C"}

  */

  statusUpdate(topic, message) {

    this.accessory.context.timeout = this.platform.autoCleanup(this.accessory);
    const interim = {
      value_json: JSON.parse(message.toString()),
    };

    if (this.characteristic.value != nunjucks.renderString(this.accessory.context.device[this.uniq_id].val_tpl, interim)) {
      this.platform.log.info('statusUpdate %s to %s', this.service.displayName, nunjucks.renderString(this.accessory.context.device[this.uniq_id].val_tpl, interim));
    }
    else {
      this.platform.log.debug('statusUpdate %s to %s', this.service.displayName, nunjucks.renderString(this.accessory.context.device[this.uniq_id].val_tpl, interim));
    }

    this.characteristic.updateValue(nunjucks.renderString(this.accessory.context.device[this.uniq_id].val_tpl, interim));
    // this.platform.log.info('statusUpdate %s to %s', this.service.displayName, nunjucks.renderString(this.accessory.context.device[this.uniq_id].val_tpl, interim));
  }

  /**
   * Handle "LWT" Last Will and Testament messages from Tasmota
   * These are sent when the device is no longer available from the MQTT server.
   */

  availabilityUpdate(topic, message) {
    this.platform.log.error('availabilityUpdate %s to %s', this.service.displayName, message);

    const availability = (message.toString() === this.accessory.context.device[this.uniq_id].pl_not_avail ? new Error(this.accessory.displayName + ' ' + message.toString()) : 0);

    this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(availability);
  }
}

/*

{
  name: 'Scanner status',
  stat_t: 'tele/tasmota_00705C/HASS_STATE',
  avty_t: 'tele/tasmota_00705C/LWT',
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  json_attr_t: 'tele/tasmota_00705C/HASS_STATE',
  unit_of_meas: '%',
  val_tpl: "{{value_json['RSSI']}}",
  ic: 'mdi:information-outline',
  uniq_id: '00705C_status',
  dev: {
    ids: [ '00705C' ],
    name: 'Scanner',
    mdl: 'WiOn',
    sw: '8.4.0(tasmota)',
    mf: 'Tasmota'
  },
  tasmotaType: 'sensor'
}

*/

/*

Tasmota Model - Generic (18)
BME280 connected to SCL -> D5 - GPIO14, SDA -> D6 - GPIO12

{
  name: 'Sensor BME280 Temperature',
  stat_t: '~SENSOR',
  avty_t: '~LWT',
  frc_upd: true,
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  uniq_id: 'DC4492_BME280_Temperature',
  device: { identifiers: [ 'DC4492' ], connections: [ [Array] ] },
  '~': 'sonoff_DC4492/tele/',
  unit_of_meas: '°C',
  val_tpl: "{{value_json['BME280'].Temperature}}",
  dev_cla: 'temperature',
  tasmotaType: 'sensor'
}

{
  name: 'Sensor BME280 Humidity',
  stat_t: '~SENSOR',
  avty_t: '~LWT',
  frc_upd: true,
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  uniq_id: 'DC4492_BME280_Humidity',
  device: { identifiers: [ 'DC4492' ], connections: [ [Array] ] },
  '~': 'sonoff_DC4492/tele/',
  unit_of_meas: '%',
  val_tpl: "{{value_json['BME280'].Humidity}}",
  dev_cla: 'humidity',
  tasmotaType: 'sensor'
}

{
  name: 'Sensor BME280 Pressure',
  stat_t: '~SENSOR',
  avty_t: '~LWT',
  frc_upd: true,
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  uniq_id: 'DC4492_BME280_Pressure',
  device: { identifiers: [ 'DC4492' ], connections: [ [Array] ] },
  '~': 'sonoff_DC4492/tele/',
  unit_of_meas: 'hPa',
  val_tpl: "{{value_json['BME280'].Pressure}}",
  dev_cla: 'pressure',
  tasmotaType: 'sensor'
}

{
  name: 'Sensor status',
  stat_t: '~HASS_STATE',
  avty_t: '~LWT',
  frc_upd: true,
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  json_attributes_topic: '~HASS_STATE',
  unit_of_meas: ' ',
  val_tpl: "{{value_json['RSSI']}}",
  ic: 'mdi:information-outline',
  uniq_id: 'DC4492_status',
  device: {
    identifiers: [ 'DC4492' ],
    connections: [ [Array] ],
    name: 'Sensor',
    model: 'Generic',
    sw_version: '8.1.0(sensors)',
    manufacturer: 'Tasmota'
  },
  '~': 'sonoff_DC4492/tele/',
  tasmotaType: 'sensor'
}

*/
