import createDebug from 'debug';
import fakegato from 'fakegato-history';
import {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  Service,
} from 'homebridge';
import { EveHomeKitTypes } from 'homebridge-lib/EveHomeKitTypes';

// Local methods

import { Mqtt } from './lib/Mqtt.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { tasmotaBinarySensorService } from './tasmotaBinarySensorService.js';
import { tasmotaFanService } from './tasmotaFanService.js';
import { tasmotaGarageService } from './tasmotaGarageService.js';
import { tasmotaLightService } from './tasmotaLightService.js';
import { tasmotaSensorService } from './tasmotaSensorService.js';
import { tasmotaSwitchService } from './tasmotaSwitchService.js';
import { findVal, normalizeMessage } from './utils.js';
const debug = createDebug('Tasmota:platform');

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */

interface DiscoveryTopicMap {
  topic: string
  type: string
  uniq_id: string
  uuid: string
}



type TasmotaService =
  tasmotaGarageService |
  tasmotaSwitchService |
  tasmotaLightService |
  tasmotaSensorService |
  tasmotaBinarySensorService |
  tasmotaFanService;


/**
 * TasmotaPlatform
 */

export class tasmotaPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly CustomServices: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly CustomCharacteristics: any;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];
  private readonly defunctAccessories: PlatformAccessory[] = [];
  public readonly services: Record<string, TasmotaService> = {};

  private discoveryTopicMap: DiscoveryTopicMap[] = [];

  public mqttHost: Mqtt;
  // Auto removal of non responding devices

  private cleanup: number;
  private timeouts: Record<number, NodeJS.Timeout> = {};
  private timeoutCounter: number = 1;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private debug: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public FakeGatoHistoryService: any;
  public teleperiod = 300;

  constructor(
    public readonly log: Logger,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public readonly config: any,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.CustomServices = new EveHomeKitTypes(this.api).Services;
    this.CustomCharacteristics = new EveHomeKitTypes(this.api).Characteristics;

    this.log.debug('Finished initializing platform:', this.config.name);
    this.cleanup = (this.config.cleanup !== undefined ? this.config.cleanup : 24); // #46
    this.debug = this.config.debug || false;
    this.teleperiod = this.config.teleperiod || 300;

    if (this.debug) {
      let namespaces = createDebug.disable();

      // this.log("DEBUG-1", namespaces);
      if (namespaces) {
        namespaces = `${namespaces},Tasmota*`;
      } else {
        namespaces = 'Tasmota*';
      }
      // this.log("DEBUG-2", namespaces);
      createDebug.enable(namespaces);
    }

    if (this.config.override) {
      interface Injection {
        key: string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: any
      }
      interface Injections {
        topic: string
        injection: Injection[]
      }
      const injections: Injections[] = [];
      Object.keys(this.config.override).forEach((topic) => {
        const inject: Injection[] = [];
        Object.entries(this.config.override[topic]).forEach(
          ([key, value]) => {
            // debug("topic: %s, key: %s, value: %s", topic, key, value);
            const injection: Injection = { key, value };
            inject.push(injection);
          },
        );
        injections.push({ topic, injection: inject });
      });
      // debug('This is your override reformated to injections.');
      // debug('"injections": %s\n', JSON.stringify(injections, null, 2));
    }

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // log.debug('this.accessories as loaded', this.accessories[0]?.services)
      // run the method to discover / register your devices as accessories
      debug('%d accessories for cleanup', this.defunctAccessories.length);
      if (this.defunctAccessories.length > 0) {
        this.cleanupDefunctAccessories();
      }
      this.discoverDevices();

      if (this.config.history) {
        this.FakeGatoHistoryService = fakegato(this.api);

        // Only addEntries that match the expected profile of the function.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.FakeGatoHistoryService.prototype.appendData = function (entry: any) {
          entry.time = Math.round(new Date().valueOf() / 1000);
          switch (this.accessoryType) {
            default:
              // debug('unhandled this.accessoryType', this.accessoryType);
              this.addEntry(entry);
          }
        };
      }
    });

    this.mqttHost = new Mqtt(this.config);
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    debug('Load: "%s" %d services', accessory.displayName, accessory.services.length);

    if (accessory.services.length > 1) {
      // debug('context', accessory.context);
      if (this.cleanup > 0) {
        accessory.context.timeout = this.autoCleanup(accessory);
      }

      // add the restored accessory to the accessories cache so we can track if it has already been registered
      this.accessories.push(accessory);
    } else {
      this.log.warn('Warning: Removing incomplete accessory definition from cache:', accessory.displayName);
      this.defunctAccessories.push(accessory);
    }
  }

  /* Check the topic against the configuration's filterList.
   */
  isTopicAllowed(topic: string, filter: string, filterAllow: Array<string>, filterDeny: Array<string>): boolean {
    // debug('isTopicFiltered', topic)
    let defaultAllow = true;
    let allowThis = false;

    if (filter) {
      defaultAllow = false;

      if (topic.match(filter)) {
        debug('isTopicFiltered matched filter', filter);
        allowThis = true;
      }
    }

    if (filterAllow) {
      defaultAllow = false;

      for (const filter of filterAllow) {
        if (topic.match(filter)) {
          debug('isTopicFiltered matched filterAllow entry', filter);
          allowThis = true;
        }
      }
    }

    if (filterDeny) {
      for (const filter of filterDeny) {
        if (topic.match(filter)) {
          debug('isTopicFiltered matched filterDeny entry', filter);
          return false;
        }
      }
    }

    return allowThis || defaultAllow;
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



    // debug('MqttHost', mqttHost);

    this.mqttHost.on('Remove', (topic) => {
      // debug('remove-0', topic);
      if (this.discoveryTopicMap[topic]) {
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === this.discoveryTopicMap[topic].uuid);
        if (existingAccessory) {
          // debug('MQTT Remove', this.discoveryTopicMap[topic]);
          switch (this.discoveryTopicMap[topic].type) {
            case 'Service':
              this.serviceCleanup(this.discoveryTopicMap[topic].uniq_id, existingAccessory);
              break;
            case 'Accessory':
              this.accessoryCleanup(existingAccessory);
              break;
          }
          delete this.discoveryTopicMap[topic];
        } else {
          debug('missing accessory', topic, this.discoveryTopicMap[topic]);
        }
      } else {
        // debug('Remove failed', topic);
      }
    });

    this.mqttHost.on('Discovered', (topic, config) => {
      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address

      // debug('topic', topic);
      // debug('filter', this.config.filter);
      // debug('filterList', this.config.filterList);
      if (this.isTopicAllowed(topic, this.config.filter, this.config.filterAllow, this.config.filterDeny)) {
        let message = normalizeMessage(config);
        debug('normalizeMessage ->', message);
        if (message.dev?.ids?.[0]) {
          const identifier = message.dev.ids[0]; // Unique per accessory
          const uniq_id: string = message.uniq_id as string; // Unique per service

          message = this.discoveryOveride(uniq_id, message);
          debug('Discovered ->', topic, config.name, message);
          const uuid = this.api.hap.uuid.generate(identifier);

          // see if an accessory with the same uuid has already been registered and restored from
          // the cached devices we stored in the `configureAccessory` method above
          const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);


          if (existingAccessory) {
            // the accessory already exists

            this.log.info('Found existing accessory: %s - %s', message.name, uniq_id);
            // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
            // existingAccessory.context.device = device;
            // this.api.updatePlatformAccessories([existingAccessory]);

            // create the accessory handler for the restored accessory
            // this is imported from `platformAccessory.ts`

            // existingAccessory.context.mqttHost = mqttHost;
            existingAccessory.context.device[uniq_id] = message;
            existingAccessory.context.identifier = identifier;

            this.discoveryTopicMap[topic] = { topic, type: 'Service', uniq_id, uuid };

            if (this.services[uniq_id]) {
              this.log.warn('Restoring existing service from cache:', message.name);
              this.services[uniq_id].refresh();
              switch (message.tasmotaType) {
                case 'sensor':
                  if (!message.dev_cla) { // This is the device status topic
                    this.discoveryTopicMap[topic] = { topic, type: 'Accessory', uniq_id, uuid };
                  } else {
                    this.discoveryTopicMap[topic] = { topic, type: 'Service', uniq_id, uuid };
                  }
                  // debug('discoveryTopicMap', this.discoveryTopicMap[topic]);
                  break;
                default:
                  this.discoveryTopicMap[topic] = { topic, type: 'Service', uniq_id, uuid };
              }
            } else if (message.name) {
              // this.log.info('existingAccessory:', existingAccessory.displayName, existingAccessory)
              // this.log.info('this.services:', this.services)
              this.log.info('Creating service:', message.name, message.tasmotaType);
              switch (message.tasmotaType) {
                case 'sensor':
                  this.services[uniq_id] = new tasmotaSensorService(this, existingAccessory, uniq_id);
                  if (!message.dev_cla) { // This is the device status topic
                    this.discoveryTopicMap[topic] = { topic, type: 'Accessory', uniq_id, uuid };
                  } else {
                    this.discoveryTopicMap[topic] = { topic, type: 'Service', uniq_id, uuid };
                  }
                  break;
                case 'light':
                  this.services[uniq_id] = new tasmotaLightService(this, existingAccessory, uniq_id);
                  this.discoveryTopicMap[topic] = { topic, type: 'Service', uniq_id, uuid };
                  break;
                case 'fan':
                case 'fanFixed':
                  this.services[uniq_id] = new tasmotaFanService(this, existingAccessory, uniq_id);
                  this.discoveryTopicMap[topic] = { topic, type: 'Service', uniq_id, uuid };
                  break;
                case 'switch':
                  this.services[uniq_id] = new tasmotaSwitchService(this, existingAccessory, uniq_id);
                  this.discoveryTopicMap[topic] = { topic, type: 'Service', uniq_id, uuid };
                  break;
                case 'garageDoor':
                  this.services[uniq_id] = new tasmotaGarageService(this, existingAccessory, uniq_id);
                  this.discoveryTopicMap[topic] = { topic, type: 'Service', uniq_id, uuid };
                  break;
                case 'binary_sensor':
                  this.services[uniq_id] = new tasmotaBinarySensorService(this, existingAccessory, uniq_id);
                  this.discoveryTopicMap[topic] = { topic, type: 'Service', uniq_id, uuid };
                  break;
                default:
                  this.log.warn('Warning: Unhandled Tasmota device type', message.tasmotaType);
              }
            } else {
              this.log.warn('Warning: missing friendly name for topic ', topic);
            }

            debug('discoveryDevices - this.api.updatePlatformAccessories - %d', existingAccessory.services.length);
            this.api.updatePlatformAccessories([existingAccessory]);
          } else if (message.name) {
            // the accessory does not yet exist, so we need to create it
            this.log.info('Adding new accessory:', message.name);

            // create a new accessory
            const accessory = new this.api.platformAccessory(message.name, uuid);

            // store a copy of the device object in the `accessory.context`
            // the `context` property can be used to store any data about the accessory you may need
            accessory.context.device = {};
            accessory.context.device[uniq_id] = message;
            // accessory.context.mqttHost = mqttHost;
            accessory.context.identifier = identifier;

            // create the accessory handler for the newly create accessory
            // this is imported from `platformAccessory.ts`
            switch (message.tasmotaType) {
              case 'switch':
                this.services[uniq_id] = new tasmotaSwitchService(this, accessory, uniq_id);
                this.discoveryTopicMap[topic] = { topic, type: 'Service', uniq_id, uuid };
                break;
              case 'garageDoor':
                this.services[uniq_id] = new tasmotaGarageService(this, accessory, uniq_id);
                this.discoveryTopicMap[topic] = { topic, type: 'Service', uniq_id, uuid };
                break;
              case 'light':
                this.services[uniq_id] = new tasmotaLightService(this, accessory, uniq_id);
                this.discoveryTopicMap[topic] = { topic, type: 'Service', uniq_id, uuid };
                break;
              case 'fan':
              case 'fanFixed':
                this.services[uniq_id] = new tasmotaFanService(this, accessory, uniq_id);
                this.discoveryTopicMap[topic] = { topic, type: 'Service', uniq_id, uuid };
                break;
              case 'sensor':
                this.services[uniq_id] = new tasmotaSensorService(this, accessory, uniq_id);
                if (!message.dev_cla) { // This is the device status topic
                  this.discoveryTopicMap[topic] = { topic, type: 'Accessory', uniq_id, uuid };
                } else {
                  this.discoveryTopicMap[topic] = { topic, type: 'Service', uniq_id, uuid };
                }
                break;
              case 'binary_sensor':
                this.services[uniq_id] = new tasmotaBinarySensorService(this, accessory, uniq_id);
                this.discoveryTopicMap[topic] = { topic, type: 'Service', uniq_id, uuid };
                break;
              default:
                this.log.warn('Warning: Unhandled Tasmota device type', message.tasmotaType);
            }
            debug('discovery devices - this.api.registerPlatformAccessories - %d', accessory.services.length);
            if (accessory.services.length > 1) {
              this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
              this.accessories.push(accessory);
            } else {
              this.log.warn('Warning: incomplete HASS Discovery message and device definition', topic, config.name);
            }
          } else {
            this.log.warn('Warning: Missing accessory friendly name', topic, config.name);
          }

          //          if (this.services[uniq_id] && this.services[uniq_id].service && 
          // this.services[uniq_id].service.getCharacteristic(this.Characteristic.ConfiguredName).listenerCount('set') < 1) {
          //            (this.services[uniq_id].service.getCharacteristic(this.Characteristic.ConfiguredName)
          //              || this.services[uniq_id].service.addCharacteristic(this.Characteristic.ConfiguredName))
          //              .on('set', setConfiguredName.bind(this.services[uniq_id]));
          //          }
        } else {
          this.log.warn('Warning: Malformed HASS Discovery message', topic, config.name);
        }
      } else {
        debug('filtered', topic);
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  discoveryOveride(uniq_id: string, message: any) {
    if (this.config.override) { // pre version 0.1.0 override configuration
      // debug('override', this.config.override);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const overrides: any = [];
      for (const [key, value] of Object.entries(this.config.override)) {
        // debug(`${key}: ${value}`);
        overrides[key] = value;
      }
      if (overrides[uniq_id]) {
        // debug('Merging', this.config.override[uniq_id]);
        const merged = { ...message, ...this.config.override[uniq_id] };
        // debug('Merged', merged);
        return normalizeMessage(merged);
      }
    } else if (this.config.injections) {
      // debug('injections', this.config.injections);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.config.injections.forEach((overide: any) => {
        if (overide.topic === uniq_id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          overide.injection.forEach((inject: any) => {
            message[inject.key] = inject.value;
          });
        }
      });
    }
    return normalizeMessage(message);
  }

  serviceCleanup(uniq_id: string, existingAccessory: PlatformAccessory) {
    // debug('service array', this.services);
    debug('serviceCleanup', uniq_id);
    if (this.services[uniq_id]) {
      if (this.services[uniq_id].service) {
        this.log.info('Removing Service', this.services[uniq_id].service?.displayName);

        if (this.services[uniq_id]?.statusSubscribe) {
          // debug("Cleaned up listeners", mqttHost);
          // debug(this.services[uniq_id].statusSubscribe.event);
          if (this.services[uniq_id].statusSubscribe?.event) {
            this.mqttHost.removeAllListeners(this.services[uniq_id].statusSubscribe?.event);
          } else {
            this.log.error('statusSubscribe.event missing', this.services[uniq_id].service?.displayName);
          }
          if (this.services[uniq_id]?.availabilitySubscribe) {
            this.mqttHost.removeAllListeners(this.services[uniq_id].availabilitySubscribe?.event);
          } else {
            this.log.error('availabilitySubscribe missing', this.services[uniq_id].service?.displayName);
          }
          // debug("Cleaned up listeners", existingAccessory.context.mqttHost);
        }
        // This error message is stupid......
        existingAccessory.removeService(this.services[uniq_id].service);
        delete this.services[uniq_id];
        debug('serviceCleanup - this.api.updatePlatformAccessories', uniq_id);
        this.api.updatePlatformAccessories([existingAccessory]);
      } else {
        debug('serviceCleanup - object');
        delete this.services[uniq_id];
      }
    } else {
      debug('No service', uniq_id);
    }
  }

  autoCleanup(accessory: PlatformAccessory): number | null {
    let timeoutID: number;
    // debug('autoCleanup', this.cleanup, accessory.displayName, accessory.context);
    // Check if 'stat_t' is available in the accessory context
    if (this.cleanup) {
      if (findVal(accessory.context.device, 'stat_t')) {
        if (accessory.context.timeout) {
          // Clear existing timeout if present
          timeoutID = accessory.context.timeout;
          clearTimeout(this.timeouts[timeoutID]);
          delete this.timeouts[timeoutID];
        }

        // Create a new timeout ID and store it
        timeoutID = this.timeoutCounter++;
        this.timeouts[timeoutID] = setTimeout(
          this.accessoryCleanup.bind(this),
          this.cleanup * 60 * 60 * 1000, // Convert cleanup interval to milliseconds
          accessory,
        );

        // Save the new timeout ID in the accessory context for future clearing
        accessory.context.timeout = timeoutID;

        return timeoutID;
      } else {
        // Return null if 'stat_t' is unavailable
        return null;
      }
    } else {
      return null;
    }
  }

  accessoryCleanup(existingAccessory: PlatformAccessory): void {
    this.log.info('Removing Accessory:', existingAccessory.displayName);

    // Find related services for the accessory by UUID
    const accessoryUUID = existingAccessory.UUID;
    const matchingServices = Object.keys(this.services).filter(
      (key) => this.services[key]?.accessory?.UUID === accessoryUUID,
    );

    // Cleanup each matching service
    matchingServices.forEach((serviceKey) => {
      this.serviceCleanup(serviceKey, existingAccessory);
    });

    // Remove the accessory from the internal accessory list
    const accessoryIndex = this.accessories.findIndex(
      (accessory) => accessory.UUID === accessoryUUID,
    );
    if (accessoryIndex !== -1) {
      this.accessories.splice(accessoryIndex, 1);
    }

    // Clear and remove associated timeout, if any
    const timeoutID = existingAccessory.context.timeout;
    if (this.timeouts[timeoutID]) {
      clearTimeout(this.timeouts[timeoutID]);
      delete this.timeouts[timeoutID];
    }

    // Unregister the accessory from the platform
    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
    debug('Accessory unregistered:', existingAccessory.displayName);
  }


  // Remove defunct accessories discovered during startup

  cleanupDefunctAccessories() {
    this.defunctAccessories.forEach((accessory) => {
      debug('Removing', accessory.displayName);
      this.accessoryCleanup(accessory);
    });
  }
}