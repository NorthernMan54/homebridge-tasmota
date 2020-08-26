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
