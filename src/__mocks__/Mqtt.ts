import { EventEmitter } from 'events';

class MockMqtt extends EventEmitter {
  statusSubscribe(topic: string, callback?: (...args: any[]) => void) {
    if (typeof callback === 'function') {
      this.on(topic, callback);
    }
    return { event: topic };
  }

  availabilitySubscribe(topic: string, callback?: (...args: any[]) => void) {
    if (typeof callback === 'function') {
      this.on(topic, callback);
    }
    return { event: topic };
  }

  sendMessage(_topic: string, _message: string) { }
  publish(_topic: string, _message: string) { }
  subscribe(_topic: string) { }
}

export const mockMqttEmitter = new MockMqtt();

export class Mqtt {
  constructor() {
    return mockMqttEmitter;
  }
}
