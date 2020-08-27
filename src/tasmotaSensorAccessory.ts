import { PlatformAccessory } from 'homebridge';

import { tasmotaPlatform } from './platform';

import createDebug from 'debug';
const debug = createDebug('Tasmota:sensor');

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class tasmotaSensorAccessory {
  // private service: Service;

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

    // debug("Name", this.uniq_id, accessory.context );

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].dev.name)
      .setCharacteristic(this.platform.Characteristic.Manufacturer, accessory.context.device[this.uniq_id].dev.mf)
      .setCharacteristic(this.platform.Characteristic.Model, accessory.context.device[this.uniq_id].dev.mdl)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, accessory.context.device[this.uniq_id].dev.sw)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device[this.uniq_id].dev.ids[0]);

    // debug("details", accessory.context.device[this.uniq_id].dev);

  }
}

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
