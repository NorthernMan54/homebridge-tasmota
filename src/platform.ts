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

interface Message {
  tasmotaType?: string;
  cmd_t?: string;
  stat_t?: string;
  uniq_id?: string;
  dev_cla?: string;
  pl_on?: string;
  pl_off?: string;
  payload_high_speed?: string;
  payload_medium_speed?: string;
  payload_low_speed?: string;
  val_tpl?: string;
  bri_val_tpl?: string;
  speeds?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow additional properties
}

type TasmotaService =
  tasmotaGarageService |
  tasmotaSwitchService |
  tasmotaLightService |
  tasmotaSensorService |
  tasmotaBinarySensorService |
  tasmotaFanService;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renameKeys<T extends Record<string, any>>(
  obj: T | T[],
  mapShortToLong: Record<string, string>,
): T | T[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any;

  if (Array.isArray(obj)) {
    result = obj.map((item) => renameKeys(item, mapShortToLong));
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result = {} as Record<string, any>;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Get the destination key
        const destKey = mapShortToLong[key] || key;

        // Get the value
        const value = obj[key];

        // Recursively handle nested objects or arrays
        if (value && typeof value === 'object') {
          renameKeys(value, mapShortToLong);
        }

        // Assign the value to the new key
        result[destKey] = value;
      }
    }
  }

  return result;
}

