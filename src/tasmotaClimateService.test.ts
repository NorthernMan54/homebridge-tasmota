import { EventEmitter } from 'events';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
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

// Fake timers so the discovery debounce and the 500 ms command debounce can be driven synchronously
vi.useFakeTimers();

function emitDiscovered(topic: string, config: Record<string, any>) {
  (mockMqttEmitter as EventEmitter).emit('Discovered', topic, config);
  vi.runAllTimers();
}

// --- Fixtures (OMG gatewayCONNEX discovery, zone 1) ---

const UNIQ_ID = 'AABBCC-connex-zone1';
const CLIMATE_TOPIC = `homeassistant/climate/${UNIQ_ID}/config`;
const TEMP_CMD_T = 'home/OMG_ESP32_CONNEX/commands/MQTTtoCONNEX';
const TEMP_STAT_T = 'home/OMG_ESP32_CONNEX/CONNEXtoMQTT/gateway';

const climateConfig = {
  name: 'CONNEX: Zone 1',
  uniq_id: UNIQ_ID,
  tasmotaType: 'climate',
  temp_cmd_t: TEMP_CMD_T,
  temp_cmd_tpl: '{"zone":1,"temperature":{{ value }}}',
  temp_stat_t: TEMP_STAT_T,
  temp_stat_tpl: '{{ value_json.zones.get(\'1\', {}).get(\'setpoint\') }}',
  mode_stat_t: TEMP_STAT_T,
  mode_stat_tpl: 'heat',
  modes: ['heat'],
  curr_temp_t: 'home/OMG_ESP32_CONNEX/CLIMAtoMQTT/bme',
  curr_temp_tpl: '{{ value_json.tempc }}',
  min_temp: 0,
  max_temp: 30,
  temp_step: 0.5,
  avty_t: 'home/OMG_ESP32_CONNEX/LWT',
  pl_avail: 'Online',
  pl_not_avail: 'Offline',
  dev: { ids: ['AABBCC'] },
};

const statusPayload = (zones: Record<string, unknown>) => Buffer.from(JSON.stringify({
  radio: 'ok',
  controllerid: '4D06',
  zones,
}));

// --- Tests ---

describe('CONNEX zone 1 climate', () => {
  let api: HomebridgeAPI;
  let platform: tasmotaPlatform;

  beforeAll(() => {
    mockMqttEmitter.removeAllListeners();
    api = makeMockAPI();
    platform = new tasmotaPlatform(mockLog, { name: 'Tasmota', cleanup: 0, debug: true }, api);
    api.emit('didFinishLaunching');
    emitDiscovered(CLIMATE_TOPIC, climateConfig);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const thermostat = () => platform.services[UNIQ_ID]?.service as any;

  test('creates a Thermostat service from the discovery fixture', () => {
    expect(platform.services[UNIQ_ID]).toBeDefined();
    const service = thermostat();
    expect(service).toBeInstanceOf(api.hap.Service.Thermostat);
    expect(service.displayName).toBe('CONNEX: Zone 1');

    const target = service.getCharacteristic(api.hap.Characteristic.TargetTemperature);
    expect(target.props.minValue).toBe(0);
    expect(target.props.maxValue).toBe(30);
    expect(target.props.minStep).toBe(0.5);

    expect(service.getCharacteristic(api.hap.Characteristic.TargetHeatingCoolingState).props.validValues)
      .toEqual([api.hap.Characteristic.TargetHeatingCoolingState.HEAT]);
    expect(service.getCharacteristic(api.hap.Characteristic.CurrentHeatingCoolingState).props.validValues)
      .toEqual([api.hap.Characteristic.CurrentHeatingCoolingState.OFF, api.hap.Characteristic.CurrentHeatingCoolingState.HEAT]);
  });

  test('shows heating only while the room is below the setpoint', () => {
    const BME_T = 'home/OMG_ESP32_CONNEX/CLIMAtoMQTT/bme';
    const state = () => thermostat().getCharacteristic(api.hap.Characteristic.CurrentHeatingCoolingState).value;
    mockMqttEmitter.emit(TEMP_STAT_T, TEMP_STAT_T, statusPayload({ 1: { setpoint: 22 } }));
    mockMqttEmitter.emit(BME_T, BME_T, Buffer.from('{"tempc":21.2}'));
    expect(state()).toBe(api.hap.Characteristic.CurrentHeatingCoolingState.HEAT);

    mockMqttEmitter.emit(TEMP_STAT_T, TEMP_STAT_T, statusPayload({ 1: { setpoint: 20 } }));
    expect(state()).toBe(api.hap.Characteristic.CurrentHeatingCoolingState.OFF);

    mockMqttEmitter.emit(BME_T, BME_T, Buffer.from('{"tempc":19.5}'));
    expect(state()).toBe(api.hap.Characteristic.CurrentHeatingCoolingState.HEAT);
  });

  test('keeps the last heating state within the 0.2 degree band', () => {
    const BME_T = 'home/OMG_ESP32_CONNEX/CLIMAtoMQTT/bme';
    const { HEAT, OFF } = api.hap.Characteristic.CurrentHeatingCoolingState;
    const state = () => thermostat().getCharacteristic(api.hap.Characteristic.CurrentHeatingCoolingState).value;
    const room = (t: number) => mockMqttEmitter.emit(BME_T, BME_T, Buffer.from(`{"tempc":${t}}`));
    mockMqttEmitter.emit(TEMP_STAT_T, TEMP_STAT_T, statusPayload({ 1: { setpoint: 20 } }));
    room(20.1);
    expect(state()).toBe(OFF);
    room(19.9); // inside the band: stays off
    expect(state()).toBe(OFF);
    room(19.7); // below the band: heating
    expect(state()).toBe(HEAT);
    room(19.9); // inside the band: keeps heating
    expect(state()).toBe(HEAT);
    room(20); // reached the setpoint: idle
    expect(state()).toBe(OFF);
  });

  test('status payload sets TargetTemperature from zone 1 setpoint', () => {
    mockMqttEmitter.emit(TEMP_STAT_T, TEMP_STAT_T, statusPayload({ 1: { setpoint: 20.5, source: 'gateway', age: 0 } }));

    expect(thermostat().getCharacteristic(api.hap.Characteristic.TargetTemperature).value).toBe(20.5);
  });

  test('status without zone 1 is ignored', () => {
    mockMqttEmitter.emit(TEMP_STAT_T, TEMP_STAT_T, statusPayload({ 1: { setpoint: 19 } }));
    expect(thermostat().getCharacteristic(api.hap.Characteristic.TargetTemperature).value).toBe(19);

    mockMqttEmitter.emit(TEMP_STAT_T, TEMP_STAT_T, statusPayload({ 2: { setpoint: 25 } }));

    expect(thermostat().getCharacteristic(api.hap.Characteristic.TargetTemperature).value).toBe(19);
  });

  test('setting 21.5 publishes once to temp_cmd_t after the debounce', () => {
    const sendSpy = vi.spyOn(mockMqttEmitter, 'sendMessage');
    const callback = vi.fn();

    thermostat().getCharacteristic(api.hap.Characteristic.TargetTemperature).emit('set', 21.5, callback);

    expect(callback).toHaveBeenCalledWith(null);
    expect(sendSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledWith(TEMP_CMD_T, '{"zone":1,"temperature":21.5}');
  });
});
