import createDebug from 'debug'
import { CharacteristicSetCallback, CharacteristicValue, PlatformAccessory } from 'homebridge'
import { tasmotaPlatform } from './platform'

import { isTrue, TasmotaService } from './TasmotaService'

const debug = createDebug('Tasmota:switch')

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
    super(platform, accessory, uniq_id)

    if (this.accessory.getService(this.uuid)) {
      this.service = this.accessory.getService(this.uuid)!
    } else if (this.accessory.getService(this.platform.Service.Outlet)) {
      const temp = this.accessory.getService(this.platform.Service.Outlet)!
      if (temp.name === null) {
        this.service = temp!
        this.service.name = accessory.context.device[this.uniq_id].name
        this.service.displayName = accessory.context.device[this.uniq_id].name
        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name)!
        this.service.subtype = this.uuid
      }
    }
    this.service = this.service || this.accessory.addService(this.platform.Service.Outlet, accessory.context.device[this.uniq_id].name, this.uuid)
    this.service.setCharacteristic(this.platform.Characteristic.ConfiguredName, accessory.context.device[this.uniq_id].name)

    this.service.setPrimaryService(true)
    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    if (!this.service.displayName) {
      this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name)
    }

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    this.characteristic = this.service.getCharacteristic(this.platform.Characteristic.On)

    this.enableFakegato()

    // register handlers for the On/Off Characteristic

    if (this.service.getCharacteristic(this.platform.Characteristic.On).listenerCount('set') < 1) {
      this.service.getCharacteristic(this.platform.Characteristic.On)
        .on('set', this.setOn.bind(this)) // SET - bind to the `setOn` method below
      // .on('get', this.getOn.bind(this));               // GET - bind to the `getOn` method below
    }
    this.enableStatus()
  }

  /**
   * Handle "STATE" messages from Tasmotastat_t:
   * These are sent when the device's state is changed, either via HomeKit, Local Control or Other control methods.
   */

  statusUpdate(topic, message) {
    debug('MQTT', topic, message.toString())

    try {
      this.accessory.context.timeout = this.platform.autoCleanup(this.accessory)
      let value = message.toString()

      if (this.accessory.context.device[this.uniq_id].val_tpl) {
        value = this.parseValue(this.accessory.context.device[this.uniq_id].val_tpl, value)
      }

      if (typeof this.accessory.context.device[this.uniq_id].pl_on === 'boolean') {
        value = isTrue(value)
      } else {
        value = (value === this.accessory.context.device[this.uniq_id].pl_on)
      }

      if (this.characteristic.value !== value) {
        this.platform.log.info('Updating \'%s:%s\' to %s', this.service.displayName, this.characteristic.displayName, value)

        if (this.platform.config.history && this.accessory.context.fakegatoService?.addEntry) {
          debug('Updating fakegato \'%s:%s\'', this.service.displayName, this.characteristic.displayName, {
            status: (value ? 1 : 0),
          })
          this.accessory.context.fakegatoService.appendData({
            status: (value ? 1 : 0),
          })
        } else {
          debug('Not updating fakegato \'%s:%s\'', this.service.displayName, this.characteristic.displayName)
        }
      } else {
        this.platform.log.debug('Updating \'%s\' to %s', this.service.displayName, value)
      }

      this.characteristic.updateValue(value)
    } catch (err) {
      debug('ERROR:', err.message)
      this.platform.log.error('ERROR: message parsing error', this.service.displayName, topic, message.toString())
    }
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    try {
      this.platform.log.info('%s Set Characteristic On ->', this.service.displayName, value)

      if (typeof this.accessory.context.device[this.uniq_id].pl_on === 'boolean') {
        this.accessory.context.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].cmd_t, (value
          ? 'true'
          : 'false'))
      } else {
        this.accessory.context.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].cmd_t, (value
          ? this.accessory.context.device[this.uniq_id].pl_on
          : this.accessory.context.device[this.uniq_id].pl_off))
      }

      if (this.platform.config.history && this.accessory.context.fakegatoService?.addEntry) {
        debug('Updating fakegato', this.service.displayName, {
          status: (value ? 1 : 0),
        })
        this.accessory.context.fakegatoService.appendData({
          status: (value ? 1 : 0),
        })
      } else {
        // debug('Not updating fakegato', this.service.displayName);
      }
    } catch (err) {
      this.platform.log.error('ERROR:', err.message)
    }
    // you must call the callback function
    callback(null)
  }
}

/*
discovery message is published to homeassistant /switch/Office-OfficeLight/switch/config with a value of

{ "payload_off": false,
"payload_on": true,
"value_template": "{{ value_json.value }}",
"command_topic": "zwave/Office/3/37/1/0/set",
"state_topic": "zwave/Office/3/37/1/0",
"device": { "identifiers": ["zwave2mqtt_0xc9fcc1ac_node3"],
"manufacturer": "Honeywell", "model": "39348 / ZW4008 In-Wall Smart Switch (0x3135)", "name": "Office-OfficeLight", "sw_version": "5.53" },
"name": "Office-OfficeLight_switch",
"unique_id": "zwave2mqtt_0xc9fcc1ac_3-37-1-0" }

state_topic's value is

{ "value_id": "3-37-1-0",
"node_id": 3, "class_id": 37,
"type": "bool", "genre": "user",
"instance": 1,
"index": 0,
"label": "Switch",
"units": "",
"help": "Turn On/Off Device",
"read_only": false,
"write_only": false,
"min": 0,
"max": 0,
"is_polled": false,
"value": true,
"lastUpdate": 1612302355145 }

command_topic's value is True or False
although I just tested and you can use ON and OFF for the command topic as well, that's just what HA sends
and false and true work as well

*/
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
