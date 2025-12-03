import createDebug from 'debug';
import { CharacteristicSetCallback, CharacteristicValue, PlatformAccessory } from 'homebridge';
import os from 'node:os';
import { TasmotaService } from './TasmotaService.js';
import { PLUGIN_NAME } from './settings.js';
import { tasmotaPlatform } from './tasmotaPlatform.js';
import { HSBtoTasmota, RGBtoScaledHSV, ScaledHSVtoRGB } from './utils.js';

const debug = createDebug('Tasmota:light');

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */


export class tasmotaLightService extends TasmotaService {
  private update?: ChangeHSB;
  private TVservice;

  constructor(
    public readonly platform: tasmotaPlatform,
    public readonly accessory: PlatformAccessory,
    protected readonly uniq_id: string,
  ) {
    super(platform, accessory, uniq_id);

    this.service = this.accessory.getService(this.uuid) || this.accessory.addService(this.platform.Service.Lightbulb,
      accessory.context.device[this.uniq_id].name, this.uuid);
    this.service?.setCharacteristic(this.platform.Characteristic.ConfiguredName, accessory.context.device[this.uniq_id].name);

    if (!this.service?.displayName) {
      this.service?.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device[this.uniq_id].name);
    }

    if (this.service?.getCharacteristic(this.platform.Characteristic.On).listenerCount('set') < 1) {
      this.characteristic = this.service?.getCharacteristic(this.platform.Characteristic.On)
        .on('set', this.setOn.bind(this)); // SET - bind to the `setOn` method below
      // .on('get', this.getOn.bind(this));               // GET - bind to the `getOn` method below

      if (accessory.context.device[this.uniq_id].stat_t) {
        debug('Creating statusUpdate listener for', accessory.context.device[this.uniq_id].stat_t);
        this.statusSubscribe = { event: accessory.context.device[this.uniq_id].stat_t, callback: this.statusUpdate.bind(this) };
        this.platform.mqttHost.on(accessory.context.device[this.uniq_id].stat_t, this.statusUpdate.bind(this));
        this.platform.mqttHost.statusSubscribe(accessory.context.device[this.uniq_id].stat_t);
      }

      if (accessory.context.device[this.uniq_id].avty_t) {
        this.availabilitySubscribe = {
          event: accessory.context.device[this.uniq_id].avty_t,
          callback:
            this.availabilityUpdate.bind(this),
        };
        this.platform.mqttHost.on(accessory.context.device[this.uniq_id].avty_t, this.availabilityUpdate.bind(this));
        this.platform.mqttHost.availabilitySubscribe(accessory.context.device[this.uniq_id].avty_t);
      }
    }

    // Does the lightbulb include a brightness characteristic

    if (accessory.context.device[this.uniq_id].bri_cmd_t) {
      (this.service.getCharacteristic(this.platform.Characteristic.Brightness)
        || this.service.addCharacteristic(this.platform.Characteristic.Brightness))
        .on('set', this.setBrightness.bind(this));
    }

    // Does the lightbulb include a RGB characteristic

    if (accessory.context.device[this.uniq_id].rgb_cmd_t) {
      this.update = new ChangeHSB(accessory, this);

      (this.service.getCharacteristic(this.platform.Characteristic.Hue)
        || this.service.addCharacteristic(this.platform.Characteristic.Hue))
        .on('set', this.setHue.bind(this));
      (this.service.getCharacteristic(this.platform.Characteristic.Saturation)
        || this.service.addCharacteristic(this.platform.Characteristic.Saturation))
        .on('set', this.setSaturation.bind(this));
    }

    // Does the lightbulb include a HSB characteristic ( Tasmota 10.x.x + )

    if (accessory.context.device[this.uniq_id].hs_cmd_t) {
      this.update = new ChangeHSB(accessory, this);

      (this.service.getCharacteristic(this.platform.Characteristic.Hue)
        || this.service.addCharacteristic(this.platform.Characteristic.Hue))
        .on('set', this.setHue.bind(this));
      (this.service.getCharacteristic(this.platform.Characteristic.Saturation)
        || this.service.addCharacteristic(this.platform.Characteristic.Saturation))
        .on('set', this.setSaturation.bind(this));
    }