function replaceStringsInObject(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: Record<string, any>,
  findStr: string,
  replaceStr: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cache: Map<any, any> = new Map(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  // Check if the object has already been processed to avoid circular references
  if (cache.has(obj)) {
    return cache.get(obj);
  }

  // Initialize result object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {};
  cache.set(obj, result); // Cache the object reference

  for (const [key, value] of Object.entries(obj)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let updatedValue: any;

    if (typeof value === 'string') {
      // Replace occurrences of findStr with replaceStr in strings
      updatedValue = value.replace(new RegExp(findStr, 'gi'), replaceStr);
    } else if (Array.isArray(value)) {
      // Recursively process arrays
      updatedValue = value.map((item) =>
        typeof item === 'object' && item !== null
          ? replaceStringsInObject(item, findStr, replaceStr, cache)
          : item,
      );
    } else if (typeof value === 'object' && value !== null) {
      // Recursively process nested objects
      updatedValue = replaceStringsInObject(value, findStr, replaceStr, cache);
    } else {
      // Preserve other types (numbers, booleans, etc.)
      updatedValue = value;
    }

    result[key] = updatedValue;
  }

  return result;
}

/* The various Tasmota firmware's have a slightly different flavors of the message. */

function normalizeMessage(message: Message): Message {
  // Handle specific tasmotaType cases
  if (message.tasmotaType === 'fanFixed') {
    message = {
      ...message,
      payload_high_speed: '3',
      payload_medium_speed: '2',
      payload_low_speed: '1',
      pl_off: '0',
      pl_on: '1',
      val_tpl: '{% if value_json.FanSpeed == 0 -%}0{%- elif value_json.FanSpeed > 0 -%}1{%- endif %}',
      bri_val_tpl: '{{value_json.FanSpeed*1/3*100}}',
      speeds: ['off', 'low', 'medium', 'high'],
    };
    if (message.cmd_t) {
      message.cmd_t = message.cmd_t.replace('POWER2', 'FanSpeed');
    }
  }

  // Translation map for renaming keys
  const translation: Record<string, string> = {
    unique_id: 'uniq_id',
    device_class: 'dev_cla',
    payload_on: 'pl_on',
    payload_off: 'pl_off',
    payload_high_speed: 'pl_hi_spd',
    payload_medium_speed: 'pl_med_spd',
    payload_low_speed: 'pl_lo_spd',
    speeds: 'spds',
    device: 'dev',
    model: 'mdl',
    sw_version: 'sw',
    manufacturer: 'mf',
    identifiers: 'ids',
    value_template: 'val_tpl',
    state_value_template: 'stat_val_tpl',
    unit_of_measurement: 'unit_of_meas',
    state_topic: 'stat_t',
    availability_topic: 'avty_t',
    command_topic: 'cmd_t',
    icon: 'ic',
  };

  // Rename keys in the message
  message = renameKeys(message, translation);

  // Replace placeholders in the message
  if (message['~']) {
    message = replaceStringsInObject(message, '~', message['~']);
  }

  // Validate MQTT topic uniqueness
  if (['sonoff/tele/STATE', 'tasmota/tele/STATE'].includes(message.stat_t || '')) {
    console.error(
      'ERROR: %s has an incorrectly configured MQTT Topic, please make it unique.',
      message.name,
    );
  }

  // Infer device class based on unique_id patterns
  if (!message.dev_cla && message.uniq_id) {
    if (/_CarbonDioxide|eCO2$/.test(message.uniq_id)) {
      message.dev_cla = 'co2';
    } else if (/_AirQuality$/.test(message.uniq_id)) {
      message.dev_cla = 'pm25';
    }
  }

  // Set default payload values for ESPHome devices
  if (typeof message.pl_on === 'undefined') {
    message.pl_on = 'ON';
  }
  if (typeof message.pl_off === 'undefined') {
    message.pl_off = 'OFF';
  }

  return message;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findVal<T>(object: Record<string, any>, key: string): T | undefined {
  let value: T | undefined;

  Object.keys(object).some((k) => {
    if (k === key) {
      value = object[k];
      return true; // Exit loop
    }
    if (object[k] && typeof object[k] === 'object') {
      value = findVal<T>(object[k], key);
      return value !== undefined; // Exit loop if value is found
    }
    return false; // Continue searching
  });

  return value;
}

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
    this.cleanup = this.config.cleanup || 24; // Default removal of defunct devices after 24 hours
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
      accessory.context.timeout = this.autoCleanup(accessory);

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

    const mqttHost = new Mqtt(this.config);

    // debug('MqttHost', mqttHost);

    mqttHost.on('Remove', (topic) => {
      // debug('remove-0', topic);
      if (this.discoveryTopicMap[topic]) {
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === this.discoveryTopicMap[topic].uuid);
        if (existingAccessory) {
          // debug('Remove', this.discoveryTopicMap[topic]);
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

    mqttHost.on('Discovered', (topic, config) => {
      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address

      // debug('topic', topic);
      // debug('filter', this.config.filter);
      // debug('filterList', this.config.filterList);
      if (this.isTopicAllowed(topic, this.config.filter, this.config.filterAllow, this.config.filterDeny)) {
        let message = normalizeMessage(config);
        // debug('normalizeMessage ->', message);
        if (message.dev && message.dev.ids[0]) {
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

            existingAccessory.context.mqttHost = mqttHost;
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

            console.log('discoveryDevices - this.api.updatePlatformAccessories - %d', existingAccessory);
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
            accessory.context.mqttHost = mqttHost;
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
            existingAccessory.context.mqttHost.removeAllListeners(this.services[uniq_id].statusSubscribe?.event);
          } else {
            this.log.error('statusSubscribe.event missing', this.services[uniq_id].service?.displayName);
          }
          if (this.services[uniq_id]?.availabilitySubscribe) {
            existingAccessory.context.mqttHost.removeAllListeners(this.services[uniq_id].availabilitySubscribe?.event);
          } else {
            this.log.error('availabilitySubscribe missing', this.services[uniq_id].service?.displayName);
          }
          // debug("Cleaned up listeners", existingAccessory.context.mqttHost);
        }

        existingAccessory.removeService(this.services[uniq_id].service);
        delete this.services[uniq_id];
        debug('serviceCleanup - this.api.updatePlatformAccessories');
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

    // Check if 'stat_t' is available in the accessory context
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

export {
  // Other exports...
  normalizeMessage,
};

