import mqttClient from "mqtt";
import createDebug from 'debug';

import { EventEmitter } from "events";

const debug = createDebug('Tasmota:mqtt');

export class Mqtt extends EventEmitter {

  constructor(config) {
    const connection = mqttClient.connect('mqtt://' + config.mqttHost);
    super();
    debug("this", this);
    // debug("Connecting", this);
    connection.on('connect', function(this: Mqtt) {
      // debug("Connected", this);
      connection.subscribe("homeassistant/#");
    });

    connection.on('message', (topic, message) => {
      debug("Message: Topic %s -> %s", topic, message);

      const subject = topic.split('/');

      const device = JSON.parse(message.toString());

      debug("subject", subject[1]);

      device.tasmotaType = subject[1];

      switch (subject[1]) {
        case "switch":
        case "sensor":
          debug("emit", subject[1], this);
          this.emit('Discovered', device);
          break;

      }

    });

  }
}
