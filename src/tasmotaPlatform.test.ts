import { beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { EventEmitter } from 'events';
import { mockMqttEmitter } from './__mocks__/Mqtt.js';

// --- Mocks ---

jest.mock('fakegato-history', () => () => class FakeGato { });

// --- Helpers ---

function makeMockAPI() {
  const api = new HomebridgeAPI();
  jest.spyOn(api, 'registerPlatformAccessories');
  jest.spyOn(api, 'unregisterPlatformAccessories');
  jest.spyOn(api, 'updatePlatformAccessories');
  return api;
}

const mockLog: any = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  warn: jest.fn((...args: any[]) => console.warn('[WARN]', ...args)),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
  debug: (...args: any[]) => console.log('[DEBUG]', ...args),
};

function emitDiscovered(topic: string, config: Record<string, any>) {
  (mockMqttEmitter as EventEmitter).emit('Discovered', topic, config);
}

// --- Tests ---

import { UUID } from 'crypto';
import { HomebridgeAPI } from '../node_modules/homebridge/dist/api.js';
import { tasmotaPlatform } from './tasmotaPlatform.js';

describe('Trailer Power', () => {
  let api: HomebridgeAPI;
  let platform: tasmotaPlatform;

  beforeAll(() => {
    mockMqttEmitter.removeAllListeners();
    api = makeMockAPI();
    platform = new tasmotaPlatform(mockLog, { name: 'Tasmota', cleanup: 0, debug: true }, api);
    api.emit('didFinishLaunching');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Registers Trailer Power Outlet', () => {
    emitDiscovered(trailerPowerTopic, trailerPowerConfig);

    expect(api.registerPlatformAccessories).toHaveBeenCalledTimes(1);

    const mockCalls = (api.registerPlatformAccessories as jest.Mock).mock.calls[0] as [string, string, any[]];
    const registeredAccessory = mockCalls[2][0];

    expect(registeredAccessory.displayName).toBe('Trailer Power');
    expect(registeredAccessory.context.device['139827_RL_1']).toBeDefined();
    expect(registeredAccessory.context.identifier).toBe('139827');
    expect(registeredAccessory.services).toHaveLength(2);
    expect(registeredAccessory.services[1]).toBeInstanceOf(api.hap.Service.Outlet);
    expect(Object.keys(registeredAccessory.services[1].characteristics).length).toBe(3); // Outlet has On, OutletInUse, and Name characteristics
    expect(registeredAccessory.services[1].getCharacteristic('On')).toBeDefined();
    expect(registeredAccessory.services[1].getCharacteristic('On').UUID)
      .toBe(api.hap.Characteristic.On.UUID);


    expect(Object.keys(platform.services).length).toBe(1);
    expect(platform.services['139827_RL_1']).toBeDefined();
  });

  test('Adds ENERGY TotalStartTime sensor to existing Trailer Power accessory, which should be ignored', () => {
    emitDiscovered(trailerEnergyTotalStartTimeTopic, trailerEnergyTotalStartTimeConfig);

    expect(api.registerPlatformAccessories).not.toHaveBeenCalled();
    expect(api.updatePlatformAccessories).toHaveBeenCalled();

    const updateCalls = (api.updatePlatformAccessories as jest.Mock).mock.calls[0] as [any[]];
    const updatedAccessory = updateCalls[0][0];
    expect(mockLog.warn).toHaveBeenCalledWith('Warning: missing dev_cla', 'Trailer Power ENERGY TotalStartTime');

    expect(updatedAccessory.displayName).toBe('Trailer Power');
    expect(updatedAccessory.context.device['139827_RL_1']).toBeDefined();
    expect(updatedAccessory.context.identifier).toBe('139827');
    expect(updatedAccessory.services).toHaveLength(2);
    expect(updatedAccessory.services[1]).toBeInstanceOf(api.hap.Service.Outlet);
    expect(Object.keys(updatedAccessory.services[1].characteristics).length).toBe(3); // Outlet has On, OutletInUse, and Name characteristics
    expect(updatedAccessory.services[1].getCharacteristic('On')).toBeDefined();
    expect(updatedAccessory.services[1].getCharacteristic('On').UUID)
      .toBe(api.hap.Characteristic.On.UUID);

    expect(platform.services['139827_ENERGY_TotalStartTime']).toBeDefined();
  });

  test('Adds ENERGY Total power sensor to existing Trailer Power accessory', () => {
    emitDiscovered(trailerEnergyTotalTopic, trailerEnergyTotalConfig);

    expect(api.registerPlatformAccessories).not.toHaveBeenCalled();
    expect(api.updatePlatformAccessories).toHaveBeenCalled();

    const updateCalls = (api.updatePlatformAccessories as jest.Mock).mock.calls[0] as [any[]];
    const updatedAccessory = updateCalls[0][0];

    expect(updatedAccessory.displayName).toBe('Trailer Power');
    expect(updatedAccessory.context.device['139827_RL_1']).toBeDefined();
    expect(updatedAccessory.context.identifier).toBe('139827');

    // 3 services: AccessoryInformation + Outlet + power sensor
    expect(updatedAccessory.services).toHaveLength(2);
    expect(updatedAccessory.services[1]).toBeInstanceOf(api.hap.Service.Outlet);
    expect(updatedAccessory.services[1].getCharacteristic('On')).toBeDefined();
    expect(updatedAccessory.services[1].getCharacteristic('On').UUID)
      .toBe(api.hap.Characteristic.On.UUID);
    expect(platform.services['139827_ENERGY_Total']).toBeDefined();
    // TotalConsumption characteristic is on the Outlet service - look up by display name since getCharacteristic(string) matches displayName not UUID
    const totalConsumptionUUID: UUID = 'E863F10C-079E-48FF-8F27-9C2605A29F52';
    expect(updatedAccessory.services[1].getCharacteristic('Total Consumption')).toBeDefined();
    expect(updatedAccessory.services[1].getCharacteristic('Total Consumption').UUID).toBe(totalConsumptionUUID);
    expect(updatedAccessory.services[1].getCharacteristic('Total Consumption').displayName).toBe('Total Consumption');
    expect(updatedAccessory.services[1].getCharacteristic('Total Consumption').props.unit).toBe('kWh');
    expect(updatedAccessory.services[1].getCharacteristic('Total Consumption').props.format).toBe('float');
    expect(updatedAccessory.services[1].getCharacteristic('Total Consumption').props.minValue).toBe(0);
    expect(updatedAccessory.services[1].getCharacteristic('Total Consumption').props.maxValue).toBe(1000000);
    expect(updatedAccessory.services[1].getCharacteristic('Total Consumption').props.minStep).toBe(0.01);
  });

  test('Adds status sensor to existing Trailer Power accessory, setting AccessoryInformation', () => {
    emitDiscovered(trailerStatusTopic, trailerStatusConfig);

    expect(api.registerPlatformAccessories).not.toHaveBeenCalled();
    expect(api.updatePlatformAccessories).toHaveBeenCalled();

    const updateCalls = (api.updatePlatformAccessories as jest.Mock).mock.calls[0] as [any[]];
    const updatedAccessory = updateCalls[0][0];

    expect(updatedAccessory.displayName).toBe('Trailer Power');

    // No new service should be added - status sensor populates AccessoryInformation only
    expect(updatedAccessory.services).toHaveLength(2);

    // AccessoryInformation should be populated from the dev object
    const accessoryInfo = updatedAccessory.getService(api.hap.Service.AccessoryInformation);
    expect(accessoryInfo).toBeDefined();
    expect(accessoryInfo!.getCharacteristic('Manufacturer').value).toBe('Tasmota');
    expect(accessoryInfo!.getCharacteristic('Model').value).toBe('Tuya MCU');
    expect(accessoryInfo!.getCharacteristic('Firmware Revision').value).toBe('9.5.0tasmota');
    expect(accessoryInfo!.getCharacteristic('Serial Number').value).toMatch(/^139827-/);

    expect(platform.services['139827_status']).toBeDefined();
  });

});

