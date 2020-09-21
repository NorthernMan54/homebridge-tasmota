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
  private update: ChangeHSB;

  constructor(
    private readonly platform: tasmotaPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly uniq_id: string,
  ) {

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory

    const uuid = this.platform.api.hap.uuid.generate(accessory.context.device[this.uniq_id].uniq_id);
    this.service = this.accessory.getService(uuid) || this.accessory.addService(this.platform.Service.Lightbulb, accessory.context.device[this.uniq_id].name, uuid);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);

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

    // Does the lightbulb include a RGB characteristic

    if (accessory.context.device[this.uniq_id].rgb_cmd_t) {

      this.update = new ChangeHSB(accessory, this);

      (this.service.getCharacteristic(this.platform.Characteristic.Hue) || this.service.addCharacteristic(this.platform.Characteristic.Hue))
        .on('set', this.setHue.bind(this));
      (this.service.getCharacteristic(this.platform.Characteristic.Saturation) || this.service.addCharacteristic(this.platform.Characteristic.Saturation))
        .on('set', this.setSaturation.bind(this));
    }

    nunjucks.installJinjaCompat();
    nunjucks.configure({
      autoescape: true,
    });

    this.refresh();
  }

  refresh() {
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

    this.accessory.context.timeout = this.platform.autoCleanup(this.accessory);

    const interim = {
      value_json: JSON.parse(message.toString()),
    };

    // Update On / Off status

    if (this.service.getCharacteristic(this.platform.Characteristic.On).value !== (nunjucks.renderString(this.accessory.context.device[this.uniq_id].val_tpl, interim) === this.accessory.context.device[this.uniq_id].pl_on ? true : false)) {

      // Use debug logging for no change updates, and info when a change occurred

      this.platform.log.info('Updating \'%s\' to %s', this.accessory.displayName, nunjucks.renderString(this.accessory.context.device[this.uniq_id].val_tpl, interim));

    } else {
      this.platform.log.debug('Updating \'%s\' to %s', this.accessory.displayName, nunjucks.renderString(this.accessory.context.device[this.uniq_id].val_tpl, interim));
    }
    this.service.getCharacteristic(this.platform.Characteristic.On).updateValue((nunjucks.renderString(this.accessory.context.device[this.uniq_id].val_tpl, interim) === this.accessory.context.device[this.uniq_id].pl_on ? true : false));

    // Update brightness if supported

    if (this.accessory.context.device[this.uniq_id].bri_val_tpl) {

      // Use debug logging for no change updates, and info when a change occurred

      if (this.service.getCharacteristic(this.platform.Characteristic.Brightness).value != nunjucks.renderString(this.accessory.context.device[this.uniq_id].bri_val_tpl, interim)) {
        this.platform.log.info('Updating \'%s\' Brightness to %s', this.accessory.displayName, nunjucks.renderString(this.accessory.context.device[this.uniq_id].bri_val_tpl, interim));
      } else {
        this.platform.log.debug('Updating \'%s\' Brightness to %s', this.accessory.displayName, nunjucks.renderString(this.accessory.context.device[this.uniq_id].bri_val_tpl, interim));
      }

      this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(nunjucks.renderString(this.accessory.context.device[this.uniq_id].bri_val_tpl, interim));
    }

    // Update color temperature if supported

    if (this.accessory.context.device[this.uniq_id].clr_temp_cmd_t) {

      // Use debug logging for no change updates, and info when a change occurred

      if (this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature).value != nunjucks.renderString(this.accessory.context.device[this.uniq_id].clr_temp_val_tpl, interim)) {

        this.platform.log.info('Updating \'%s\' ColorTemperature to %s', this.accessory.displayName, nunjucks.renderString(this.accessory.context.device[this.uniq_id].clr_temp_val_tpl, interim));
      } else {
        this.platform.log.debug('Updating \'%s\' ColorTemperature to %s', this.accessory.displayName, nunjucks.renderString(this.accessory.context.device[this.uniq_id].clr_temp_val_tpl, interim));
      }

      this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature).updateValue(nunjucks.renderString(this.accessory.context.device[this.uniq_id].clr_temp_val_tpl, interim));
    }

    // Update color settings

    if (this.accessory.context.device[this.uniq_id].rgb_stat_t) {


      debug('RGB->HSL RGB(%s,%s,%s) HSB(%s) From Tasmota HSB(%s)', nunjucks.renderString(this.accessory.context.device[this.uniq_id].rgb_val_tpl, interim).split(',')[0], nunjucks.renderString(this.accessory.context.device[this.uniq_id].rgb_val_tpl, interim).split(',')[1], nunjucks.renderString(this.accessory.context.device[this.uniq_id].rgb_val_tpl, interim).split(',')[2], rgb2hsv(nunjucks.renderString(this.accessory.context.device[this.uniq_id].rgb_val_tpl, interim).split(',')[0], nunjucks.renderString(this.accessory.context.device[this.uniq_id].rgb_val_tpl, interim).split(',')[1], nunjucks.renderString(this.accessory.context.device[this.uniq_id].rgb_val_tpl, interim).split(',')[2]), JSON.parse(message.toString()).HSBColor);

      const hsb = rgb2hsv(nunjucks.renderString(this.accessory.context.device[this.uniq_id].rgb_val_tpl, interim).split(',')[0], nunjucks.renderString(this.accessory.context.device[this.uniq_id].rgb_val_tpl, interim).split(',')[1], nunjucks.renderString(this.accessory.context.device[this.uniq_id].rgb_val_tpl, interim).split(',')[2]);


      // Use debug logging for no change updates, and info when a change occurred

      if (this.service.getCharacteristic(this.platform.Characteristic.Hue).value != hsb.h) {
        this.platform.log.info('Updating \'%s\' Hue to %s', this.accessory.displayName, hsb.h);
      } else {
        this.platform.log.debug('Updating \'%s\' Hue to %s', this.accessory.displayName, hsb.h);
      }

      if (this.service.getCharacteristic(this.platform.Characteristic.Saturation).value != hsb.s) {
        this.platform.log.info('Updating \'%s\' Saturation to %s', this.accessory.displayName, hsb.s);
      } else {
        this.platform.log.debug('Updating \'%s\' Saturation to %s', this.accessory.displayName, hsb.s);
      }

      this.service.getCharacteristic(this.platform.Characteristic.Hue).updateValue(hsb.h);
      this.service.getCharacteristic(this.platform.Characteristic.Saturation).updateValue(hsb.s);

    }


  }

  /**
   * Handle "LWT" Last Will and Testament messages from Tasmota
   * These are sent when the device is no longer available from the MQTT server.
   */

  availabilityUpdate(topic, message) {
    this.platform.log.info('Marking light accessory \'%s\' to %s', this.service.displayName, message);
    const availability = (message.toString() === this.accessory.context.device[this.uniq_id].pl_not_avail ? new Error(this.accessory.displayName + ' ' + message.toString()) : 0);

    this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(availability);
  }

  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.info('%s Set Characteristic On ->', this.accessory.displayName, value);

    this.accessory.context.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].cmd_t, (value ? this.accessory.context.device[this.uniq_id].pl_on : this.accessory.context.device[this.uniq_id].pl_off));
    callback(null);
  }

  setBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.info('%s Set Characteristic Brightness ->', this.accessory.displayName, value);
    this.accessory.context.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].bri_cmd_t, value.toString());
    callback(null);
  }

  setHue(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.info('%s Set Characteristic Hue ->', this.accessory.displayName, value);
    this.update.put({
      Hue: value,
    }).then(() => {
      // debug("setTargetTemperature", this, thermostat);
      callback(null);
    }).catch((error) => {
      callback(error);
    });
  }

  setSaturation(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.info('%s Set Characteristic Saturation ->', this.accessory.displayName, value);
    this.update.put({
      Saturation: value,
    }).then(() => {
      // debug("setTargetTemperature", this, thermostat);
      callback(null, value);
    }).catch((error) => {
      callback(error);
    });
  }

  setColorTemperature(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.info('%s Set Characteristic ColorTemperature ->', this.accessory.displayName, value);
    this.accessory.context.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].clr_temp_cmd_t, value.toString());
    callback(null);
  }

}



