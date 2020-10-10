import { Service, PlatformAccessory, Characteristic } from 'homebridge';

import { tasmotaPlatform } from './platform';

import nunjucks from 'nunjucks';

import createDebug from 'debug';
const debug = createDebug('Tasmota:sensor');

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */

interface Subscription {
  event: string, callback: any
}

export class tasmotaSensorService {
  public service: Service;
  private characteristic: Characteristic;
  private device_class: string;
  public statusSubscribe: Subscription;
  public availabilitySubscribe: Subscription;
  private CustomCharacteristic;
  public fakegato: string;

  constructor(
    private readonly platform: tasmotaPlatform,
    public readonly accessory: PlatformAccessory,
    private readonly uniq_id: string,
  ) {
    /* eslint-disable */
    this.CustomCharacteristic = require('./lib/CustomCharacteristics')(platform.Service, platform.Characteristic);
    const uuid = this.platform.api.hap.uuid.generate(accessory.context.device[this.uniq_id].uniq_id);

    this.device_class = accessory.context.device[this.uniq_id].dev_cla;
    switch (accessory.context.device[this.uniq_id].dev_cla) {
      case 'temperature':
        this.platform.log.debug('Creating %s sensor %s', accessory.context.device[this.uniq_id].dev_cla, accessory.context.device[this.uniq_id].name);

        this.service = this.accessory.getService(uuid) || this.accessory.addService(this.platform.Service.TemperatureSensor, accessory.context.device[this.uniq_id].name, uuid);

        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);

        // Burr winter is coming

        this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
          .setProps({
            minValue: -100,
            maxValue: 100,
          });

        this.fakegato = 'weather';
        this.characteristic = this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature);

        break;
      case 'humidity':
        this.platform.log.debug('Creating %s sensor %s', accessory.context.device[this.uniq_id].dev_cla, accessory.context.device[this.uniq_id].name);

