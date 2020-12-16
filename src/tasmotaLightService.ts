import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, Characteristic } from 'homebridge';
import { TasmotaService } from './TasmotaService';
import { tasmotaPlatform } from './platform';
import os from 'os';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';

import createDebug from 'debug';
const debug = createDebug('Tasmota:light');

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */

export class tasmotaLightService extends TasmotaService {
  private update: ChangeHSB;
  private TVservice;

  constructor(
    public readonly platform: tasmotaPlatform,
    public readonly accessory: PlatformAccessory,
    protected readonly uniq_id: string,
  ) {

    super(platform, accessory, uniq_id);

    this.service = this.accessory.getService(this.uuid) || this.accessory.addService(this.platform.Service.Lightbulb, accessory.context.device[this.uniq_id].name, this.uuid);

    if (!this.service.displayName) {
      this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);
    }

    if (this.service.getCharacteristic(this.platform.Characteristic.On).listenerCount('set') < 1) {
      this.characteristic = this.service.getCharacteristic(this.platform.Characteristic.On)
        .on('set', this.setOn.bind(this));                // SET - bind to the `setOn` method below
      // .on('get', this.getOn.bind(this));               // GET - bind to the `getOn` method below

      debug('Creating statusUpdate listener for', accessory.context.device[this.uniq_id].stat_t);
      this.statusSubscribe = { event: accessory.context.device[this.uniq_id].stat_t, callback: this.statusUpdate.bind(this) };
      accessory.context.mqttHost.on(accessory.context.device[this.uniq_id].stat_t, this.statusUpdate.bind(this));
      accessory.context.mqttHost.statusSubscribe(accessory.context.device[this.uniq_id].stat_t);

      this.availabilitySubscribe = { event: accessory.context.device[this.uniq_id].avty_t, callback: this.availabilityUpdate.bind(this) };
      accessory.context.mqttHost.on(accessory.context.device[this.uniq_id].avty_t, this.availabilityUpdate.bind(this));
      accessory.context.mqttHost.availabilitySubscribe(accessory.context.device[this.uniq_id].avty_t);
    }

    // Does the lightbulb include a brightness characteristic

    if (accessory.context.device[this.uniq_id].bri_cmd_t) {
      (this.service.getCharacteristic(this.platform.Characteristic.Brightness) || this.service.addCharacteristic(this.platform.Characteristic.Brightness))
        .on('set', this.setBrightness.bind(this));
    }

    // Does the lightbulb include a RGB characteristic

    if (accessory.context.device[this.uniq_id].rgb_cmd_t) {

      this.update = new ChangeHSB(accessory, this);

      (this.service.getCharacteristic(this.platform.Characteristic.Hue) || this.service.addCharacteristic(this.platform.Characteristic.Hue))
        .on('set', this.setHue.bind(this));
      (this.service.getCharacteristic(this.platform.Characteristic.Saturation) || this.service.addCharacteristic(this.platform.Characteristic.Saturation))
        .on('set', this.setSaturation.bind(this));
    }

    // Does the lightbulb include a colour temperature characteristic

