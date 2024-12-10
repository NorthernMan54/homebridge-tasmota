import { findVal, normalizeMessage, renameKeys, replaceStringsInObject } from './utils';

describe('normalizeMessage', () => {
  test('should handle fanFixed tasmotaType', () => {
    const message = {
      tasmotaType: 'fanFixed',
      payload_high_speed: '3',
      payload_medium_speed: '2',
      payload_low_speed: '1',
      pl_off: '0',
      pl_on: '1',
      val_tpl: '{% if value_json.FanSpeed == 0 -%}0{%- elif value_json.FanSpeed > 0 -%}1{%- endif %}',
      bri_val_tpl: '{{value_json.FanSpeed*1/3*100}}',
      speeds: ['off', 'low', 'medium', 'high'],
      cmd_t: 'POWER2',
      unique_id: '123',
    };

    const expectedMessage = {
      tasmotaType: 'fanFixed',
      pl_hi_spd: '3',
      pl_med_spd: '2',
      pl_lo_spd: '1',
      pl_off: '0',
      pl_on: '1',
      val_tpl: '{% if value_json.FanSpeed == 0 -%}0{%- elif value_json.FanSpeed > 0 -%}1{%- endif %}',
      bri_val_tpl: '{{value_json.FanSpeed*1/3*100}}',
      spds: ['off', 'low', 'medium', 'high'],
      cmd_t: 'FanSpeed',
      uniq_id: '123',
    };

    const normalizedMessage = normalizeMessage(message);

    expect(normalizedMessage).toEqual(expectedMessage);
  });

  test('should rename keys in the message', () => {
    const message = {
      unique_id: '123',
      device_class: 'light',
      payload_on: 'ON',
      payload_off: 'OFF',
      state_topic: 'topic',
    };

    const expectedMessage = {
      uniq_id: '123',
      dev_cla: 'light',
      pl_on: 'ON',
      pl_off: 'OFF',
      stat_t: 'topic',
    };

    const normalizedMessage = normalizeMessage(message);

    expect(normalizedMessage).toEqual(expectedMessage);
  });

  test('should handle additional properties', () => {
    const message = {
      tasmotaType: 'additional',
      payload_high_speed: '3',
      payload_medium_speed: '2',
      payload_low_speed: '1',
      pl_off: '0',
      pl_on: '1',
      val_tpl: '{% if value_json.FanSpeed == 0 -%}0{%- elif value_json.FanSpeed > 0 -%}1{%- endif %}',
      bri_val_tpl: '{{value_json.FanSpeed*1/3*100}}',
      speeds: ['off', 'low', 'medium', 'high'],
      cmd_t: 'POWER2',
      unique_id: '123',
      additionalProp: 'additionalValue',
    };

    const expectedMessage = {
      tasmotaType: 'additional',
      pl_hi_spd: '3',
      pl_med_spd: '2',
      pl_lo_spd: '1',
      pl_off: '0',
      pl_on: '1',
      val_tpl: '{% if value_json.FanSpeed == 0 -%}0{%- elif value_json.FanSpeed > 0 -%}1{%- endif %}',
      bri_val_tpl: '{{value_json.FanSpeed*1/3*100}}',
      spds: ['off', 'low', 'medium', 'high'],
      cmd_t: 'POWER2',
      uniq_id: '123',
      additionalProp: 'additionalValue',
    };

    const normalizedMessage = normalizeMessage(message);

    expect(normalizedMessage).toEqual(expectedMessage);
  });

  // Add more tests for other scenarios...

});
describe('renameKeys', () => {
  test('should rename keys in a single object', () => {
    const obj = {
      unique_id: '123',
      device_class: 'light',
      payload_on: 'ON',
      payload_off: 'OFF',
      state_topic: 'topic',
    };

    const mapShortToLong = {
      unique_id: 'uniq_id',
      device_class: 'dev_cla',
      payload_on: 'pl_on',
      payload_off: 'pl_off',
      state_topic: 'stat_t',
    };

    const expectedObj = {
      uniq_id: '123',
      dev_cla: 'light',
      pl_on: 'ON',
      pl_off: 'OFF',
      stat_t: 'topic',
    };

    const renamedObj = renameKeys(obj, mapShortToLong);

    expect(renamedObj).toEqual(expectedObj);
  });

  test('should rename keys in an array of objects', () => {
    const arr = [
      {
        unique_id: '123',
        device_class: 'light',
        payload_on: 'ON',
        payload_off: 'OFF',
        state_topic: 'topic',
      },
      {
        unique_id: '456',
        device_class: 'fan',
        payload_on: 'ON',
        payload_off: 'OFF',
        state_topic: 'topic',
      },
    ];

    const mapShortToLong = {
      unique_id: 'uniq_id',
      device_class: 'dev_cla',
      payload_on: 'pl_on',
      payload_off: 'pl_off',
      state_topic: 'stat_t',
    };

    const expectedArr = [
      {
        uniq_id: '123',
        dev_cla: 'light',
        pl_on: 'ON',
        pl_off: 'OFF',
        stat_t: 'topic',
      },
      {
        uniq_id: '456',
        dev_cla: 'fan',
        pl_on: 'ON',
        pl_off: 'OFF',
        stat_t: 'topic',
      },
    ];

    const renamedArr = renameKeys(arr, mapShortToLong);

    expect(renamedArr).toEqual(expectedArr);
  });

  // Add more tests for other scenarios...

});
describe('replaceStringsInObject', () => {
  test('should replace strings in a single object', () => {
    const obj = {
      name: 'John Doe',
      age: 30,
      address: '123 Main St',
    };

    const findStr = 'John';
    const replaceStr = 'Jane';

    const expectedObj = {
      name: 'Jane Doe',
      age: 30,
      address: '123 Main St',
    };

    const replacedObj = replaceStringsInObject(obj, findStr, replaceStr);

    expect(replacedObj).toEqual(expectedObj);
  });

  test('should replace strings in an array of objects', () => {
    const arr = [
      {
        name: 'John Doe',
        age: 30,
        address: '123 Main St',
      },
      {
        name: 'Jane Smith',
        age: 25,
        address: '456 Elm St',
      },
    ];

    const findStr = 'Doe';
    const replaceStr = 'Smith';

    const expectedArr = {
      "0":
      {
        name: 'John Smith',
        age: 30,
        address: '123 Main St',
      },
      "1": {
        name: 'Jane Smith',
        age: 25,
        address: '456 Elm St',
      },
    };

    const replacedArr = replaceStringsInObject(arr, findStr, replaceStr);

    expect(replacedArr).toEqual(expectedArr);
  });

  // Add more tests for other scenarios...

});
describe('findVal', () => {
  test('should find value in a flat object', () => {
    const object = {
      key1: 'value1',
      key2: 'value2',
      key3: 'value3',
    };

    const key = 'key2';
    const expectedValue = 'value2';

    const result = findVal<string>(object, key);

    expect(result).toEqual(expectedValue);
  });

  test('should find value in a nested object', () => {
    const object = {
      key1: 'value1',
      key2: {
        key3: 'value3',
        key4: 'value4',
      },
      key5: 'value5',
    };

    const key = 'key4';
    const expectedValue = 'value4';

    const result = findVal<string>(object, key);

    expect(result).toEqual(expectedValue);
  });

  test('should return undefined if key is not found', () => {
    const object = {
      key1: 'value1',
      key2: 'value2',
      key3: 'value3',
    };

    const key = 'key4';

    const result = findVal<string>(object, key);

    expect(result).toBeUndefined();
  });

  // Add more tests for other scenarios...

});