        this.service = this.accessory.getService(uuid) || this.accessory.addService(this.platform.Service.HumiditySensor, accessory.context.device[this.uniq_id].name, uuid);

        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);
        this.characteristic = this.service.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity);

        break;
      case 'pressure':
        this.platform.log.debug('Creating %s sensor %s', accessory.context.device[this.uniq_id].dev_cla, accessory.context.device[this.uniq_id].name);

        this.service = this.accessory.getService(uuid) || this.accessory.addService(this.CustomCharacteristic.AtmosphericPressureSensor, accessory.context.device[this.uniq_id].name, uuid);

        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);
        this.characteristic = this.service.getCharacteristic(this.CustomCharacteristic.AtmosphericPressureLevel);

        break;
      case 'illuminance':
        this.platform.log.debug('Creating %s sensor %s', accessory.context.device[this.uniq_id].dev_cla, accessory.context.device[this.uniq_id].name);

        this.service = this.accessory.getService(uuid) || this.accessory.addService(this.platform.Service.LightSensor, accessory.context.device[this.uniq_id].name, uuid);

        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);
        this.characteristic = this.service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel);

        break;
      case 'co2':
        this.platform.log.debug('Creating %s sensor %s', accessory.context.device[this.uniq_id].dev_cla, accessory.context.device[this.uniq_id].name);

        this.service = this.accessory.getService(uuid) || this.accessory.addService(this.platform.Service.CarbonDioxideSensor, accessory.context.device[this.uniq_id].name, uuid);

        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);
        this.characteristic = this.service.getCharacteristic(this.platform.Characteristic.CarbonDioxideLevel);

        break;
      case 'pm25':
        this.platform.log.debug('Creating %s sensor %s', accessory.context.device[this.uniq_id].dev_cla, accessory.context.device[this.uniq_id].name);

        this.service = this.accessory.getService(uuid) || this.accessory.addService(this.platform.Service.AirQualitySensor, accessory.context.device[this.uniq_id].name, uuid);

        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);
        this.characteristic = this.service.getCharacteristic(this.platform.Characteristic.AirParticulateDensity);
        this.service.setCharacteristic(this.platform.Characteristic.AirParticulateSize, this.platform.Characteristic.AirParticulateSize._2_5_M);

        break;
      case 'power':
        switch (this.uniq_id.replace(accessory.context.identifier, '').toLowerCase()) {
          case '_energy_current': // Amps
          case '_energy_voltage': // Voltage
          case '_energy_power': // Watts
          case '_energy_total': // Total Kilowatts
            this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch, accessory.context.device[this.uniq_id].name, uuid);
            // debug('this.service', this.service);

            this.characteristic = this.service.getCharacteristic(this.deviceClassToHKCharacteristic(this.uniq_id.replace(accessory.context.identifier, '').toLowerCase()));
            if (this.uniq_id.replace(accessory.context.identifier, '').toLowerCase() === '_energy_current') {
              this.fakegato = 'energy';
            }
            break;
          default:
            this.platform.log.warn('Warning: Unhandled Tasmota power sensor type', this.uniq_id.replace(accessory.context.identifier, '').toLowerCase());
        }
        break;
      case undefined:
        // This is this Device status object
        this.platform.log.debug('Setting accessory information', accessory.context.device[this.uniq_id].name);
        this.accessory.getService(this.platform.Service.AccessoryInformation)!
          .setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].dev.name)
          .setCharacteristic(this.platform.Characteristic.Manufacturer, accessory.context.device[this.uniq_id].dev.mf)
          .setCharacteristic(this.platform.Characteristic.Model, accessory.context.device[this.uniq_id].dev.mdl)
          .setCharacteristic(this.platform.Characteristic.FirmwareRevision, accessory.context.device[this.uniq_id].dev.sw)
          .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device[this.uniq_id].dev.ids[0]);
          // debug('AccessoryInformation', this.accessory.getService(this.platform.Service.AccessoryInformation));
        break;
      default:
        this.platform.log.warn('Warning: Unhandled Tasmota sensor type', accessory.context.device[this.uniq_id].dev_cla);
    }

    // setup event listeners for services / characteristics

    if (this.characteristic) {
      this.platform.log.debug('Creating statusUpdate listener for %s %s', accessory.context.device[this.uniq_id].stat_t, accessory.context.device[this.uniq_id].name);
      this.statusSubscribe = { event: accessory.context.device[this.uniq_id].stat_t, callback: this.statusUpdate.bind(this) };
      accessory.context.mqttHost.on(accessory.context.device[this.uniq_id].stat_t, this.statusUpdate.bind(this));

      this.availabilitySubscribe = { event: accessory.context.device[this.uniq_id].avty_t, callback: this.availabilityUpdate.bind(this) };
      accessory.context.mqttHost.statusSubscribe(accessory.context.device[this.uniq_id].stat_t);
      accessory.context.mqttHost.on(accessory.context.device[this.uniq_id].avty_t, this.availabilityUpdate.bind(this));
      this.availabilitySubscribe = accessory.context.mqttHost.availabilitySubscribe(accessory.context.device[this.uniq_id].avty_t);
    }

    nunjucks.installJinjaCompat();
    nunjucks.configure({
      autoescape: true,
    });
    this.refresh();
  }

  deviceClassToHKCharacteristic(device_class: string) {
    switch (device_class) {
      case '_energy_current': // Amps
        return (this.CustomCharacteristic.ElectricCurrent);
      case '_energy_voltage': // Voltage
        return (this.CustomCharacteristic.Voltage);
      case '_energy_power': // Watts
        return (this.CustomCharacteristic.CurrentConsumption);
      case '_energy_total': // Total Kilowatts
        return (this.CustomCharacteristic.TotalConsumption);
        break;
    }
  }

  refresh() {
    // Get current status for accessory/service on startup
    const teleperiod = this.accessory.context.device[this.uniq_id].stat_t.substr(0, this.accessory.context.device[this.uniq_id].stat_t.lastIndexOf('/') + 1).replace('tele', 'cmnd') + 'teleperiod';
    this.accessory.context.mqttHost.sendMessage(teleperiod, '300');
  }

  statusUpdate(topic, message) {
    debug('statusUpdate', this.service.displayName, topic, message.toString());

    this.accessory.context.timeout = this.platform.autoCleanup(this.accessory);

    let value = this.parseValue(this.accessory.context.device[this.uniq_id].val_tpl, {
      value_json: JSON.parse(message.toString()),
    });

    // Sensor value tweaks or adjustments needed for homekit

    switch (this.device_class) {
      case 'illuminance':
        // normalize LX in the range homebridge expects
        value = (value < 0.0001 ? 0.0001 : (value > 100000 ? 100000 : value));
        break;
      case 'co2':
        if (value > 1200) {
          this.service.setCharacteristic(this.platform.Characteristic.CarbonDioxideDetected, this.platform.Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL);
        } else {
          this.service.setCharacteristic(this.platform.Characteristic.CarbonDioxideDetected, this.platform.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL);
        }
        break;
    }

    if (value instanceof Error) {
      // Error has already been handled
    } else {
      if (this.characteristic.value != value && this.delta(this.characteristic.value, value)) {
        this.platform.log.info('Updating \'%s\' to %s', this.service.displayName, value);
      } else {
        this.platform.log.debug('Updating \'%s\' to %s', this.service.displayName, value);
      }
    }

    this.characteristic.updateValue(value);
  }



  /**
   * Handle "LWT" Last Will and Testament messages from Tasmota
   * These are sent when the device is no longer available from the MQTT server.
   */

  availabilityUpdate(topic, message) {
    // debug("availabilityUpdate", this, topic, message.toString());
    this.platform.log.info('Marking sensor accessory \'%s\' to %s', this.service.displayName, message);

    const availability = (message.toString() === this.accessory.context.device[this.uniq_id].pl_not_avail ? new Error(this.accessory.displayName + ' ' + message.toString()) : 0);

    this.characteristic.updateValue(availability);
  }

  // Utility functions for status update

  delta(value1, value2) {
    // debug("delta", (parseInt(value1) !== parseInt(value2)));
    return (parseInt(value1) !== parseInt(value2));
  }


  parseValue(valueTemplate, value) {
    const result = nunjucks.renderString(valueTemplate, value);
    if (result) {
      return parseFloat(result);
    } else {
      this.platform.log.error('ERROR: Sensor %s missing data', this.service.displayName);
      return (new Error('Missing sensor value'));
    }
  }
}


/*

ZMAi-90 Power Meter Tasmota Config

ZMAi-90 with PCB version 2011 F20439

2) Set module as Tuya MCU (54)

3) run:
a)Backlog TuyaMCU 32,17; TuyaMCU 31,19; TuyaMCU 33,20; SetOption59 1

Rule1 on System#Boot do RuleTimer1 5 endon on Rules#Timer=1 do backlog SerialSend5 55aa0001000000; RuleTimer1 5 endon
rule1 1
rule2 on Energy#Power != %var1% do backlog var1 %value%; teleperiod 300 endon
rule2 1

Not needed
SetOption66 1 - Send TUYA Messages over MQTT




Status update message - BME280

{"Time":"2020-08-28T17:39:01",
"BME280":{"Temperature":21.2,"Humidity":64.5,"Pressure":991.4}
,"PressureUnit":"hPa","TempUnit":"C"}

*/


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

Tasmota Model - Generic (18) - MCUIOT Device
BME280 connected to:

D5 - GPIO14 - SCL,
D6 - GPIO12 -> SDA,
D4 - GPIO2 -> LedLink

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