    if (accessory.context.device[this.uniq_id].clr_temp_cmd_t) {
      (this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature) || this.service.addCharacteristic(this.platform.Characteristic.ColorTemperature))
        .on('set', this.setColorTemperature.bind(this));
    }

    // Does the lightbulb include an effects characteristic and is effects enabled

    if (this.platform.config.effects && accessory.context.device[this.uniq_id].fx_cmd_t) {

      const uuid = this.platform.api.hap.uuid.generate(this.uniq_id + os.hostname());

      // debug('api', this.platform.api);
      const effectsAccessory = new this.platform.api.platformAccessory(this.accessory.displayName, uuid, this.platform.api.hap.Categories.AUDIO_RECEIVER);

      effectsAccessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Name, this.accessory.displayName)
        .setCharacteristic(this.platform.Characteristic.Manufacturer, (accessory.context.device[this.uniq_id].dev.mf ?? 'undefined').replace(/[^-_ a-zA-Z0-9]/gi, ''))
        .setCharacteristic(this.platform.Characteristic.Model, (accessory.context.device[this.uniq_id].dev.mdl ?? 'undefined').replace(/[^-_ a-zA-Z0-9]/gi, ''))
        .setCharacteristic(this.platform.Characteristic.FirmwareRevision, (accessory.context.device[this.uniq_id].dev.sw ?? 'undefined').replace(/[^-_. a-zA-Z0-9]/gi, ''))
        .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device[this.uniq_id].dev.ids[0] + '-' + os.hostname()); // A unique fakegato ID

      this.TVservice = effectsAccessory.getService(this.platform.Service.Television) || effectsAccessory.addService(this.platform.Service.Television);

      if (!this.TVservice.displayName) {
        this.TVservice.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);
      }

      this.TVservice.getCharacteristic(this.platform.Characteristic.Active)
        .on('set', this.setOn.bind(this));

      this.TVservice.getCharacteristic(this.platform.Characteristic.ActiveIdentifier)
        .on('set', this.setActiveIdentifier.bind(this));

      this.TVservice.getCharacteristic(this.platform.Characteristic.ConfiguredName)
        .on('set', this.setConfiguredName.bind(this));

      // Tasmota effects schemes for ws2812 lights

      const schemes: { name: string, id: number, TVinput?: any }[] = [{ name: 'None', id: 0 },
        { name: 'Wakeup', id: 1 },
        { name: 'Cycle Up', id: 2 },
        { name: 'Cycle Down', id: 3 },
        { name: 'Random', id: 4 },
        { name: 'Clock', id: 5 },
        { name: 'Candlelight', id: 6 },
        { name: 'RGB', id: 7 },
        { name: 'Christmas', id: 8 },
        { name: 'Hanukkah', id: 9 },
        { name: 'Kwanzaa', id: 10 },
        { name: 'Rainbow', id: 11 },
        { name: 'Fire', id: 12 }];

      for (const element of schemes) {
        debug('element', element);
        element.TVinput = effectsAccessory.getService(element.name) || effectsAccessory.addService(this.platform.Service.InputSource, element.name, element.name);

        element.TVinput.getCharacteristic(this.platform.Characteristic.IsConfigured)
          .updateValue(1);

        element.TVinput.getCharacteristic(this.platform.Characteristic.CurrentVisibilityState)
          .updateValue(0);

        element.TVinput.getCharacteristic(this.platform.Characteristic.Identifier)
          .updateValue(element.id);                        // Required

        this.TVservice.addLinkedService(element.TVinput);
      }

      this.platform.api.publishExternalAccessories(PLUGIN_NAME, [effectsAccessory]);
    }

    this.enableStatus();
  }

  setActiveIdentifier(value, callback) {
    this.platform.log.info('%s Set Effects Scheme ->', this.accessory.displayName, value);
    try {
      this.accessory.context.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].fx_cmd_t, value.toString());
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  setConfiguredName(value, callback) {
    this.platform.log.info('setConfiguredName', value);
    callback(null);
  }

  /**
   * Handle "STATE" messages from Tasmotastat_t:
   * These are sent when the device's state is changed, either via HomeKit, Local Control or Other control methods.
   */

  statusUpdate(topic, message) {
    debug('statusUpdate', topic, message.toString());

    this.accessory.context.timeout = this.platform.autoCleanup(this.accessory);

    try {
      const value = this.parseValue(this.accessory.context.device[this.uniq_id].val_tpl, {
        value_json: JSON.parse(message.toString()),
      });

      if (this.service.getCharacteristic(this.platform.Characteristic.On).value !== (value === this.accessory.context.device[this.uniq_id].pl_on ? true : false)) {

        // Use debug logging for no change updates, and info when a change occurred

        this.platform.log.info('Updating \'%s\' to %s', this.accessory.displayName, value);

      } else {
        this.platform.log.debug('Updating \'%s\' to %s', this.accessory.displayName, value);
      }
      this.service.getCharacteristic(this.platform.Characteristic.On).updateValue((value === this.accessory.context.device[this.uniq_id].pl_on ? true : false));

      // Update brightness if supported

      if (this.accessory.context.device[this.uniq_id].bri_val_tpl) {

        // Use debug logging for no change updates, and info when a change occurred
        const bri_val = this.parseValue(this.accessory.context.device[this.uniq_id].bri_val_tpl, {
          value_json: JSON.parse(message.toString()),
        });

        if (this.service.getCharacteristic(this.platform.Characteristic.Brightness).value != bri_val) {
          this.platform.log.info('Updating \'%s\' Brightness to %s', this.accessory.displayName, bri_val);
        } else {
          this.platform.log.debug('Updating \'%s\' Brightness to %s', this.accessory.displayName, bri_val);
        }

        this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(bri_val);
      }

      // Update color settings

      if (this.accessory.context.device[this.uniq_id].rgb_stat_t) {

        debug('RGB->HSL RGB(%s,%s,%s) HSB(%s) From Tasmota HSB(%s)', this.parseValue(this.accessory.context.device[this.uniq_id].rgb_val_tpl, { value_json: JSON.parse(message.toString()) }).split(',')[0], this.parseValue(this.accessory.context.device[this.uniq_id].rgb_val_tpl, { value_json: JSON.parse(message.toString()) }).split(',')[1], this.parseValue(this.accessory.context.device[this.uniq_id].rgb_val_tpl, { value_json: JSON.parse(message.toString()) }).split(',')[2], RGBtoScaledHSV(this.parseValue(this.accessory.context.device[this.uniq_id].rgb_val_tpl, { value_json: JSON.parse(message.toString()) }).split(',')[0], this.parseValue(this.accessory.context.device[this.uniq_id].rgb_val_tpl, { value_json: JSON.parse(message.toString()) }).split(',')[1], this.parseValue(this.accessory.context.device[this.uniq_id].rgb_val_tpl, { value_json: JSON.parse(message.toString()) }).split(',')[2]), JSON.parse(message.toString()).HSBColor);

        const hsb = RGBtoScaledHSV(this.parseValue(this.accessory.context.device[this.uniq_id].rgb_val_tpl, { value_json: JSON.parse(message.toString()) }).split(',')[0], this.parseValue(this.accessory.context.device[this.uniq_id].rgb_val_tpl, { value_json: JSON.parse(message.toString()) }).split(',')[1], this.parseValue(this.accessory.context.device[this.uniq_id].rgb_val_tpl, { value_json: JSON.parse(message.toString()) }).split(',')[2]);


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

      // Update color temperature if supported

      if (this.accessory.context.device[this.uniq_id].clr_temp_cmd_t) {

        // Use debug logging for no change updates, and info when a change occurred

        const clr_temp = this.parseValue(this.accessory.context.device[this.uniq_id].clr_temp_val_tpl, {
          value_json: JSON.parse(message.toString()),
        });

        if (this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature).value != clr_temp) {

          this.platform.log.info('Updating \'%s\' ColorTemperature to %s', this.accessory.displayName, clr_temp);
        } else {
          this.platform.log.debug('Updating \'%s\' ColorTemperature to %s', this.accessory.displayName, clr_temp);
        }

        this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature).updateValue(clr_temp);
      }

      // RGB Lights that support effects

      if (this.platform.config.effects && this.accessory.context.device[this.uniq_id].fx_cmd_t) {

        this.TVservice.getCharacteristic(this.platform.Characteristic.Active).updateValue((value === this.accessory.context.device[this.uniq_id].pl_on ? 1 : 0));

        const effects = this.parseValue(this.accessory.context.device[this.uniq_id].fx_val_tpl, {
          value_json: JSON.parse(message.toString()),
        });

        if (this.TVservice.getCharacteristic(this.platform.Characteristic.ActiveIdentifier).value != effects) {

          this.platform.log.info('Updating \'%s\' Effects Scheme to %s', this.accessory.displayName, effects);
        } else {
          this.platform.log.debug('Updating \'%s\' Effects Scheme to %s', this.accessory.displayName, effects);
        }

        this.TVservice.getCharacteristic(this.platform.Characteristic.ActiveIdentifier).updateValue(effects);

      }


    } catch (err) {
      this.platform.log.error('ERROR: Message Parse Error', topic, message.toString(), err.message);
    }
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
      oldHue: this.service.getCharacteristic(this.platform.Characteristic.Hue).value,
      oldSaturation: this.service.getCharacteristic(this.platform.Characteristic.Saturation).value,
      newHue: value,
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
      oldHue: this.service.getCharacteristic(this.platform.Characteristic.Hue).value,
      oldSaturation: this.service.getCharacteristic(this.platform.Characteristic.Saturation).value,
      newSaturation: value,
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
  private timeout: NodeJS.Timeout | null;
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
          debug('put start %s', this.desiredState);
          debug('HSL->RGB', ScaledHSVtoRGB(this.desiredState ?.newHue ?? this.desiredState ?.oldHue, this.desiredState ?.newSaturation ?? this.desiredState ?.oldSaturation, 50).toString());

          this.accessory.context.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].rgb_cmd_t, ScaledHSVtoRGB(this.desiredState ?.newHue ?? this.desiredState ?.oldHue, this.desiredState ?.newSaturation ?? this.desiredState ?.oldSaturation, 50).toString());

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

