var mqttClient = require('mqtt');

var config = {
  mqttHost: 'mqtt.local',
  "protocolId": "MQIsdp",
  "protocolVersion": 3
};

var options = {
  username: config['mqttUsername'] || "",
  password: config['mqttPassword'] || ""
}

var cleanUpTopics = [];
var identifier = process.argv[2].toString();

var connection = mqttClient.connect('mqtt://' + config.mqttHost, options);
connection.subscribe("homeassistant/#");

connection.on('message', (topic, message) => {
  if (message) {
    message = normalizeMessage(JSON.parse(message.toString()));
    // console.log('message', topic, message);
    if (message.dev.ids[0] === identifier) {
      console.log('Found', topic);
      cleanUpTopics.push(topic);
    }
  }
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms * 1000));
}

async function test() {
  await sleep(15);
  connection.unsubscribe("homeassistant/#");
  cleanUpTopics.forEach((item, i) =>  {
    console.log('CleanUp', item);
    // connection.publish(item, '', { retain: true });
    connection.publish(item, '', { retain: true }, function(err) {
      console.log(err);
    });
    //await sleep(1);
  });
  await sleep(2);
  connection.end();
  process.exit();
}

test();

function normalizeMessage(message) {

  const translation = {
    unique_id: 'uniq_id',
    device_class: 'dev_cla',
    payload_on: 'pl_on',
    payload_off: 'pl_off',
    device: 'dev',
    model: 'mdl',
    sw_version: 'sw',
    manufacturer: 'mf',
    identifiers: 'ids',
  };

  message = renameKeys(message, translation);

  if (message['~']) {
    message = replaceStringsInObject(message, '~', message['~']);
  }

  if (message.stat_t === 'sonoff/tele/STATE' || message.stat_t === 'tasmota/tele/STATE') {
    console.log('ERROR: %s has an incorrectly configure MQTT Topic, please make it unique.', message.name);
  }

  return (message);
}

function replaceStringsInObject(obj, findStr, replaceStr, cache = new Map()) {
  if (cache && cache.has(obj)) {
    return cache.get(obj);
  }

  const result = {};

  cache && cache.set(obj, result);

  for (const [key, value] of Object.entries(obj)) {
    let v = null;

    if (typeof value === 'string') {
      v = value.replace(RegExp(findStr, 'gi'), replaceStr);
    } else if (Array.isArray(value)) {
      // debug('isArray', value);
      v = value;
      // for (var i = 0; i < value.length; i++) {
      //    v[i] = replaceStringsInObject(value, findStr, replaceStr, cache);
      // }
    } else if (typeof value === 'object') {
      // debug('object', value);
      v = replaceStringsInObject(value, findStr, replaceStr, cache);
    } else {
      v = value;
    }
    result[key] = v;
  }

  return result;
}

function renameKeys(o, mapShortToLong) {
  let build, key, destKey, value;

  if (Array.isArray(o)) {
    build = [];
  } else {
    build = {};
  }
  for (key in o) {
    // Get the destination key
    destKey = mapShortToLong[key] || key;

    // Get the value
    value = o[key];

    // If this is an object, recurse
    if (typeof value === 'object') {
      // debug('recurse', value);
      value = renameKeys(value, mapShortToLong);
    }

    // Set it on the result using the destination key
    build[destKey] = value;
  }
  return build;
}



/*

{
  "name": "MCULED",
  "cmd_t": "~cmnd/POWER",
  "stat_t": "~tele/STATE",
  "val_tpl": "{{value_json.POWER}}",
  "pl_off": "OFF",
  "pl_on": "ON",
  "avty_t": "~tele/LWT",
  "pl_avail": "Online",
  "pl_not_avail": "Offline",
  "uniq_id": "AC54C1_LI_1",
  "device": {
    "identifiers": ["AC54C1"],
    "connections": [
      ["mac", "68:C6:3A:AC:54:C1"]
    ]
  },
  "~": "tasmota_AC54C1/",
  "bri_cmd_t": "~cmnd/Dimmer",
  "bri_stat_t": "~tele/STATE",
  "bri_scl": 100,
  "on_cmd_type": "brightness",
  "bri_val_tpl": "{{value_json.Dimmer}}",
  "rgb_cmd_t": "~cmnd/Color2",
  "rgb_stat_t": "~tele/STATE",
  "rgb_val_tpl": "{{value_json.Color.split(',')[0:3]|join(',')}}",
  "fx_cmd_t": "~cmnd/Scheme",
  "fx_stat_t": "~tele/STATE",
  "fx_val_tpl": "{{value_json.Scheme}}",
  "fx_list": ["0", "1", "2", "3", "4"]
}


*/
