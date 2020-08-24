import mqttClient from "mqtt";
import createDebug from 'debug';

import { EventEmitter } from "events";

const debug = createDebug('Tasmota:mqtt');

export class Mqtt extends EventEmitter {

  constructor(config) {
    const connection = mqttClient.connect('mqtt://' + config.mqttHost);
    super();
    // debug("this", this);
    // debug("Connecting", this);
    connection.on('connect', function(this: Mqtt) {
      // debug("Connected", this);
      connection.subscribe("homeassistant/#");
      connection.subscribe("tele/+/STATE");
      connection.subscribe("tele/+/LWT");
      connection.subscribe("stat/+/RESULT");
    });

    connection.on('message', (topic, message) => {
      debug("Message: Topic %s -> %s", topic, message);

      const subject = topic.split('/');

      switch (subject[0]) {
        case "homeassistant":

          if(message) {
          const device = JSON.parse(message.toString());

          debug("subject", subject[1]);

          device.tasmotaType = subject[1];

          switch (subject[1]) {
            case "switch":
            case "sensor":
              debug("emit", subject[1], this);
              this.emit('Discovered', device);
              break;

          }}
          break;
        case "tele":
          switch (subject[2]) {
            case "LWT":
            case "sensor":
              debug("emit", 'Reachability', subject[1], message.toString());
              this.emit('Reachability', subject[1], message);
              break;

          }
          break;
        case "stat":
          switch (subject[2]) {
            default:
              debug("emit", 'Status', subject[1], message.toString());
              this.emit('Status', subject[1], message);
              break;

          }
          break;
      }

    });

  }
}
