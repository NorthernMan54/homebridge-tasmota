Homebridge Plugin for Tasmota Devices that leverage's the Home Assistant Auto Discovery Function to configure and add devices.  And remove the need to manually configure Tasmota devices with Homebridge.

## Tasmota Device's Supported

* switch - WiOn (17) Outlet Module
* light - Tuya Dimmer (54) Dimmer Switch

## Homebridge config.json Configuration

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

1. Enable Home Assistant Auto Discovery from the console

```
SetOption19 1
```

2. MQTT Configuration

I found that some of my devices were not using a unique Topic for devices and I needed to update the configuration to

**Topic:** tasmota_%06X

## Known issues

1 - Accessory names are doubled with Tasmota version 8.1.3 to 8.4 - This is an issue with Tasmota firmware and is being tracked [here](https://github.com/arendst/Tasmota/issues/8995).

i.e. "Scanner Scanner"
