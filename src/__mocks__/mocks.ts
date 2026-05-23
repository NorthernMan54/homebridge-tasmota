import { jest } from '@jest/globals';

export const UNIQ_ID = 'sensor_test';

export function makeDevice(overrides = {}) {
  return {
    uniq_id: UNIQ_ID,
    name: 'Test Sensor',
    dev_cla: 'temperature',
    stat_t: 'tele/tasmota/SENSOR',
    avty_t: 'tele/tasmota/LWT',
    val_tpl: '{{ value_json.temperature }}',
    unit_of_meas: 'C',
    pl_not_avail: 'Offline',
    ...overrides,
  };
}

export function makePlatform(device = makeDevice()) {
  const uuid = `mock-uuid-${UNIQ_ID}`;
  return {
    api: { hap: { uuid: { generate: jest.fn().mockReturnValue(uuid) } } },
    Characteristic: {
      Name: 'Name',
      ConfiguredName: 'ConfiguredName',
      CurrentTemperature: 'CurrentTemperature',
      CarbonDioxideDetected: { CO2_LEVELS_ABNORMAL: 1, CO2_LEVELS_NORMAL: 0 },
    },
    CustomCharacteristics: {
      ElectricCurrent: 'ElectricCurrent',
      Voltage: 'Voltage',
      CurrentConsumption: 'CurrentConsumption',
      TotalConsumption: 'TotalConsumption',
    },
    mqttHost: { on: jest.fn(), statusSubscribe: jest.fn(), availabilitySubscribe: jest.fn(), sendMessage: jest.fn() },
    config: { history: false },
    log: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
    FakeGatoHistoryService: jest.fn(),
    teleperiod: 300,
    autoCleanup: jest.fn(),
  };
}

export function makeAccessory(device = makeDevice()) {
  const mockCharacteristic = {
    on: jest.fn().mockReturnThis(),
    listenerCount: jest.fn().mockReturnValue(0),
    value: null,
    updateValue: jest.fn(),
    displayName: 'ConfiguredName',
  };
  const mockService = {
    displayName: device.name,
    getCharacteristic: jest.fn().mockReturnValue(mockCharacteristic),
    addCharacteristic: jest.fn().mockReturnValue(mockCharacteristic),
    setCharacteristic: jest.fn().mockReturnThis(),
  };
  return {
    context: { device: { [UNIQ_ID]: device } },
    displayName: device.name,
    getService: jest.fn().mockReturnValue(undefined),
    addService: jest.fn().mockReturnValue(mockService),
    _mockService: mockService,
    _mockCharacteristic: mockCharacteristic,
  };
}

export const SWITCH_UNIQ_ID = '139827_RL_1';

export function makeSwitchDevice(overrides = {}) {
  return {
    name: 'Trailer Power',
    stat_t: 'tele/tasmota_139827/STATE',
    avty_t: 'tele/tasmota_139827/LWT',
    pl_avail: 'Online',
    pl_not_avail: 'Offline',
    cmd_t: 'cmnd/tasmota_139827/POWER',
    pl_off: 'OFF',
    pl_on: 'ON',
    val_tpl: '{{value_json.POWER}}',
    uniq_id: SWITCH_UNIQ_ID,
    dev: { ids: ['139827'] },
    tasmotaType: 'switch',
    ...overrides,
  };
}

export function makeSwitchPlatform(device = makeSwitchDevice()) {
  const uuid = `mock-uuid-${SWITCH_UNIQ_ID}`;
  return {
    api: { hap: { uuid: { generate: jest.fn().mockReturnValue(uuid) } } },
    Characteristic: {
      Name: 'Name',
      ConfiguredName: 'ConfiguredName',
      CurrentTemperature: 'CurrentTemperature',
      CarbonDioxideDetected: { CO2_LEVELS_ABNORMAL: 1, CO2_LEVELS_NORMAL: 0 },
    },
    CustomCharacteristics: {
      ElectricCurrent: 'ElectricCurrent',
      Voltage: 'Voltage',
      CurrentConsumption: 'CurrentConsumption',
      TotalConsumption: 'TotalConsumption',
    },
    mqttHost: { on: jest.fn(), statusSubscribe: jest.fn(), availabilitySubscribe: jest.fn(), sendMessage: jest.fn() },
    config: { history: false },
    log: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
    FakeGatoHistoryService: jest.fn(),
    teleperiod: 300,
    autoCleanup: jest.fn(),
  };
}

export function makeSwitchAccessory(device = makeSwitchDevice()) {
  const mockCharacteristic = {
    on: jest.fn().mockReturnThis(),
    listenerCount: jest.fn().mockReturnValue(0),
    value: null,
    updateValue: jest.fn(),
    displayName: 'ConfiguredName',
  };
  const mockService = {
    displayName: device.name,
    getCharacteristic: jest.fn().mockReturnValue(mockCharacteristic),
    addCharacteristic: jest.fn().mockReturnValue(mockCharacteristic),
    setCharacteristic: jest.fn().mockReturnThis(),
  };
  return {
    context: { device: { [SWITCH_UNIQ_ID]: device } },
    displayName: device.name,
    getService: jest.fn().mockReturnValue(undefined),
    addService: jest.fn().mockReturnValue(mockService),
    _mockService: mockService,
    _mockCharacteristic: mockCharacteristic,
  };
}