// Consolidate update requests received over 100ms into a single update

class ChangeHSB {
  private desiredState: Record<string, unknown>;
  private deferrals;
  private waitTimeUpdate: number;
  private timeout: NodeJS.Timeout | null ;
  private accessory: PlatformAccessory;
  private readonly uniq_id: string;

  constructor(accessory, that,

  ) {
    debug('ChangeHSB', this);
    this.accessory = accessory;
    this.uniq_id = that.uniq_id;
    this.desiredState = {};
    this.deferrals = [];
    this.waitTimeUpdate = 100; // wait 100ms before processing change
    this.timeout = null;

  }

  put(state) {
    return new Promise((resolve, reject) => {
      for (const key in state) {
        this.desiredState[key] = state[key];
      }
      const d = {
        resolve: resolve,
        reject: reject,
      };
      this.deferrals.push(d);

      if (!this.timeout) {
        this.timeout = setTimeout(() => {
          debug('put start', this.desiredState);
          debug('HSL->RGB', hsl2rgb(this.desiredState.Hue, this.desiredState.Saturation, 50).toString());

          this.accessory.context.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].rgb_cmd_t, hsl2rgb(this.desiredState.Hue, this.desiredState.Saturation, 50).toString());

          for (const d of this.deferrals) {
            d.resolve();
          }

          this.desiredState = {};
          this.deferrals = [];
          this.timeout = null;

        }, this.waitTimeUpdate);
      }

    });
  }
}

