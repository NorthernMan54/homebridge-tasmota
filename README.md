Homebridge Plugin for Tasmota Devices that leverage's the Home Assistant Auto Discovery Function to configure and add devices.  And remove the need to manually configure Tasmota devices with Homebridge.

## Tasmota Device's Supported

* switch - WiOn (17) Outlet Module
* light - Tuya Dimmer (54) Dimmer Switch

# Homebridge Configuration

## config.json

```
{
    "platform": "Tasmota",
    "name": "Tasmota",
    "mqttHost": "mqtt.local"
}
```

## Required parameters

* mqttHost - This is the name of you MQTT server

## Tasmota Device Config

1 - Enable Home Assistant Auto Discovery

```
SetOption19 1
```