// =============================================================================
// Test fixture data
// =============================================================================

const trailerEnergyTotalStartTimeTopic = 'homeassistant/sensor/139827_ENERGY_TotalStartTime/config';
const trailerEnergyTotalStartTimeConfig = {
  name: 'Trailer Power ENERGY TotalStartTime',
  stat_t: 'tele/tasmota_139827/SENSOR',
  avty_t: 'tele/tasmota_139827/LWT',
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  uniq_id: '139827_ENERGY_TotalStartTime',
  dev: { ids: ['139827'] },
  unit_of_meas: ' ',
  ic: 'mdi:progress-clock',
  frc_upd: true,
  val_tpl: "{{value_json['ENERGY']['TotalStartTime']}}",
  tasmotaType: 'sensor',
  pl_on: 'ON',
  pl_off: 'OFF',
};

const trailerPowerTopic = 'homeassistant/switch/139827_RL_1/config';
const trailerPowerConfig = {
  name: 'Trailer Power',
  stat_t: 'tele/tasmota_139827/STATE',
  avty_t: 'tele/tasmota_139827/LWT',
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  cmd_t: 'cmnd/tasmota_139827/POWER',
  pl_off: 'OFF',
  pl_on: 'ON',
  val_tpl: '{{value_json.POWER}}',
  uniq_id: '139827_RL_1',
  dev: { ids: ['139827'] },
  tasmotaType: 'switch',
};

const trailerEnergyTotalTopic = 'homeassistant/sensor/139827_ENERGY_Total/config';
const trailerEnergyTotalConfig = {
  name: 'Trailer Power ENERGY Total',
  stat_t: 'tele/tasmota_139827/SENSOR',
  avty_t: 'tele/tasmota_139827/LWT',
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  uniq_id: '139827_ENERGY_Total',
  dev: { ids: ['139827'] },
  unit_of_meas: 'kWh',
  dev_cla: 'power',
  frc_upd: true,
  val_tpl: "{{value_json['ENERGY']['Total']}}",
  tasmotaType: 'sensor',
  pl_on: 'ON',
  pl_off: 'OFF',
};

const trailerStatusTopic = 'homeassistant/sensor/139827_status/config';
const trailerStatusConfig = {
  name: 'Trailer Power status',
  stat_t: 'tele/tasmota_139827/HASS_STATE',
  avty_t: 'tele/tasmota_139827/LWT',
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  json_attr_t: 'tele/tasmota_139827/HASS_STATE',
  unit_of_meas: '%',
  val_tpl: "{{value_json['RSSI']}}",
  ic: 'mdi:information-outline',
  uniq_id: '139827_status',
  dev: {
    ids: ['139827'],
    name: 'Trailer Power',
    mdl: 'Tuya MCU',
    sw: '9.5.0(tasmota)',
    mf: 'Tasmota',
  },
  tasmotaType: 'sensor',
  pl_on: 'ON',
  pl_off: 'OFF',
};