// Color conversion functions

function rgb2hsv (r, g, b) {
  let rr, gg, bb, h, s, v, diff;
  const rabs = r / 255;
  const gabs = g / 255;
  const babs = b / 255;
  v = Math.max(rabs, gabs, babs),
  diff = v - Math.min(rabs, gabs, babs);
  const diffc = c => (v - c) / 6 / diff + 1 / 2;
  //    percentRoundFn = num => Math.round(num * 100) / 100;
  const percentRoundFn = num => Math.round(num);
  if (diff == 0) {
    h = s = 0;
  } else {
    s = diff / v;
    rr = diffc(rabs);
    gg = diffc(gabs);
    bb = diffc(babs);

    if (rabs === v) {
      h = bb - gg;
    } else if (gabs === v) {
      h = (1 / 3) + rr - bb;
    } else if (babs === v) {
      h = (2 / 3) + gg - rr;
    }
    if (h < 0) {
      h += 1;
    }else if (h > 1) {
      h -= 1;
    }
  }
  return {
    h: Math.round(h * 360),
    s: percentRoundFn(s * 100),
    v: percentRoundFn(v * 100),
  };
}

function hsl2rgb(h1, s1, l1) {
  const h = h1 / 360;
  const s = s1 / 100;
  const l = l1 / 100;
  let t2;
  let t3;
  let val;

  if (s === 0) {
    val = l * 255;
    return [val, val, val];
  }

  if (l < 0.5) {
    t2 = l * (1 + s);
  } else {
    t2 = l + s - l * s;
  }

  const t1 = 2 * l - t2;

  const rgb = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    t3 = h + 1 / 3 * -(i - 1);
    if (t3 < 0) {
      t3++;
    }

    if (t3 > 1) {
      t3--;
    }

    if (6 * t3 < 1) {
      val = t1 + (t2 - t1) * 6 * t3;
    } else if (2 * t3 < 1) {
      val = t2;
    } else if (3 * t3 < 2) {
      val = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
    } else {
      val = t1;
    }

    rgb[i] = Math.round(val * 255);
  }

  return rgb;
}

/*

// RGB Led Strip

{ "name": "Tasmota",
  "cmd_t": "~cmnd/POWER",
  "stat_t": "~tele/STATE",
  "val_tpl": "{{value_json.POWER}}",
  "pl_off": "OFF",
  "pl_on": "ON",
  "avty_t": "~tele/LWT",
  "pl_avail": "Online",
  "pl_not_avail": "Offline",
  "uniq_id": "DC4492_LI_1",
  "device": { "identifiers": ["DC4492"], "connections": [["mac", "5C:CF:7F:DC:44:92"]] },
  "~": "tasmota/",

  "bri_cmd_t": "~cmnd/Dimmer",
  "bri_stat_t": "~tele/STATE",
  "bri_scl": 100,
  "on_cmd_type": "brightness",
  "bri_val_tpl": "{{value_json.Dimmer}}",

  "rgb_cmd_t": "~cmnd/Color2",
  "rgb_stat_t": "~tele/STATE",
  "rgb_val_tpl": "{{value_json.Color.split(',')[0:3]|join(',')}}",

  "fx_cmd_t": "~cmnd/Scheme",
  "fx_stat_t": "~tele/STATE",
  "fx_val_tpl": "{{value_json.Scheme}}",
  "fx_list": ["0", "1", "2", "3", "4"]
}

*/





/*

Tuya Dimmer HA Discover message

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
