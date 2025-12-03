
export interface Message {
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

  [key: string]: any; // Allow additional properties
}


export function renameKeys<T extends Record<string, any>>(
  obj: T | T[],
  mapShortToLong: Record<string, string>,
): T | T[] {

  let result: any;

  if (Array.isArray(obj)) {
    result = obj.map((item) => renameKeys(item, mapShortToLong));
  } else {

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

export function replaceStringsInObject(

  obj: Record<string, any>,
  findStr: string,
  replaceStr: string,

  cache: Map<any, any> = new Map(),

): Record<string, any> {
  // Check if the object has already been processed to avoid circular references
  if (cache.has(obj)) {
    return cache.get(obj);
  }

  // Initialize result object

  const result: Record<string, any> = {};
  cache.set(obj, result); // Cache the object reference

  for (const [key, value] of Object.entries(obj)) {

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

export function normalizeMessage(message: Message): Message {
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


export function findVal<T>(object: Record<string, any>, key: string): T | undefined {
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

/*
    * HSV to RGB conversion from https://stackoverflow.com/questions/17242144/javascript-convert-hsb-hsv-color-to-rgb-accurately
    * accepts parameters
    * h  Object = {h:x, s:y, v:z}
    * OR
    * h, s, v
    */


export function HSVtoRGB(h: any, s: number, v: number) {
  let r = 0, g = 0, b = 0;
  if (arguments.length === 1) {
    s = h.s;
    v = h.v;
    h = h.h;
  }
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
      r = v;
      g = p;
      b = q;
      break;
  }

  const rgb = [0, 0, 0];
  rgb[0] = Math.round(r * 255);
  rgb[1] = Math.round(g * 255);
  rgb[2] = Math.round(b * 255);
  return (
    rgb
  );
}

/* accepts parameters
 * r  Object = {r:x, g:y, b:z}
 * OR
 * r, g, b
 */
export function RGBtoHSV(r: number, g: number, b: number) {
  // debug('from', r, g, b);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = (max === 0 ? 0 : d / max);
  const v = max / 255;
  // debug('max', )
  switch (max) {
    case min:
      h = 0;
      break;
    case r:
      h = (g - b) + d * (g < b ? 6 : 0);
      h /= 6 * d;
      break;
    case g:
      h = (b - r) + d * 2;
      h /= 6 * d;
      break;
    case b: h = (r - g) + d * 4;
      h /= 6 * d;
      break;
  }

  return {
    h,
    s,
    v,
  };
}

export function RGBtoScaledHSV(r: string, g: string, b: string) {
  const hsv = RGBtoHSV(Number.parseFloat(r), Number.parseFloat(g), Number.parseFloat(b));
  // debug('to', hsv);
  return {
    h: Math.round(hsv.h * 360),
    s: Math.round(hsv.s * 100),
    v: Math.round(hsv.v * 100),
  };
}

export function ScaledHSVtoRGB(h: number, s: number, v: number) {
  return HSVtoRGB(h / 360, s / 100, v / 100);
}

export function HSBtoTasmota(h: number, s: number, b: number) {
  const hsb = [0, 0, 0];
  hsb[0] = h;
  hsb[1] = s;
  hsb[2] = b;
  return (
    hsb
  );
}