    // Does the lightbulb include a colour temperature characteristic

    if (accessory.context.device[this.uniq_id].clr_temp_cmd_t) {
      (this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature)
        || this.service.addCharacteristic(this.platform.Characteristic.ColorTemperature))
        .on('set', this.setColorTemperature.bind(this));
    }

    // Does the lightbulb include an effects characteristic and is effects enabled

    if (this.platform.config.effects && accessory.context.device[this.uniq_id].fx_cmd_t) {
      const uuid = this.platform.api.hap.uuid.generate(this.uniq_id + os.hostname());

      // debug('api', this.platform.api);
      const effectsAccessory = new this.platform.api.platformAccessory(this.accessory.displayName, uuid, this.platform.api.hap.Categories.AUDIO_RECEIVER);

      effectsAccessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Name, this.accessory.displayName)
        .setCharacteristic(this.platform.Characteristic.Manufacturer, (accessory.context.device[this.uniq_id].dev.mf
          ?? 'undefined').replace(/[^-\w ]/g, ''))
        .setCharacteristic(this.platform.Characteristic.Model, (accessory.context.device[this.uniq_id].dev.mdl
          ?? 'undefined').replace(/[^-\w ]/g, ''))
        .setCharacteristic(this.platform.Characteristic.FirmwareRevision, (accessory.context.device[this.uniq_id].dev.sw
          ?? 'undefined').replace(/[^-\w. ]/g, ''))
        .setCharacteristic(this.platform.Characteristic.SerialNumber, `${accessory.context.device[this.uniq_id].dev.ids[0]
        }-${os.hostname()}`); // A unique fakegato ID

      this.TVservice = effectsAccessory.getService(this.platform.Service.Television)
        || effectsAccessory.addService(this.platform.Service.Television);

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


      const schemes: { name: string, id: number, TVinput?: any }[] = [{ name: 'None', id: 0 }, { name: 'Wakeup', id: 1 },
        { name: 'Cycle Up', id: 2 }, { name: 'Cycle Down', id: 3 }, { name: 'Random', id: 4 }, { name: 'Clock', id: 5 },
        { name: 'Candlelight', id: 6 }, { name: 'RGB', id: 7 }, { name: 'Christmas', id: 8 }, { name: 'Hanukkah', id: 9 },
        { name: 'Kwanzaa', id: 10 }, { name: 'Rainbow', id: 11 }, { name: 'Fire', id: 12 }];

      for (const element of schemes) {
        debug('element', element);
        element.TVinput = effectsAccessory.getService(element.name)
          || effectsAccessory.addService(this.platform.Service.InputSource, element.name, element.name);

        element.TVinput.getCharacteristic(this.platform.Characteristic.IsConfigured)
          .updateValue(1);

        element.TVinput.getCharacteristic(this.platform.Characteristic.CurrentVisibilityState)
          .updateValue(0);

        element.TVinput.getCharacteristic(this.platform.Characteristic.Identifier)
          .updateValue(element.id); // Required

        this.TVservice.addLinkedService(element.TVinput);
      }

      this.platform.api.publishExternalAccessories(PLUGIN_NAME, [effectsAccessory]);
    }

    this.enableStatus();
  }


  setActiveIdentifier(value: CharacteristicValue, callback: any) {
    this.platform.log.info('%s Set Effects Scheme ->', this.accessory.displayName, value);
    try {
      this.platform.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].fx_cmd_t, value.toString());
      callback(null);
    } catch (err: unknown) {
      this.platform.log.debug(String((err && (err as Error).message ? (err as Error).message : err)));
      callback(err);
    }
  }


  setConfiguredName(value: CharacteristicValue, callback: any) {
    this.platform.log.info('setConfiguredName', value);
    callback(null);
  }

  /**
   * Handle "STATE" messages from Tasmotastat_t:
   * These are sent when the device's state is changed, either via HomeKit, Local Control or Other control methods.
   */


  statusUpdate(topic: string, message: Buffer) {
    debug('statusUpdate', topic, message.toString());

    this.accessory.context.timeout = this.platform.autoCleanup(this.accessory);

    try {
      let value;
      if (this.accessory.context.device[this.uniq_id].stat_val_tpl) {
        value = this.parseValue(this.accessory.context.device[this.uniq_id].stat_val_tpl, message.toString());
      } else {
        value = this.parseValue(this.accessory.context.device[this.uniq_id].val_tpl, message.toString());
      }
      // debug('val_tpl', this.accessory.context.device[this.uniq_id].stat_val_tpl);
      if (this.service?.getCharacteristic(this.platform.Characteristic.On).value !== (value
        === this.accessory.context.device[this.uniq_id].pl_on)) {
        // Use debug logging for no change updates, and info when a change occurred

        this.platform.log.info('Updating \'%s\' to %s', this.accessory.displayName, value);
      } else {
        this.platform.log.debug('Updating \'%s\' to %s', this.accessory.displayName, value);
      }
      this.service?.getCharacteristic(this.platform.Characteristic.On).updateValue((value
        === this.accessory.context.device[this.uniq_id].pl_on));

      // Update brightness if supported

      if (this.accessory.context.device[this.uniq_id].bri_val_tpl) {
        // Use debug logging for no change updates, and info when a change occurred
        const bri_val = this.parseValue(this.accessory.context.device[this.uniq_id].bri_val_tpl, message.toString());

        if (this.service?.getCharacteristic(this.platform.Characteristic.Brightness).value !== bri_val) {
          this.platform.log.info('Updating \'%s\' Brightness to %s', this.accessory.displayName, bri_val);
        } else {
          this.platform.log.debug('Updating \'%s\' Brightness to %s', this.accessory.displayName, bri_val);
        }

        this.service?.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(bri_val);
      }

      // Update color settings RGB

      if (this.accessory.context.device[this.uniq_id].rgb_stat_t) {
        debug('RGB->HSL RGB(%s,%s,%s) HSB(%s) From Tasmota HSB(%s)',
          this.parseValue(this.accessory.context.device[this.uniq_id].rgb_val_tpl, message.toString()).split(',')[0],
          this.parseValue(this.accessory.context.device[this.uniq_id].rgb_val_tpl, message.toString()).split(',')[1],
          this.parseValue(this.accessory.context.device[this.uniq_id].rgb_val_tpl, message.toString()).split(',')[2],
          RGBtoScaledHSV(this.parseValue(this.accessory.context.device[this.uniq_id].rgb_val_tpl, message.toString()).split(',')[0],
            this.parseValue(this.accessory.context.device[this.uniq_id].rgb_val_tpl, message.toString()).split(',')[1],
            this.parseValue(this.accessory.context.device[this.uniq_id].rgb_val_tpl, message.toString()).split(',')[2]),
          JSON.parse(message.toString()).HSBColor);

        const hsb = RGBtoScaledHSV(this.parseValue(this.accessory.context.device[this.uniq_id].rgb_val_tpl,
          message.toString()).split(',')[0], this.parseValue(this.accessory.context.device[this.uniq_id].rgb_val_tpl,
          message.toString()).split(',')[1], this.parseValue(this.accessory.context.device[this.uniq_id].rgb_val_tpl,
          message.toString()).split(',')[2]);

        // Use debug logging for no change updates, and info when a change occurred

        if (this.service?.getCharacteristic(this.platform.Characteristic.Hue).value !== hsb.h) {
          this.platform.log.info('Updating \'%s\' Hue to %s', this.accessory.displayName, hsb.h);
        } else {
          this.platform.log.debug('Updating \'%s\' Hue to %s', this.accessory.displayName, hsb.h);
        }

        if (this.service?.getCharacteristic(this.platform.Characteristic.Saturation).value !== hsb.s) {
          this.platform.log.info('Updating \'%s\' Saturation to %s', this.accessory.displayName, hsb.s);
        } else {
          this.platform.log.debug('Updating \'%s\' Saturation to %s', this.accessory.displayName, hsb.s);
        }

        this.service?.getCharacteristic(this.platform.Characteristic.Hue).updateValue(hsb.h);
        this.service?.getCharacteristic(this.platform.Characteristic.Saturation).updateValue(hsb.s);
      }

      // Update color settings HSB

      if (this.accessory.context.device[this.uniq_id].hs_stat_t) {
        debug('HSB(%s) From Tasmota HSB(%s)', this.parseValue(this.accessory.context.device[this.uniq_id].hs_val_tpl, message.toString()),
          JSON.parse(message.toString()).HSBColor);

        // Use debug logging for no change updates, and info when a change occurred

        if (this.service?.getCharacteristic(this.platform.Characteristic.Hue).value
          !== this.parseValue(this.accessory.context.device[this.uniq_id].hs_val_tpl, message.toString()).split(',')[0]) {
          this.platform.log.info('Updating \'%s\' Hue to %s', this.accessory.displayName,
            this.parseValue(this.accessory.context.device[this.uniq_id].hs_val_tpl, message.toString()).split(',')[0]);
        } else {
          this.platform.log.debug('Updating \'%s\' Hue to %s', this.accessory.displayName,
            this.parseValue(this.accessory.context.device[this.uniq_id].hs_val_tpl, message.toString()).split(',')[0]);
        }

        if (this.service?.getCharacteristic(this.platform.Characteristic.Saturation).value
          !== this.parseValue(this.accessory.context.device[this.uniq_id].hs_val_tpl, message.toString()).split(',')[1]) {
          this.platform.log.info('Updating \'%s\' Saturation to %s', this.accessory.displayName,
            this.parseValue(this.accessory.context.device[this.uniq_id].hs_val_tpl, message.toString()).split(',')[1]);
        } else {
          this.platform.log.debug('Updating \'%s\' Saturation to %s', this.accessory.displayName,
            this.parseValue(this.accessory.context.device[this.uniq_id].hs_val_tpl, message.toString()).split(',')[1]);
        }

        this.service?.getCharacteristic(this.platform.Characteristic.Hue).updateValue(
          this.parseValue(this.accessory.context.device[this.uniq_id].hs_val_tpl, message.toString()).split(',')[0],
        );
        this.service?.getCharacteristic(this.platform.Characteristic.Saturation).updateValue(
          this.parseValue(this.accessory.context.device[this.uniq_id].hs_val_tpl, message.toString()).split(',')[1],
        );
      }

      // Update color temperature if supported

      if (this.accessory.context.device[this.uniq_id].clr_temp_cmd_t) {
        // Use debug logging for no change updates, and info when a change occurred

        const clr_temp = this.parseValue(this.accessory.context.device[this.uniq_id].clr_temp_val_tpl, message.toString());

        if (this.service?.getCharacteristic(this.platform.Characteristic.ColorTemperature).value !== clr_temp) {
          this.platform.log.info('Updating \'%s\' ColorTemperature to %s', this.accessory.displayName, clr_temp);
        } else {
          this.platform.log.debug('Updating \'%s\' ColorTemperature to %s', this.accessory.displayName, clr_temp);
        }

        this.service?.getCharacteristic(this.platform.Characteristic.ColorTemperature).updateValue(clr_temp);
      }

      // RGB Lights that support effects

      if (this.platform.config.effects && this.accessory.context.device[this.uniq_id].fx_cmd_t) {
        this.TVservice?.getCharacteristic(this.platform.Characteristic.Active).updateValue((value
          === this.accessory.context.device[this.uniq_id].pl_on
          ? 1
          : 0));

        const effects = this.parseValue(this.accessory.context.device[this.uniq_id].fx_val_tpl, message.toString());

        if (this.TVservice?.getCharacteristic(this.platform.Characteristic.ActiveIdentifier).value !== effects) {
          this.platform.log.info('Updating \'%s\' Effects Scheme to %s', this.accessory.displayName, effects);
        } else {
          this.platform.log.debug('Updating \'%s\' Effects Scheme to %s', this.accessory.displayName, effects);
        }

        this.TVservice?.getCharacteristic(this.platform.Characteristic.ActiveIdentifier).updateValue(effects);
      }
    } catch (err: unknown) {
      this.platform.log.error('ERROR: Message Parse Error', topic, message.toString());
      this.platform.log.debug(String((err && (err as Error).message ? (err as Error).message : err)));
    }
  }

  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.info('%s Set Characteristic On ->', this.accessory.displayName, value);

    this.platform.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].cmd_t, (value
      ? this.accessory.context.device[this.uniq_id].pl_on
      : this.accessory.context.device[this.uniq_id].pl_off));
    callback(null);
  }

  setBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.info('%s Set Characteristic Brightness ->', this.accessory.displayName, value);
    this.platform.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].bri_cmd_t, value.toString());
    callback(null);
  }

  setHue(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.info('%s Set Characteristic Hue ->', this.accessory.displayName, value);
    if (this.update) {
      this.update.put({
        oldHue: this.service?.getCharacteristic(this.platform.Characteristic.Hue).value,
        oldSaturation: this.service?.getCharacteristic(this.platform.Characteristic.Saturation).value,
        oldBrightness: this.service?.getCharacteristic(this.platform.Characteristic.Brightness).value,
        newHue: value,
      }).then(() => {
        // debug("setTargetTemperature", this, thermostat);
        callback(null);
      }).catch((error) => {
        callback(error);
      });
    }
  }

  setSaturation(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.info('%s Set Characteristic Saturation ->', this.accessory.displayName, value);
    if (this.update) {
      this.update.put({
        oldHue: this.service?.getCharacteristic(this.platform.Characteristic.Hue).value,
        oldSaturation: this.service?.getCharacteristic(this.platform.Characteristic.Saturation).value,
        oldBrightness: this.service?.getCharacteristic(this.platform.Characteristic.Brightness).value,
        newSaturation: value,
      }).then(() => {
        // debug("setTargetTemperature", this, thermostat);
        callback(null);
      }).catch((error) => {
        callback(error);
      });
    }
  }

  setColorTemperature(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.info('%s Set Characteristic ColorTemperature ->', this.accessory.displayName, value);
    this.platform.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].clr_temp_cmd_t, value.toString());
    callback(null);
  }
}

