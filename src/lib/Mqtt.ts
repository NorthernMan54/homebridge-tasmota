import createDebug from "debug";
import { EventEmitter } from "events";
import mqttClient, { MqttClient } from "mqtt";

const debug = createDebug("Tasmota:mqtt");

interface Config {
  mqttHost: string;
  mqttUsername?: string;
  mqttPassword?: string;
}

interface WildcardTopic {
  topic: string;
}

export class Mqtt extends EventEmitter {
  private connection: MqttClient;
  private wildCardTopics: WildcardTopic[] = [];

  constructor(config: Config) {
    super();

    const options = {
      username: config.mqttUsername || "",
      password: config.mqttPassword || "",
    };

    this.connection = mqttClient.connect(`mqtt://${config.mqttHost}`, options);

    this.setupConnectionHandlers(config);
  }

  private setupConnectionHandlers(config: Config): void {
    this.connection.on("connect", () => {
      debug("Connected to MQTT broker");
      this.connection.subscribe("homeassistant/#");
    });

    this.connection.on("reconnect", () => {
      console.error("ERROR: MQTT reconnecting to", config.mqttHost);
    });

    this.connection.on("error", (err) => {
      console.error("ERROR: MQTT connection error", config.mqttHost, err);
    });

    this.connection.on("message", (topic, message) =>
      this.handleMessage(topic, message)
    );
  }

  private handleMessage(topic: string, message: Buffer): void {
    const subject = topic.split("/");

    switch (subject[0]) {
      case "homeassistant":
        this.handleHomeAssistantMessage(topic, message, subject);
        break;
      default:
        this.handleDefaultMessage(topic, message);
        break;
    }
  }

  private handleHomeAssistantMessage(
    topic: string,
    message: Buffer,
    subject: string[]
  ): void {
    if (message.length > 5 && topic.endsWith("config")) {
      try {
        const device = JSON.parse(message.toString());
        device.tasmotaType = subject[1];

        const validTypes = ["switch", "sensor", "binary_sensor", "light", "fan", "garageDoor"];
        if (validTypes.includes(subject[1])) {
          this.emit("Discovered", topic, device);
        }
      } catch (error) {
        debug("Error parsing message:", error);
        debug("Triggered by message:", message.toString());
      }
    } else if (topic.endsWith("config")) {
      this.emit("Remove", topic);
    }
  }

  private handleDefaultMessage(topic: string, message: Buffer): void {
    debug("Emit topic:", topic, message.toString());
    this.emit(topic, topic, message);

    if (this.isWildcardTopic(topic)) {
      const wildcard = this.getWildcardTopic(topic);
      debug("Emit wildcard:", wildcard, message.toString());
      this.emit(wildcard, wildcard, message);
    }
  }

  public availabilitySubscribe(topic: string): void {
    debug("Availability subscribe:", topic);
    this.connection.subscribe(topic);
  }

  public statusSubscribe(topic: string): void {
    debug("Status subscribe:", topic);
    this.connection.subscribe(topic);

    if (topic.includes("+") || topic.includes("#")) {
      this.wildCardTopics.push({ topic });
    }
  }

  public sendMessage(topic: string, message: string): void {
    debug("Send message:", topic, message);
    if (!topic || !message) {
      throw new Error("sendMessage requires both topic and message");
    }
    this.connection.publish(topic, message);
  }

  private isWildcardTopic(topic: string): boolean {
    return this.wildCardTopics.some((wildcard) =>
      this.mqttWildcard(topic, wildcard.topic)
    );
  }

  private getWildcardTopic(topic: string): string {
    const match = this.wildCardTopics.find((wildcard) =>
      this.mqttWildcard(topic, wildcard.topic)
    );
    return match?.topic || "";
  }

  private mqttWildcard(topic: string, wildcard: string): string[] | null {
    if (topic === wildcard) return [];

    if (wildcard === "#") return [topic];

    const topicSegments = topic.split("/");
    const wildcardSegments = wildcard.split("/");
    const result: string[] = [];

    for (let i = 0; i < topicSegments.length; i++) {
      if (wildcardSegments[i] === "+") {
        result.push(topicSegments[i]);
      } else if (wildcardSegments[i] === "#") {
        result.push(topicSegments.slice(i).join("/"));
        return result;
      } else if (wildcardSegments[i] !== topicSegments[i]) {
        return null;
      }
    }

    return wildcardSegments.length === topicSegments.length ? result : null;
  }
}