/*
    * HSV to RGB conversion from https://stackoverflow.com/questions/17242144/javascript-convert-hsb-hsv-color-to-rgb-accurately
    * accepts parameters
    * h  Object = {h:x, s:y, v:z}
    * OR
    * h, s, v
    */
function HSVtoRGB(h, s, v) {
  let r, g, b;
  if (arguments.length === 1) {
    s = h.s, v = h.v, h = h.h;
  }
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }

  const rgb = [0, 0, 0];
  rgb[0] = Math.round(r * 255);
  rgb[1] = Math.round(g * 255);
  rgb[2] = Math.round(b * 255);
  return (
    rgb
  );
}

function ScaledHSVtoRGB(h, s, v) {
  return HSVtoRGB(h / 360, s / 100, v / 100);
}

/* accepts parameters
 * r  Object = {r:x, g:y, b:z}
 * OR
 * r, g, b
 */
function RGBtoHSV(r, g, b) {
  // debug('from', r, g, b);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h;
  const s = (max === 0 ? 0 : d / max);
  const v = max / 255;
  // debug('max', )
  switch (max) {
    case min: h = 0; break;
    case r: h = (g - b) + d * (g < b ? 6 : 0); h /= 6 * d; break;
    case g: h = (b - r) + d * 2; h /= 6 * d; break;
    case b: h = (r - g) + d * 4; h /= 6 * d; break;
  }

  return {
    h: h,
    s: s,
    v: v,
  };
}

function RGBtoScaledHSV(r, g, b) {
  const hsv = RGBtoHSV(parseFloat(r), parseFloat(g), parseFloat(b));
  // debug('to', hsv);
  return {
    h: Math.round(hsv.h * 360),
    s: Math.round(hsv.s * 100),
    v: Math.round(hsv.v * 100),
  };
}

// Color conversion functions

function rgb2hsv(r, g, b) {
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
    } else if (h > 1) {
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
