Homebridge Plugin for Tasmota Devices that leverage's the Home Assistant Auto Discovery Function to configure and add devices.

## Required parameters

* mqttHost - This is the name of you MQTT server

# config.json

{
    "platform": "Tasmota",
    "name": "Tasmota",
    "mqttHost": "mqtt.local"
}

## Tasmota Device Config

1 - Enable Home Assistant Auto Discovery

```
SetOption19 1
```
