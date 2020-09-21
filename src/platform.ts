import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
// import { tasmotaAccessory } from './platformAccessory';
import { tasmotaSwitchService } from './tasmotaSwitchService';
import { tasmotaLightService } from './tasmotaLightService';
import { tasmotaSensorService } from './tasmotaSensorService';
import { Mqtt } from './lib/Mqtt';
import createDebug from 'debug';
import debugEnable from 'debug';

const debug = createDebug('Tasmota:platform');

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class tasmotaPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];
  public readonly services = {};

  // Auto removal of non responding devices

  private cleanup;
  private timeouts = {};
  private timeoutCounter = 1;
  private debug = false;
  public statusEvent = {};

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    this.cleanup = this.config['cleanup'] || 24; // Default removal of defunct devices after 24 hours

    this.debug = this.config['debug'] || false;
    if (this.debug) {

      let namespaces = debugEnable.disable();

      // this.log("DEBUG-1", namespaces);
      if (namespaces) {
        namespaces = namespaces + ',Tasmota*';
      } else {
        namespaces = 'Tasmota*';
      }
      // this.log("DEBUG-2", namespaces);
      debugEnable.enable(namespaces);
    }

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    accessory.context.timeout = this.autoCleanup(accessory);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices() {

    debug('discoverDevices');
    // EXAMPLE ONLY
    // A real plugin you would discover accessories from the local network, cloud services
    // or a user-defined array in the platform config.

    const mqttHost = new Mqtt(this.config);

    // debug('MqttHost', mqttHost);

    mqttHost.on('Discovered', (config) => {
      debug('Discovered ->', config.name, config);

      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address
      const message = normalizeMessage(config);
      // debug('normalizeMessage ->', message);
      let identifier, uniq_id;
      if (message.device && message.device.identifiers) {
        identifier = message.device.identifiers[0];
        uniq_id = message.uniq_id;
      } else {
        identifier = message.dev.ids[0];
        uniq_id = message.uniq_id;
      }
      const uuid = this.api.hap.uuid.generate(identifier);

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        // the accessory already exists


        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
        // existingAccessory.context.device = device;
        // this.api.updatePlatformAccessories([existingAccessory]);

        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`

        existingAccessory.context.mqttHost = mqttHost;
        existingAccessory.context.device[uniq_id] = message;

        if (this.services[uniq_id]) {
          this.log.info('Restoring existing service from cache:', message.name);
          this.services[uniq_id].refresh();
        } else {
          this.log.info('Creating service:', message.name);
          switch (message.tasmotaType) {
            case 'sensor':
              this.services[uniq_id] = new tasmotaSensorService(this, existingAccessory, uniq_id);
              break;
            case 'light':
              this.services[uniq_id] = new tasmotaLightService(this, existingAccessory, uniq_id);
              break;
            case 'switch':
              this.services[uniq_id] = new tasmotaSwitchService(this, existingAccessory, uniq_id);
              break;
            default:
              this.log.info('Warning: Unhandled Tasmota device type', message.tasmotaType);
          }
        }

      } else {
        // the accessory does not yet exist, so we need to create it
        this.log.info('Adding new accessory:', message.name);

        // create a new accessory
        const accessory = new this.api.platformAccessory(message.name, uuid);

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = {};
        accessory.context.device[uniq_id] = message;
        accessory.context.mqttHost = mqttHost;

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        switch (message.tasmotaType) {
          case 'switch':
            this.services[uniq_id] = new tasmotaSwitchService(this, accessory, uniq_id);
            break;
          case 'light':
            this.services[uniq_id] = new tasmotaLightService(this, accessory, uniq_id);
            break;
          case 'sensor':
            this.services[uniq_id] = new tasmotaSensorService(this, accessory, uniq_id);
            // debug("load", this.services[uniq_id]);
            break;
          default:
            this.log.info('Warning: Unhandled Tasmota device type', message.tasmotaType);
        }
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.accessories.push(accessory);

      }
    });
  }

  autoCleanup(accessory) {
    let timeoutID;

    // debug("autoCleanup", accessory.displayName, accessory.context.timeout, this.timeouts);

    if (accessory.context.timeout) {
      timeoutID = accessory.context.timeout;
      clearTimeout(this.timeouts[timeoutID]);
      delete this.timeouts[timeoutID];

    }

    timeoutID = this.timeoutCounter++;
    this.timeouts[timeoutID] = setTimeout(this.unregister.bind(this), this.cleanup * 60 * 60 * 1000, accessory, timeoutID);

    return (timeoutID);
  }

  unregister(accessory, timeoutID) {
    this.log.error('Removing %s', accessory.displayName);
    this.timeouts[timeoutID] = null;
    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    // callback();
  }
}

/* The various Tasmota firmware's have a slightly different flavors of the message. */


function normalizeMessage(message) {
  /*
    {
    name: 'Kitchen Sink',
    cmd_t: '~cmnd/POWER',
    stat_t: '~tele/STATE',
    val_tpl: '{{value_json.POWER}}',
    pl_off: 'OFF',
    pl_on: 'ON',
    avty_t: '~tele/LWT',
    pl_avail: 'Online',
    pl_not_avail: 'Offline',
    uniq_id: '284CCF_LI_1',
    device: { identifiers: [ '284CCF' ] },
    '~': 'sonoff/',
    bri_cmd_t: '~cmnd/Dimmer',
    bri_stat_t: '~tele/STATE',
    bri_scl: 100,
    on_cmd_type: 'brightness',
    bri_val_tpl: '{{value_json.Dimmer}}',
    tasmotaType: 'light'
    }

    {
    name: 'Scanner Tasmota',
    stat_t: 'tele/tasmota_00705C/STATE',
    avty_t: 'tele/tasmota_00705C/LWT',
    pl_avail: 'Online',
    pl_not_avail: 'Offline',
    cmd_t: 'cmnd/tasmota_00705C/POWER',
    val_tpl: '{{value_json.POWER}}',
    pl_off: 'OFF',
    pl_on: 'ON',
    uniq_id: '00705C_RL_1',
    dev: { ids: [ '00705C' ] },
    tasmotaType: 'switch'
    }
  */

  if (message['~']) {
    message.stat_t = message.stat_t.replace('~', message['~']);
    message.avty_t = message.avty_t.replace('~', message['~']);
    if (message.cmd_t) {
      message.cmd_t = message.cmd_t.replace('~', message['~']);
    }
    if (message.bri_cmd_t) {
      message.bri_cmd_t = message.bri_cmd_t.replace('~', message['~']);
      message.bri_stat_t = message.bri_stat_t.replace('~', message['~']);
    }
    if (message.clr_temp_cmd_t) {
      message.clr_temp_cmd_t = message.clr_temp_cmd_t.replace('~', message['~']);
      message.clr_temp_stat_t = message.clr_temp_stat_t.replace('~', message['~']);
    }

    if (message.rgb_cmd_t) {
      message.rgb_cmd_t = message.rgb_cmd_t.replace('~', message['~']);
      message.rgb_stat_t = message.rgb_stat_t.replace('~', message['~']);
    }

    if (message.fx_cmd_t) {
      message.fx_cmd_t = message.fx_cmd_t.replace('~', message['~']);
      message.fx_stat_t = message.fx_stat_t.replace('~', message['~']);
    }

  }

  /*
  dev: {
    ids: [ '00705C' ],
    name: 'Scanner',
    mdl: 'WiOn',
    sw: '8.4.0(tasmota)',
    mf: 'Tasmota'
  },

  device: {
    identifiers: [ '284CCF' ],
    name: 'Kitchen Sink',
    model: 'Tuya Dimmer',
    sw_version: '6.5.0(release-sonoff)',
    manufacturer: 'Tasmota'
  },
  */

  if (message.device) {
    message.dev = message.device;
    message.dev.mdl = message.dev.model;
    message.dev.sw = message.dev.sw_version;
    message.dev.mf = message.dev.manufacturer;
    message.dev.ids = message.dev.identifiers;
  }

  if (message.stat_t === 'sonoff/tele/STATE' || message.stat_t === 'tasmota/tele/STATE') {
    console.log('ERROR: %s has an incorrectly configure MQTT Topic, please make it unique.', message.name);
  }

  // debug("normalizeMessage", message);
  return (message);
}
