import { UUID } from 'crypto';
import { EventEmitter } from 'events';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { HomebridgeAPI } from 'homebridge';
import { mockMqttEmitter } from './__mocks__/Mqtt.js';
import { makeMockAPI, mockLog } from './__mocks__/mocks.js';
import { tasmotaPlatform } from './tasmotaPlatform.js';

// --- Mocks ---

vi.mock('../src/lib/Mqtt.js', async () => {
  const mod = await import('./__mocks__/Mqtt.js');
  return mod;
});

vi.mock('fakegato-history', () => ({ default: () => class FakeGato { } }));

// Use fake timers throughout so the discovery debounce can be flushed synchronously
// by calling vi.runAllTimers() (done automatically inside emitDiscovered).
vi.useFakeTimers();

function emitDiscovered(topic: string, config: Record<string, any>) {
  (mockMqttEmitter as EventEmitter).emit('Discovered', topic, config);
  // Flush the per-device debounce timer so processing is synchronous in tests
  vi.runAllTimers();
}

// --- Tests ---

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
    vi.clearAllMocks();
  });

  describe('Regular Outlet', () => {
    test('Registers Trailer Power Outlet', () => {
      emitDiscovered(trailerPowerTopic, trailerPowerConfig);

      expect(api.registerPlatformAccessories).toHaveBeenCalledTimes(1);

      const mockCalls = (api.registerPlatformAccessories as ReturnType<typeof vi.spyOn>).mock.calls[0] as [string, string, any[]];
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

    test('Adds status sensor to existing Trailer Power accessory, setting AccessoryInformation', () => {
      emitDiscovered(trailerStatusTopic, trailerStatusConfig);

      expect(api.registerPlatformAccessories).not.toHaveBeenCalled();
      expect(api.updatePlatformAccessories).toHaveBeenCalled();

      const updateCalls = (api.updatePlatformAccessories as ReturnType<typeof vi.spyOn>).mock.calls[0] as [any[]];
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

  describe('Energy Outlet', () => {

    test('Adds ENERGY TotalStartTime sensor to existing Trailer Power accessory, which should be ignored', () => {
      emitDiscovered(trailerEnergyTotalStartTimeTopic, trailerEnergyTotalStartTimeConfig);

      expect(api.registerPlatformAccessories).not.toHaveBeenCalled();
      expect(api.updatePlatformAccessories).toHaveBeenCalled();

      const updateCalls = (api.updatePlatformAccessories as ReturnType<typeof vi.spyOn>).mock.calls[0] as [any[]];
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

    test('Adds ENERGY Consumption to existing Trailer Power accessory', () => {
      emitDiscovered(trailerEnergyTotalTopic, trailerEnergyTotalConfig);

      expect(api.registerPlatformAccessories).not.toHaveBeenCalled();
      expect(api.updatePlatformAccessories).toHaveBeenCalled();

      const updateCalls = (api.updatePlatformAccessories as ReturnType<typeof vi.spyOn>).mock.calls[0] as [any[]];
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

    test('Adds ENERGY Current sensor to existing Trailer Power accessory', () => {
      emitDiscovered(trailerEnergyCurrentTopic, trailerEnergyCurrentConfig);

      expect(api.registerPlatformAccessories).not.toHaveBeenCalled();
      expect(api.updatePlatformAccessories).toHaveBeenCalled();

      const updateCalls = (api.updatePlatformAccessories as ReturnType<typeof vi.spyOn>).mock.calls[0] as [any[]];
      const updatedAccessory = updateCalls[0][0];

      expect(updatedAccessory.displayName).toBe('Trailer Power');
      expect(updatedAccessory.context.device['139827_RL_1']).toBeDefined();
      expect(updatedAccessory.context.identifier).toBe('139827');

      // No new service added - missing dev_cla results in a warning and no service creation
      expect(updatedAccessory.services).toHaveLength(2);
      expect(updatedAccessory.services[1]).toBeInstanceOf(api.hap.Service.Outlet);

      // CurrentConsumption (Consumption) characteristic should be on the Outlet service
      const UUID: UUID = 'E863F126-079E-48FF-8F27-9C2605A29F52';
      expect(updatedAccessory.services[1].getCharacteristic('Electric Current')).toBeDefined();
      expect(updatedAccessory.services[1].getCharacteristic('Electric Current').UUID).toBe(UUID);
      expect(updatedAccessory.services[1].getCharacteristic('Electric Current').props.unit).toBe('A');
      expect(updatedAccessory.services[1].getCharacteristic('Electric Current').props.format).toBe('float');
      expect(updatedAccessory.services[1].getCharacteristic('Electric Current').props.minValue).toBe(0);
      expect(updatedAccessory.services[1].getCharacteristic('Electric Current').props.maxValue).toBe(48);
      expect(updatedAccessory.services[1].getCharacteristic('Electric Current').props.minStep).toBe(0.01);

      expect(platform.services['139827_ENERGY_Current']).toBeDefined();
    });

    test('Adds ENERGY ReactivePower sensor to existing Trailer Power accessory, which should warn unhandled power type', () => {
      emitDiscovered(trailerEnergyReactivePowerTopic, trailerEnergyReactivePowerConfig);

      expect(api.registerPlatformAccessories).not.toHaveBeenCalled();
      expect(api.updatePlatformAccessories).toHaveBeenCalled();

      const updateCalls = (api.updatePlatformAccessories as ReturnType<typeof vi.spyOn>).mock.calls[0] as [any[]];
      const updatedAccessory = updateCalls[0][0];

      expect(updatedAccessory.displayName).toBe('Trailer Power');
      expect(updatedAccessory.context.device['139827_RL_1']).toBeDefined();
      expect(updatedAccessory.context.identifier).toBe('139827');

      // No new service added - unhandled power sensor type
      expect(updatedAccessory.services).toHaveLength(2);

      expect(mockLog.warn).toHaveBeenCalledWith('Warning: Unhandled Tasmota power sensor type', '_energy_reactivepower');
      expect(platform.services['139827_ENERGY_ReactivePower']).toBeDefined();
    });

    test('Adds ENERGY Voltage to existing Trailer Power accessory', () => {
      emitDiscovered(trailerEnergyVoltageTopic, trailerEnergyVoltageConfig);

      expect(api.registerPlatformAccessories).not.toHaveBeenCalled();
      expect(api.updatePlatformAccessories).toHaveBeenCalled();

      const updateCalls = (api.updatePlatformAccessories as ReturnType<typeof vi.spyOn>).mock.calls[0] as [any[]];
      const updatedAccessory = updateCalls[0][0];

      expect(updatedAccessory.displayName).toBe('Trailer Power');
      expect(updatedAccessory.context.device['139827_RL_1']).toBeDefined();
      expect(updatedAccessory.context.identifier).toBe('139827');

      // No new service added - missing dev_cla results in a warning and no service creation
      expect(updatedAccessory.services).toHaveLength(2);
      expect(updatedAccessory.services[1]).toBeInstanceOf(api.hap.Service.Outlet);

      // CurrentConsumption (Consumption) characteristic should be on the Outlet service
      const currentConsumptionUUID: UUID = 'E863F10A-079E-48FF-8F27-9C2605A29F52';
      expect(updatedAccessory.services[1].getCharacteristic('Voltage')).toBeDefined();
      expect(updatedAccessory.services[1].getCharacteristic('Voltage').UUID).toBe(currentConsumptionUUID);
      expect(updatedAccessory.services[1].getCharacteristic('Voltage').props.unit).toBe('V');
      expect(updatedAccessory.services[1].getCharacteristic('Voltage').props.format).toBe('float');
      expect(updatedAccessory.services[1].getCharacteristic('Voltage').props.minValue).toBe(0);
      expect(updatedAccessory.services[1].getCharacteristic('Voltage').props.maxValue).toBe(380);
      expect(updatedAccessory.services[1].getCharacteristic('Voltage').props.minStep).toBe(0.1);

      expect(platform.services['139827_ENERGY_Voltage']).toBeDefined();
    });

    test('Adds ENERGY Power sensor to existing Trailer Power accessory, adding CurrentConsumption characteristic', () => {
      emitDiscovered(trailerEnergyPowerTopic, trailerEnergyPowerConfig);

      expect(api.registerPlatformAccessories).not.toHaveBeenCalled();
      expect(api.updatePlatformAccessories).toHaveBeenCalled();

      const updateCalls = (api.updatePlatformAccessories as ReturnType<typeof vi.spyOn>).mock.calls[0] as [any[]];
      const updatedAccessory = updateCalls[0][0];

      expect(updatedAccessory.displayName).toBe('Trailer Power');
      expect(updatedAccessory.context.device['139827_RL_1']).toBeDefined();
      expect(updatedAccessory.context.identifier).toBe('139827');

      // Still 2 services - CurrentConsumption is added as a characteristic to the existing Outlet service
      expect(updatedAccessory.services).toHaveLength(2);
      expect(updatedAccessory.services[1]).toBeInstanceOf(api.hap.Service.Outlet);

      // CurrentConsumption (Consumption) characteristic should be on the Outlet service
      const currentConsumptionUUID: UUID = 'E863F10D-079E-48FF-8F27-9C2605A29F52';
      expect(updatedAccessory.services[1].getCharacteristic('Consumption')).toBeDefined();
      expect(updatedAccessory.services[1].getCharacteristic('Consumption').UUID).toBe(currentConsumptionUUID);
      expect(updatedAccessory.services[1].getCharacteristic('Consumption').props.unit).toBe('W');
      expect(updatedAccessory.services[1].getCharacteristic('Consumption').props.format).toBe('float');
      expect(updatedAccessory.services[1].getCharacteristic('Consumption').props.minValue).toBe(0);
      expect(updatedAccessory.services[1].getCharacteristic('Consumption').props.maxValue).toBe(12000);
      expect(updatedAccessory.services[1].getCharacteristic('Consumption').props.minStep).toBe(0.1);

      expect(platform.services['139827_ENERGY_Power']).toBeDefined();
    });

  });

});

// =============================================================================
// Garage Door tests
// =============================================================================

describe('Garage Door', () => {
  let api: HomebridgeAPI;
  let platform: tasmotaPlatform;

  beforeAll(() => {
    mockMqttEmitter.removeAllListeners();
    api = makeMockAPI();
    platform = new tasmotaPlatform(mockLog, { name: 'Tasmota', cleanup: 0, debug: true }, api);
    api.emit('didFinishLaunching');
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Registers Garage Door opener accessory', () => {
    emitDiscovered(garageDoorTopic, garageDoorConfig);

    expect(api.registerPlatformAccessories).toHaveBeenCalledTimes(1);

    const mockCalls = (api.registerPlatformAccessories as ReturnType<typeof vi.spyOn>).mock.calls[0] as [string, string, any[]];
    const registeredAccessory = mockCalls[2][0];

    expect(registeredAccessory.displayName).toBe('Garage Door');
    expect(registeredAccessory.context.device['FB6A07_RL_1']).toBeDefined();
    expect(registeredAccessory.context.identifier).toBe('FB6A07');

    // 2 services: AccessoryInformation + GarageDoorOpener
    expect(registeredAccessory.services).toHaveLength(2);
    expect(registeredAccessory.services[1]).toBeInstanceOf(api.hap.Service.GarageDoorOpener);

    // GarageDoorOpener requires CurrentDoorState and TargetDoorState
    expect(registeredAccessory.services[1].getCharacteristic('Current Door State')).toBeDefined();
    expect(registeredAccessory.services[1].getCharacteristic('Target Door State')).toBeDefined();

    expect(Object.keys(platform.services).length).toBe(1);
    expect(platform.services['FB6A07_RL_1']).toBeDefined();
  });

  test('Adds status sensor to existing Garage Door accessory, setting AccessoryInformation', () => {
    emitDiscovered(garageDoorStatusTopic, garageDoorStatusConfig);

    expect(api.registerPlatformAccessories).not.toHaveBeenCalled();
    expect(api.updatePlatformAccessories).toHaveBeenCalled();

    const updateCalls = (api.updatePlatformAccessories as ReturnType<typeof vi.spyOn>).mock.calls[0] as [any[]];
    const updatedAccessory = updateCalls[0][0];

    expect(updatedAccessory.displayName).toBe('Garage Door');

    // No new service added - status sensor populates AccessoryInformation only
    expect(updatedAccessory.services).toHaveLength(2);
    expect(updatedAccessory.services[1]).toBeInstanceOf(api.hap.Service.GarageDoorOpener);

    // AccessoryInformation should be populated from the dev object
    const accessoryInfo = updatedAccessory.getService(api.hap.Service.AccessoryInformation);
    expect(accessoryInfo).toBeDefined();
    expect(accessoryInfo!.getCharacteristic('Manufacturer').value).toBe('Tasmota');
    expect(accessoryInfo!.getCharacteristic('Model').value).toBe('Garage Door');
    expect(accessoryInfo!.getCharacteristic('Firmware Revision').value).toBe('9.5.0tasmota');
    expect(accessoryInfo!.getCharacteristic('Serial Number').value).toMatch(/^FB6A07-/);

    expect(platform.services['FB6A07_status']).toBeDefined();
  });

});

// =============================================================================
// Light tests
// =============================================================================

describe('Light', () => {
  let api: HomebridgeAPI;
  let platform: tasmotaPlatform;

  beforeAll(() => {
    mockMqttEmitter.removeAllListeners();
    api = makeMockAPI();
    platform = new tasmotaPlatform(mockLog, { name: 'Tasmota', cleanup: 0, debug: true }, api);
    api.emit('didFinishLaunching');
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Registers Bunkie Upper light accessory with On and Brightness characteristics', () => {
    emitDiscovered(bunkieUpperTopic, bunkieUpperConfig);

    expect(api.registerPlatformAccessories).toHaveBeenCalledTimes(1);

    const mockCalls = (api.registerPlatformAccessories as ReturnType<typeof vi.spyOn>).mock.calls[0] as [string, string, any[]];
    const registeredAccessory = mockCalls[2][0];

    expect(registeredAccessory.displayName).toBe('Bunkie Upper');
    expect(registeredAccessory.context.device['CBA0E5_LI_1']).toBeDefined();
    expect(registeredAccessory.context.identifier).toBe('CBA0E5');

    // 2 services: AccessoryInformation + Lightbulb
    expect(registeredAccessory.services).toHaveLength(2);
    expect(registeredAccessory.services[1]).toBeInstanceOf(api.hap.Service.Lightbulb);

    // Lightbulb should have On and Brightness characteristics
    expect(registeredAccessory.services[1].getCharacteristic('On')).toBeDefined();
    expect(registeredAccessory.services[1].getCharacteristic('On').UUID).toBe(api.hap.Characteristic.On.UUID);
    expect(registeredAccessory.services[1].getCharacteristic('Brightness')).toBeDefined();
    expect(registeredAccessory.services[1].getCharacteristic('Brightness').UUID).toBe(api.hap.Characteristic.Brightness.UUID);

    expect(Object.keys(platform.services).length).toBe(1);
    expect(platform.services['CBA0E5_LI_1']).toBeDefined();
  });

  test('Adds status sensor to existing Bunkie Upper accessory, setting AccessoryInformation', () => {
    emitDiscovered(bunkieUpperStatusTopic, bunkieUpperStatusConfig);

    expect(api.registerPlatformAccessories).not.toHaveBeenCalled();
    expect(api.updatePlatformAccessories).toHaveBeenCalled();

    const updateCalls = (api.updatePlatformAccessories as ReturnType<typeof vi.spyOn>).mock.calls[0] as [any[]];
    const updatedAccessory = updateCalls[0][0];

    expect(updatedAccessory.displayName).toBe('Bunkie Upper');

    // No new service added - status sensor populates AccessoryInformation only
    expect(updatedAccessory.services).toHaveLength(2);
    expect(updatedAccessory.services[1]).toBeInstanceOf(api.hap.Service.Lightbulb);

    // AccessoryInformation should be populated from the dev object
    const accessoryInfo = updatedAccessory.getService(api.hap.Service.AccessoryInformation);
    expect(accessoryInfo).toBeDefined();
    expect(accessoryInfo!.getCharacteristic('Manufacturer').value).toBe('Tasmota');
    expect(accessoryInfo!.getCharacteristic('Model').value).toBe('Feit DIMWIFI');
    expect(accessoryInfo!.getCharacteristic('Firmware Revision').value).toBe('9.5.0tasmota');
    expect(accessoryInfo!.getCharacteristic('Serial Number').value).toMatch(/^CBA0E5-/);

    expect(platform.services['CBA0E5_status']).toBeDefined();
  });

});

// =============================================================================
// Doorbell with Temp Sensor tests
// =============================================================================

describe('Doorbell with Temp Sensor', () => {
  let api: HomebridgeAPI;
  let platform: tasmotaPlatform;

  beforeAll(() => {
    mockMqttEmitter.removeAllListeners();
    api = makeMockAPI();
    platform = new tasmotaPlatform(mockLog, { name: 'Tasmota', cleanup: 0, debug: true }, api);
    api.emit('didFinishLaunching');
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Registers Doorbell Button switch accessory', () => {
    emitDiscovered(doorbellSwitchTopic, doorbellSwitchConfig);

    expect(api.registerPlatformAccessories).toHaveBeenCalledTimes(1);

    const mockCalls = (api.registerPlatformAccessories as ReturnType<typeof vi.spyOn>).mock.calls[0] as [string, string, any[]];
    const registeredAccessory = mockCalls[2][0];

    expect(registeredAccessory.displayName).toBe('Doorbell Button');
    expect(registeredAccessory.context.device['AC5811_RL_1']).toBeDefined();
    expect(registeredAccessory.context.identifier).toBe('AC5811');

    // 2 services: AccessoryInformation + Outlet (switch maps to Outlet)
    expect(registeredAccessory.services).toHaveLength(2);
    expect(registeredAccessory.services[1]).toBeInstanceOf(api.hap.Service.Outlet);
    expect(registeredAccessory.services[1].getCharacteristic('On')).toBeDefined();

    expect(Object.keys(platform.services).length).toBe(1);
    expect(platform.services['AC5811_RL_1']).toBeDefined();
  });

  test('Adds status sensor to existing Doorbell Button accessory, setting AccessoryInformation', () => {
    emitDiscovered(doorbellStatusTopic, doorbellStatusConfig);

    expect(api.registerPlatformAccessories).not.toHaveBeenCalled();
    expect(api.updatePlatformAccessories).toHaveBeenCalled();

    const updateCalls = (api.updatePlatformAccessories as ReturnType<typeof vi.spyOn>).mock.calls[0] as [any[]];
    const updatedAccessory = updateCalls[0][0];

    expect(updatedAccessory.displayName).toBe('Doorbell Button');

    // No new service added - status sensor populates AccessoryInformation only
    expect(updatedAccessory.services).toHaveLength(2);
    expect(updatedAccessory.services[1]).toBeInstanceOf(api.hap.Service.Outlet);

    // AccessoryInformation should be populated from the dev object
    const accessoryInfo = updatedAccessory.getService(api.hap.Service.AccessoryInformation);
    expect(accessoryInfo).toBeDefined();
    expect(accessoryInfo!.getCharacteristic('Manufacturer').value).toBe('Tasmota');
    expect(accessoryInfo!.getCharacteristic('Model').value).toBe('Doorbell Button');
    expect(accessoryInfo!.getCharacteristic('Firmware Revision').value).toBe('9.5.0sensors');
    expect(accessoryInfo!.getCharacteristic('Serial Number').value).toMatch(/^AC5811-/);

    expect(platform.services['AC5811_status']).toBeDefined();
  });

  test('Adds BME280 Temperature sensor to existing Doorbell Button accessory as a new TemperatureSensor service', () => {
    emitDiscovered(doorbellTempTopic, doorbellTempConfig);

    expect(api.registerPlatformAccessories).not.toHaveBeenCalled();
    expect(api.updatePlatformAccessories).toHaveBeenCalled();

    const updateCalls = (api.updatePlatformAccessories as ReturnType<typeof vi.spyOn>).mock.calls[0] as [any[]];
    const updatedAccessory = updateCalls[0][0];

    expect(updatedAccessory.displayName).toBe('Doorbell Button');
    expect(updatedAccessory.context.device['AC5811_RL_1']).toBeDefined();
    expect(updatedAccessory.context.identifier).toBe('AC5811');

    // 3 services: AccessoryInformation + Outlet (switch) + TemperatureSensor
    expect(updatedAccessory.services).toHaveLength(3);
    expect(updatedAccessory.services[1]).toBeInstanceOf(api.hap.Service.Outlet);
    expect(updatedAccessory.services[2]).toBeInstanceOf(api.hap.Service.TemperatureSensor);

    // TemperatureSensor should have CurrentTemperature characteristic
    expect(updatedAccessory.services[2].getCharacteristic('Current Temperature')).toBeDefined();
    expect(updatedAccessory.services[2].getCharacteristic('Current Temperature').UUID)
      .toBe(api.hap.Characteristic.CurrentTemperature.UUID);

    expect(platform.services['AC5811_BME280_Temperature']).toBeDefined();
  });

  test('Adds BME280 Humidity sensor to existing Doorbell Button accessory as a new HumiditySensor service', () => {
    emitDiscovered(doorbellHumidityTopic, doorbellHumidityConfig);

    expect(api.registerPlatformAccessories).not.toHaveBeenCalled();
    expect(api.updatePlatformAccessories).toHaveBeenCalled();

    const updateCalls = (api.updatePlatformAccessories as ReturnType<typeof vi.spyOn>).mock.calls[0] as [any[]];
    const updatedAccessory = updateCalls[0][0];

    expect(updatedAccessory.displayName).toBe('Doorbell Button');
    expect(updatedAccessory.context.identifier).toBe('AC5811');

    // 4 services: AccessoryInformation + Outlet + TemperatureSensor + HumiditySensor
    expect(updatedAccessory.services).toHaveLength(4);
    expect(updatedAccessory.services[3]).toBeInstanceOf(api.hap.Service.HumiditySensor);

    // HumiditySensor should have CurrentRelativeHumidity characteristic
    expect(updatedAccessory.services[3].getCharacteristic('Current Relative Humidity')).toBeDefined();
    expect(updatedAccessory.services[3].getCharacteristic('Current Relative Humidity').UUID)
      .toBe(api.hap.Characteristic.CurrentRelativeHumidity.UUID);

    expect(platform.services['AC5811_BME280_Humidity']).toBeDefined();
  });

  test('Adds BME280 DewPoint sensor to existing Doorbell Button accessory as a new TemperatureSensor service', () => {
    emitDiscovered(doorbellDewPointTopic, doorbellDewPointConfig);

    expect(api.registerPlatformAccessories).not.toHaveBeenCalled();
    expect(api.updatePlatformAccessories).toHaveBeenCalled();

    const updateCalls = (api.updatePlatformAccessories as ReturnType<typeof vi.spyOn>).mock.calls[0] as [any[]];
    const updatedAccessory = updateCalls[0][0];

    expect(updatedAccessory.displayName).toBe('Doorbell Button');
    expect(updatedAccessory.context.identifier).toBe('AC5811');

    // DewPoint has no dev_cla but unit_of_meas '°C' → TemperatureSensor added (5th service)
    expect(updatedAccessory.services).toHaveLength(5);

    const dewPointService = updatedAccessory.services.find((s: any) => s.displayName === 'Doorbell Button BME280 DewPoint');
    expect(dewPointService).toBeDefined();
    expect(dewPointService).toBeInstanceOf(api.hap.Service.TemperatureSensor);

    expect(platform.services['AC5811_BME280_DewPoint']).toBeDefined();
  });

  test('Adds BME280 Pressure sensor to existing Doorbell Button accessory as a new AirPressureSensor service', () => {
    emitDiscovered(doorbellPressureTopic, doorbellPressureConfig);

    expect(api.registerPlatformAccessories).not.toHaveBeenCalled();
    expect(api.updatePlatformAccessories).toHaveBeenCalled();

    const updateCalls = (api.updatePlatformAccessories as ReturnType<typeof vi.spyOn>).mock.calls[0] as [any[]];
    const updatedAccessory = updateCalls[0][0];

    expect(updatedAccessory.displayName).toBe('Doorbell Button');
    expect(updatedAccessory.context.identifier).toBe('AC5811');

    // 6 services: AccessoryInformation + Outlet + TemperatureSensor + HumiditySensor + TemperatureSensor(DewPoint) + AirPressureSensor
    expect(updatedAccessory.services).toHaveLength(6);

    const pressureService = updatedAccessory.services.find((s: any) => s.displayName === 'Doorbell Button BME280 Pressure');
    expect(pressureService).toBeDefined();
    // AirPressureSensor is a custom Eve service (UUID E863F00A)
    expect(pressureService?.UUID).toBe('E863F00A-079E-48FF-8F27-9C2605A29F52');

    // AirPressureSensor should have AirPressure characteristic (E863F10F)
    const airPressureChar = pressureService?.getCharacteristic('Air Pressure');
    expect(airPressureChar).toBeDefined();
    expect(airPressureChar?.UUID).toBe('E863F10F-079E-48FF-8F27-9C2605A29F52');

    expect(platform.services['AC5811_BME280_Pressure']).toBeDefined();
  });

});

// =============================================================================
// Fan
// =============================================================================

describe('Fan', () => {
  let api: HomebridgeAPI;
  let platform: tasmotaPlatform;

  beforeAll(() => {
    mockMqttEmitter.removeAllListeners();
    api = makeMockAPI();
    platform = new tasmotaPlatform(mockLog, { name: 'Tasmota', cleanup: 0, debug: true }, api);
    api.emit('didFinishLaunching');
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Registers West Bedroom Fan accessory with On and RotationSpeed characteristics', () => {
    emitDiscovered(westBedroomFanTopic, westBedroomFanConfig);

    expect(api.registerPlatformAccessories).toHaveBeenCalledTimes(1);

    const mockCalls = (api.registerPlatformAccessories as ReturnType<typeof vi.spyOn>).mock.calls[0] as [string, string, any[]];
    const registeredAccessory = mockCalls[2][0];

    expect(registeredAccessory.displayName).toBe('West Bedroom Fan');
    expect(registeredAccessory.context.device['302F1B_LI_2']).toBeDefined();
    expect(registeredAccessory.context.identifier).toBe('302F1B');
    expect(registeredAccessory.services).toHaveLength(2);
    expect(registeredAccessory.services[1]).toBeInstanceOf(api.hap.Service.Fan);

    expect(registeredAccessory.services[1].getCharacteristic('On')).toBeDefined();
    expect(registeredAccessory.services[1].getCharacteristic('On').UUID)
      .toBe(api.hap.Characteristic.On.UUID);

    expect(registeredAccessory.services[1].getCharacteristic('Rotation Speed')).toBeDefined();
    expect(registeredAccessory.services[1].getCharacteristic('Rotation Speed').UUID)
      .toBe(api.hap.Characteristic.RotationSpeed.UUID);

    expect(platform.services['302F1B_LI_2']).toBeDefined();
  });

  test('Adds West Bedroom light to existing West Bedroom Fan accessory as a new Lightbulb service', () => {
    emitDiscovered(westBedroomLightTopic, westBedroomLightConfig);

    expect(api.registerPlatformAccessories).not.toHaveBeenCalled();
    expect(api.updatePlatformAccessories).toHaveBeenCalled();

    const updateCalls = (api.updatePlatformAccessories as ReturnType<typeof vi.spyOn>).mock.calls[0] as [any[]];
    const updatedAccessory = updateCalls[0][0];

    expect(updatedAccessory.displayName).toBe('West Bedroom Fan');
    expect(updatedAccessory.context.identifier).toBe('302F1B');

    // 3 services: AccessoryInformation + Fan + Lightbulb
    expect(updatedAccessory.services).toHaveLength(3);
    expect(updatedAccessory.services[2]).toBeInstanceOf(api.hap.Service.Lightbulb);

    expect(updatedAccessory.services[2].getCharacteristic('On')).toBeDefined();
    expect(updatedAccessory.services[2].getCharacteristic('On').UUID)
      .toBe(api.hap.Characteristic.On.UUID);

    expect(platform.services['302F1B_LI_1']).toBeDefined();
  });

  test('Ignores 302F1B_LI_3 discovery with empty name, warning about missing friendly name', () => {
    emitDiscovered(westBedroomUnknownTopic, westBedroomUnknownConfig);

    expect(api.registerPlatformAccessories).not.toHaveBeenCalled();
    expect(api.updatePlatformAccessories).toHaveBeenCalled();

    const updateCalls = (api.updatePlatformAccessories as ReturnType<typeof vi.spyOn>).mock.calls[0] as [any[]];
    const updatedAccessory = updateCalls[0][0];

    expect(updatedAccessory.context.identifier).toBe('302F1B');

    // No new service added - missing friendly name
    expect(updatedAccessory.services).toHaveLength(3);

    expect(mockLog.warn).toHaveBeenCalledWith('Warning: missing friendly name for topic ', westBedroomUnknownTopic);
    expect(platform.services['302F1B_LI_3']).not.toBeDefined();
  });

  test('Ignores 302F1B_LI_4 discovery with empty name, warning about missing friendly name', () => {
    emitDiscovered(westBedroomUnknown4Topic, westBedroomUnknown4Config);

    expect(api.registerPlatformAccessories).not.toHaveBeenCalled();
    expect(api.updatePlatformAccessories).toHaveBeenCalled();

    const updateCalls = (api.updatePlatformAccessories as ReturnType<typeof vi.spyOn>).mock.calls[0] as [any[]];
    const updatedAccessory = updateCalls[0][0];

    expect(updatedAccessory.context.identifier).toBe('302F1B');

    // No new service added - missing friendly name
    expect(updatedAccessory.services).toHaveLength(3);

    expect(mockLog.warn).toHaveBeenCalledWith('Warning: missing friendly name for topic ', westBedroomUnknown4Topic);
    expect(platform.services['302F1B_LI_4']).not.toBeDefined();
  });

  test('Adds status sensor to existing West Bedroom Fan accessory, setting AccessoryInformation', () => {
    emitDiscovered(westBedroomStatusTopic, westBedroomStatusConfig);

    expect(api.registerPlatformAccessories).not.toHaveBeenCalled();
    expect(api.updatePlatformAccessories).toHaveBeenCalled();

    const updateCalls = (api.updatePlatformAccessories as ReturnType<typeof vi.spyOn>).mock.calls[0] as [any[]];
    const updatedAccessory = updateCalls[0][0];

    expect(updatedAccessory.displayName).toBe('West Bedroom Fan');
    expect(updatedAccessory.context.identifier).toBe('302F1B');

    // Services count unchanged - status updates AccessoryInformation only
    expect(updatedAccessory.services).toHaveLength(3);

    const infoService = updatedAccessory.services[0];
    expect(infoService.getCharacteristic('Model').value).toBe('Sonoff iFan03');
    expect(infoService.getCharacteristic('Manufacturer').value).toBe('Tasmota');
    expect(infoService.getCharacteristic('Firmware Revision').value).toBe('9.5.0tasmota');

    expect(platform.services['302F1B_status']).toBeDefined();
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
  val_tpl: '{{value_json[\'ENERGY\'][\'TotalStartTime\']}}',
  tasmotaType: 'sensor',
  pl_on: 'ON',
  pl_off: 'OFF',
};

const trailerEnergyPowerTopic = 'homeassistant/sensor/139827_ENERGY_Power/config';
const trailerEnergyPowerConfig = {
  name: 'Trailer Power ENERGY Power',
  stat_t: 'tele/tasmota_139827/SENSOR',
  avty_t: 'tele/tasmota_139827/LWT',
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  uniq_id: '139827_ENERGY_Power',
  dev: { ids: ['139827'] },
  unit_of_meas: 'W',
  dev_cla: 'power',
  frc_upd: true,
  val_tpl: '{{value_json[\'ENERGY\'][\'Power\']}}',
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
  val_tpl: '{{value_json[\'ENERGY\'][\'Total\']}}',
  tasmotaType: 'sensor',
  pl_on: 'ON',
  pl_off: 'OFF',
};

const trailerEnergyVoltageTopic = 'homeassistant/sensor/139827_ENERGY_Voltage/config';
const trailerEnergyVoltageConfig = {
  name: 'Trailer Power ENERGY Voltage',
  stat_t: 'tele/tasmota_139827/SENSOR',
  avty_t: 'tele/tasmota_139827/LWT',
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  uniq_id: '139827_ENERGY_Voltage',
  dev: { ids: ['139827'] },
  unit_of_meas: 'V',
  ic: 'mdi:alpha-v-circle-outline',
  frc_upd: true,
  val_tpl: '{{value_json[\'ENERGY\'][\'Voltage\']}}',
  tasmotaType: 'sensor',
  pl_on: 'ON',
  pl_off: 'OFF',
};

const trailerEnergyCurrentTopic = 'homeassistant/sensor/139827_ENERGY_Current/config';
const trailerEnergyCurrentConfig = {
  name: 'Trailer Power ENERGY Current',
  stat_t: 'tele/tasmota_139827/SENSOR',
  avty_t: 'tele/tasmota_139827/LWT',
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  uniq_id: '139827_ENERGY_Current',
  dev: { ids: ['139827'] },
  unit_of_meas: 'A',
  ic: 'mdi:alpha-a-circle-outline',
  frc_upd: true,
  val_tpl: '{{value_json[\'ENERGY\'][\'Current\']}}',
  tasmotaType: 'sensor',
  pl_on: 'ON',
  pl_off: 'OFF',
};

const trailerEnergyReactivePowerTopic = 'homeassistant/sensor/139827_ENERGY_ReactivePower/config';
const trailerEnergyReactivePowerConfig = {
  name: 'Trailer Power ENERGY ReactivePower',
  stat_t: 'tele/tasmota_139827/SENSOR',
  avty_t: 'tele/tasmota_139827/LWT',
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  uniq_id: '139827_ENERGY_ReactivePower',
  dev: { ids: ['139827'] },
  unit_of_meas: 'VAr',
  dev_cla: 'power',
  frc_upd: true,
  val_tpl: '{{value_json[\'ENERGY\'][\'ReactivePower\']}}',
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
  val_tpl: '{{value_json[\'RSSI\']}}',
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

const garageDoorTopic = 'homeassistant/switch/FB6A07_RL_1/config';
const garageDoorConfig = {
  name: 'Garage Door',
  stat_t: 'tele/tasmota_FB6A07/STATE',
  avty_t: 'tele/tasmota_FB6A07/LWT',
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  cmd_t: 'cmnd/tasmota_FB6A07/POWER',
  pl_off: 'OFF',
  pl_on: 'ON',
  val_tpl: '{{value_json.POWER}}',
  uniq_id: 'FB6A07_RL_1',
  dev: { ids: ['FB6A07'] },
  tasmotaType: 'garageDoor',
};

const garageDoorStatusTopic = 'homeassistant/sensor/FB6A07_status/config';
const garageDoorStatusConfig = {
  name: 'Garage Door status',
  stat_t: 'tele/tasmota_FB6A07/HASS_STATE',
  avty_t: 'tele/tasmota_FB6A07/LWT',
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  json_attr_t: 'tele/tasmota_FB6A07/HASS_STATE',
  unit_of_meas: '%',
  val_tpl: '{{value_json[\'RSSI\']}}',
  ic: 'mdi:information-outline',
  uniq_id: 'FB6A07_status',
  dev: {
    ids: ['FB6A07'],
    name: 'Garage Door',
    mdl: 'Garage Door',
    sw: '9.5.0(tasmota)',
    mf: 'Tasmota',
  },
  tasmotaType: 'sensor',
  pl_on: 'ON',
  pl_off: 'OFF',
};

const bunkieUpperTopic = 'homeassistant/light/CBA0E5_LI_1/config';
const bunkieUpperConfig = {
  name: 'Bunkie Upper',
  stat_t: 'tele/tasmota_CBA0E5/STATE',
  avty_t: 'tele/tasmota_CBA0E5/LWT',
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  cmd_t: 'cmnd/tasmota_CBA0E5/POWER',
  pl_off: 'OFF',
  pl_on: 'ON',
  stat_val_tpl: '{{value_json.POWER}}',
  uniq_id: 'CBA0E5_LI_1',
  dev: { ids: ['CBA0E5'] },
  bri_cmd_t: 'cmnd/tasmota_CBA0E5/Dimmer',
  bri_stat_t: 'tele/tasmota_CBA0E5/STATE',
  bri_scl: 100,
  on_cmd_type: 'brightness',
  bri_val_tpl: '{{value_json.Dimmer}}',
  tasmotaType: 'light',
};

const bunkieUpperStatusTopic = 'homeassistant/sensor/CBA0E5_status/config';
const bunkieUpperStatusConfig = {
  name: 'Bunkie Upper status',
  stat_t: 'tele/tasmota_CBA0E5/HASS_STATE',
  avty_t: 'tele/tasmota_CBA0E5/LWT',
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  json_attr_t: 'tele/tasmota_CBA0E5/HASS_STATE',
  unit_of_meas: '%',
  val_tpl: '{{value_json[\'RSSI\']}}',
  ic: 'mdi:information-outline',
  uniq_id: 'CBA0E5_status',
  dev: {
    ids: ['CBA0E5'],
    name: 'Bunkie Upper',
    mdl: 'Feit DIM/WIFI',
    sw: '9.5.0(tasmota)',
    mf: 'Tasmota',
  },
  tasmotaType: 'sensor',
  pl_on: 'ON',
  pl_off: 'OFF',
};

const doorbellSwitchTopic = 'homeassistant/switch/AC5811_RL_1/config';
const doorbellSwitchConfig = {
  name: 'Doorbell Button',
  stat_t: 'tele/tasmota_AC5811/STATE',
  avty_t: 'tele/tasmota_AC5811/LWT',
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  cmd_t: 'cmnd/tasmota_AC5811/POWER',
  pl_off: 'OFF',
  pl_on: 'ON',
  val_tpl: '{{value_json.POWER}}',
  uniq_id: 'AC5811_RL_1',
  dev: { ids: ['AC5811'] },
  tasmotaType: 'switch',
};

const doorbellStatusTopic = 'homeassistant/sensor/AC5811_status/config';
const doorbellStatusConfig = {
  name: 'Doorbell Button status',
  stat_t: 'tele/tasmota_AC5811/HASS_STATE',
  avty_t: 'tele/tasmota_AC5811/LWT',
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  json_attr_t: 'tele/tasmota_AC5811/HASS_STATE',
  unit_of_meas: '%',
  val_tpl: '{{value_json[\'RSSI\']}}',
  ic: 'mdi:information-outline',
  uniq_id: 'AC5811_status',
  dev: {
    ids: ['AC5811'],
    name: 'Doorbell Button',
    mdl: 'Doorbell Button',
    sw: '9.5.0(sensors)',
    mf: 'Tasmota',
  },
  tasmotaType: 'sensor',
  pl_on: 'ON',
  pl_off: 'OFF',
};

const doorbellTempTopic = 'homeassistant/sensor/AC5811_BME280_Temperature/config';
const doorbellTempConfig = {
  name: 'Doorbell Button BME280 Temperature',
  stat_t: 'tele/tasmota_AC5811/SENSOR',
  avty_t: 'tele/tasmota_AC5811/LWT',
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  uniq_id: 'AC5811_BME280_Temperature',
  dev: { ids: ['AC5811'] },
  unit_of_meas: '°C',
  dev_cla: 'temperature',
  frc_upd: true,
  val_tpl: '{{value_json[\'BME280\'][\'Temperature\']}}',
  tasmotaType: 'sensor',
  pl_on: 'ON',
  pl_off: 'OFF',
};

const doorbellHumidityTopic = 'homeassistant/sensor/AC5811_BME280_Humidity/config';
const doorbellHumidityConfig = {
  name: 'Doorbell Button BME280 Humidity',
  stat_t: 'tele/tasmota_AC5811/SENSOR',
  avty_t: 'tele/tasmota_AC5811/LWT',
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  uniq_id: 'AC5811_BME280_Humidity',
  dev: { ids: ['AC5811'] },
  unit_of_meas: '%',
  dev_cla: 'humidity',
  frc_upd: true,
  val_tpl: '{{value_json[\'BME280\'][\'Humidity\']}}',
  tasmotaType: 'sensor',
  pl_on: 'ON',
  pl_off: 'OFF',
};

const doorbellDewPointTopic = 'homeassistant/sensor/AC5811_BME280_DewPoint/config';
const doorbellDewPointConfig = {
  name: 'Doorbell Button BME280 DewPoint',
  stat_t: 'tele/tasmota_AC5811/SENSOR',
  avty_t: 'tele/tasmota_AC5811/LWT',
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  uniq_id: 'AC5811_BME280_DewPoint',
  dev: { ids: ['AC5811'] },
  unit_of_meas: '°C',
  ic: 'mdi:weather-rainy',
  frc_upd: true,
  val_tpl: '{{value_json[\'BME280\'][\'DewPoint\']}}',
  tasmotaType: 'sensor',
  pl_on: 'ON',
  pl_off: 'OFF',
};

const doorbellPressureTopic = 'homeassistant/sensor/AC5811_BME280_Pressure/config';
const doorbellPressureConfig = {
  name: 'Doorbell Button BME280 Pressure',
  stat_t: 'tele/tasmota_AC5811/SENSOR',
  avty_t: 'tele/tasmota_AC5811/LWT',
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  uniq_id: 'AC5811_BME280_Pressure',
  dev: { ids: ['AC5811'] },
  unit_of_meas: 'hPa',
  dev_cla: 'pressure',
  frc_upd: true,
  val_tpl: '{{value_json[\'BME280\'][\'Pressure\']}}',
  tasmotaType: 'sensor',
  pl_on: 'ON',
  pl_off: 'OFF',
};

const westBedroomFanTopic = 'homeassistant/light/302F1B_LI_2/config';
const westBedroomFanConfig = {
  name: 'West Bedroom Fan',
  stat_t: 'tele/tasmota_302F1B/STATE',
  avty_t: 'tele/tasmota_302F1B/LWT',
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  cmd_t: 'cmnd/tasmota_302F1B/FanSpeed',
  pl_off: '0',
  pl_on: '1',
  stat_val_tpl: '{{value_json.POWER2}}',
  uniq_id: '302F1B_LI_2',
  dev: { ids: ['302F1B'] },
  tasmotaType: 'fanFixed',
  pl_hi_spd: '3',
  pl_med_spd: '2',
  pl_lo_spd: '1',
  val_tpl: '{% if value_json.FanSpeed == 0 -%}0{%- elif value_json.FanSpeed > 0 -%}1{%- endif %}',
  bri_val_tpl: '{{value_json.FanSpeed*1/3*100}}',
  spds: ['off', 'low', 'medium', 'high'],
};

const westBedroomLightTopic = 'homeassistant/light/302F1B_LI_1/config';
const westBedroomLightConfig = {
  name: 'West Bedroom',
  stat_t: 'tele/tasmota_302F1B/STATE',
  avty_t: 'tele/tasmota_302F1B/LWT',
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  cmd_t: 'cmnd/tasmota_302F1B/POWER1',
  pl_off: 'OFF',
  pl_on: 'ON',
  stat_val_tpl: '{{value_json.POWER1}}',
  uniq_id: '302F1B_LI_1',
  dev: { ids: ['302F1B'] },
  tasmotaType: 'light',
};

const westBedroomUnknownTopic = 'homeassistant/light/302F1B_LI_3/config';
const westBedroomUnknownConfig = {
  name: '',
  stat_t: 'tele/tasmota_302F1B/STATE',
  avty_t: 'tele/tasmota_302F1B/LWT',
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  cmd_t: 'cmnd/tasmota_302F1B/POWER3',
  pl_off: 'OFF',
  pl_on: 'ON',
  stat_val_tpl: '{{value_json.POWER3}}',
  uniq_id: '302F1B_LI_3',
  dev: { ids: ['302F1B'] },
  tasmotaType: 'other',
};

const westBedroomStatusTopic = 'homeassistant/sensor/302F1B_status/config';
const westBedroomStatusConfig = {
  name: 'West Bedroom status',
  stat_t: 'tele/tasmota_302F1B/HASS_STATE',
  avty_t: 'tele/tasmota_302F1B/LWT',
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  json_attr_t: 'tele/tasmota_302F1B/HASS_STATE',
  unit_of_meas: '%',
  val_tpl: '{{value_json[\'RSSI\']}}',
  ic: 'mdi:information-outline',
  uniq_id: '302F1B_status',
  dev: {
    ids: ['302F1B'],
    name: 'West Bedroom',
    mdl: 'Sonoff iFan03',
    sw: '9.5.0(tasmota)',
    mf: 'Tasmota',
  },
  tasmotaType: 'sensor',
  pl_on: 'ON',
  pl_off: 'OFF',
};

const westBedroomUnknown4Topic = 'homeassistant/light/302F1B_LI_4/config';
const westBedroomUnknown4Config = {
  name: '',
  stat_t: 'tele/tasmota_302F1B/STATE',
  avty_t: 'tele/tasmota_302F1B/LWT',
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  cmd_t: 'cmnd/tasmota_302F1B/POWER4',
  pl_off: 'OFF',
  pl_on: 'ON',
  stat_val_tpl: '{{value_json.POWER4}}',
  uniq_id: '302F1B_LI_4',
  dev: { ids: ['302F1B'] },
  tasmotaType: 'other',
};