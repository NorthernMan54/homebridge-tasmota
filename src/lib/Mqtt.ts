import mqttClient from "mqtt";
import createDebug from 'debug';

import { EventEmitter } from "events";

const debug = createDebug('Tasmota:mqtt');
var connection;

var wildCardTopics: any = [];

export class Mqtt extends EventEmitter {
  public emit: any;

  constructor(config) {
    var options = {
      username: config['mqttUsername'] || "",
      password: config['mqttPassword'] || ""
    }
    connection = mqttClient.connect('mqtt://' + config.mqttHost, options);
    super();
    // debug("this", this);
    // debug("Connecting", this);
    connection.on('connect', function(this: Mqtt) {
      // debug("Connected", this);
      connection.subscribe("homeassistant/#");
      /*
      connection.subscribe("tele/+/STATE");
      connection.subscribe("tele/+/SENSOR");
      connection.subscribe("tele/+/LWT");
      connection.subscribe("stat/+/RESULT");
      connection.subscribe("+/tele/STATE");
      connection.subscribe("+/tele/SENSOR");
      connection.subscribe("+/tele/LWT");
      connection.subscribe("+/stat/RESULT");
      */
    });

    connection.on('reconnect', function() {
      console.error('ERROR: mqtt reconnect to', config.mqttHost);
    });

    connection.on('error', function(err) {
      console.error('ERROR: mqtt connection error ', config.mqttHost, err);
    });

    connection.on('message', (topic, message) => {
      // debug("Message: Topic %s -> %s", topic, message.toString());

      const subject = topic.split('/');

      switch (subject[0]) {
        case "homeassistant":

          if (message.length > 5 && topic.endsWith("config")) {
            try {
              const device = JSON.parse(message.toString());

              device.tasmotaType = subject[1];

              switch (subject[1]) {
                case "switch":
                case "sensor":
                case "binary_sensor":
                case "light":
                case "fan":
                  // debug("emit", subject[1], this);
                  this.emit('Discovered', topic, device);
                  break;

              }
            } catch (error) {
              debug("Error:", error);
              debug("Triggerd by:", message.toString());
            }
          } else if (topic.endsWith("config")) {
            this.emit('Remove', topic);
            // debug('Remove', topic);
          }
          break;
        default:
          debug('emit', topic, message.toString());
          this.emit(topic, topic, message);
          if (isWildcardTopic(topic)) {
            debug('emit - wildcard', getWildcardTopic(topic), message.toString());
            this.emit(getWildcardTopic(topic), getWildcardTopic(topic), message);
          }
          break;
      }
    });
  }

  availabilitySubscribe(topic) {
    // debug('availabilitySubscribe', topic);
    connection.subscribe(topic);
  }

  statusSubscribe(topic) {
    connection.subscribe(topic);
    // fix for openmqttgateway
    if (topic.includes('+') || topic.includes('#')) {
    //  debug('statusSubscribe - wildcard', topic);
      wildCardTopics.push({ "topic": topic });
    } else {
    //  debug('statusSubscribe - not wildcard', topic);
    }
  }

  sendMessage(topic, message) {
    debug("sendMessage", topic, message);
    if (message && topic) {
      connection.publish(topic, message);
    } else {
      throw new Error('sendMessage no message ' + topic);
    }
  }
}

function isWildcardTopic(topic) {
  // debug("isWildcardTopic", topic, wildCardTopics);
  var match: boolean = false;
  var index = wildCardTopics.findIndex((wildcard) => {
    // debug("mqttWildcard", topic, wildcard.topic);
    if (mqttWildcard(topic, wildcard.topic)) {
      // debug("match", topic, wildcard.topic);
      match = true;
    }
  });
  // debug("done", topic, match);
  return match;
}

function getWildcardTopic(topic) {
  // debug("getWildcardTopic", topic, wildCardTopics);
  var match: String = "";
  var index = wildCardTopics.findIndex(function(wildcard) {
    if (mqttWildcard(topic, wildcard.topic)) {
      // debug("getWildcardTopic - match", topic, wildcard.topic);
      match = wildcard.topic;
    }
  });
  // debug("get-done", topic, wildCardTopics[index]);
  return match;
}

/*
 * mqttWildcard('test/foo/bar', 'test/foo/bar'); // []
 * mqttWildcard('test/foo/bar', 'test/+/bar'); // ['foo']
 * mqttWildcard('test/foo/bar', 'test/#'); // ['foo/bar']
 * mqttWildcard('test/foo/bar/baz', 'test/+/#'); // ['foo', 'bar/baz']
 * mqttWildcard('test/foo/bar/baz', 'test/+/+/baz'); // ['foo', 'bar']

 * mqttWildcard('test', 'test/#'); // []
 * mqttWildcard('test/', 'test/#'); // ['']

 * mqttWildcard('test/foo/bar', 'test/+'); // null
 * mqttWildcard('test/foo/bar', 'test/nope/bar'); // null
*/

function mqttWildcard(topic, wildcard) {
  if (topic === wildcard) {
    return [];
  } else if (wildcard === '#') {
    return [topic];
  }

  var res: any = [];

  var t = String(topic).split('/');
  var w = String(wildcard).split('/');

  var i = 0;
  for (var lt = t.length; i < lt; i++) {
    if (w[i] === '+') {
      res.push(t[i]);
    } else if (w[i] === '#') {
      res.push(t.slice(i).join('/'));
      return res;
    } else if (w[i] !== t[i]) {
      return null;
    }
  }

  if (w[i] === '#') {
    i += 1;
  }

  return (i === w.length) ? res : null;
}
