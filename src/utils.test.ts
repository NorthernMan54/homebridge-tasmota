import { normalizeMessage } from './utils';

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

  // Add more tests for other scenarios...

});