// Consolidate update requests received over 100ms into a single update

class ChangeHSB {
  private desiredState: Record<string, unknown>;

  private deferrals: any[];
  private waitTimeUpdate: number;

  private platform: tasmotaPlatform;
  private timeout: NodeJS.Timeout | null;
  private accessory: PlatformAccessory;
  private readonly uniq_id: string;


  constructor(accessory: PlatformAccessory, that: any) {
    debug('ChangeHSB', this);
    this.accessory = accessory;
    this.uniq_id = that.uniq_id;
    this.desiredState = {};
    this.deferrals = [];
    this.waitTimeUpdate = 100; // wait 100ms before processing change
    this.timeout = null;
    this.platform = that.platform;
  }


  put(state: any) {
    return new Promise((resolve, reject) => {
      for (const key in state) {
        this.desiredState[key] = state[key];
      }
      const d = {
        resolve,
        reject,
      };
      this.deferrals.push(d);

      if (!this.timeout) {
        this.timeout = setTimeout(() => {
          debug('put start %s', this.desiredState);
          debug('HSL->RGB', ScaledHSVtoRGB(Number(this.desiredState.newHue ?? this.desiredState.oldHue),
            Number(this.desiredState?.newSaturation ?? this.desiredState?.oldSaturation), 50).toString());

          if (this.accessory.context.device[this.uniq_id].rgb_cmd_t) {
            this.platform.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].rgb_cmd_t,
              ScaledHSVtoRGB(Number(this.desiredState.newHue ?? this.desiredState.oldHue),
                Number(this.desiredState?.newSaturation ?? this.desiredState?.oldSaturation), 50).toString());
          }

          if (this.accessory.context.device[this.uniq_id].hs_cmd_t) {
            this.platform.mqttHost.sendMessage(this.accessory.context.device[this.uniq_id].hs_cmd_t,
              HSBtoTasmota(Number(this.desiredState.newHue ?? this.desiredState.oldHue),
                Number(this.desiredState?.newSaturation ?? this.desiredState?.oldSaturation),
                Number(this.desiredState?.newBrightness ?? this.desiredState?.oldBrightness)).toString());
          }

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
