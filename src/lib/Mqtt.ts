import mqttClient from "mqtt";
import createDebug from 'debug';

import { EventEmitter } from "events";

const debug = createDebug('Tasmota:mqtt');
var connection;

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
          // debug('emit', topic, message.toString());
          this.emit(topic, topic, message);
          break;
      }
    });
  }

  availabilitySubscribe(topic) {
    // debug('availabilitySubscribe', topic);
    connection.subscribe(topic);
  }

  statusSubscribe(topic) {
    // debug('statusSubscribe', topic);
    connection.subscribe(topic);
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
