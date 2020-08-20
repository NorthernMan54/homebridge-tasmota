import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
// import { tasmotaAccessory } from './platformAccessory';
import { tasmotaSwitchAccessory } from './tasmotaSwitchAccessory';
import { tasmotaSensorAccessory } from './tasmotaSensorAccessory';
import { Mqtt } from './lib/Mqtt';
import createDebug from 'debug';

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

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

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

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices() {

    // EXAMPLE ONLY
    // A real plugin you would discover accessories from the local network, cloud services
    // or a user-defined array in the platform config.

    const mqttHost = new Mqtt(this.config);

    debug('MqttHost', mqttHost);

    mqttHost.on('Discovered', (message) => {
      debug('Discovered ->', message.name, message);

      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address
      const uuid = this.api.hap.uuid.generate(message.uniq_id);

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        // the accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
        // existingAccessory.context.device = device;
        // this.api.updatePlatformAccessories([existingAccessory]);

        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        switch (message.tasmotaType) {
          case "switch":
            break;
            new tasmotaSwitchAccessory(this, existingAccessory);
          case "sensor":
            new tasmotaSensorAccessory(this, existingAccessory);
            break;
          default:
            this.log.info("Warning: Unhandled Tasmota device type", message.tasmotaType);
        }

      } else {
        // the accessory does not yet exist, so we need to create it
        this.log.info('Adding new accessory:', message.name);

        // create a new accessory
        const accessory = new this.api.platformAccessory(message.name, uuid);

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = message;

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        switch (message.tasmotaType) {
          case "switch":
            break;
            new tasmotaSwitchAccessory(this, accessory);
          case "sensor":
            new tasmotaSensorAccessory(this, accessory);
            break;
          default:
            this.log.info("Warning: Unhandled Tasmota device type", message.tasmotaType);
        }

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    });

  }
}
