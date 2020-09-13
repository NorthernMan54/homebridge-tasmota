[![NPM Downloads](https://img.shields.io/npm/dm/homebridge-tasmota.svg?style=flat)](https://npmjs.org/package/homebridge-tasmota)

Homebridge Plugin for Tasmota Devices that leverage's the Home Assistant Auto Discovery Function to configure and add devices.  And remove the need to manually configure Tasmota devices with Homebridge.  So far this has been tested with Switches/Outlets, Dimmers/Light's and temperature sensors ymmv for other devices.

## Features

* Automatic discovery and configuration of supported Tasmota devices in Homebridge/Homekit.
* Cleanup and removal of disconnected devices after 24 hours.
* Support for these types of devices Outlets, Dimmers, Sensors and Lightbulbs with Colour Temperature.

## Tasmota Device's Tested YMMV for other devices

* switch - WiOn (17) Outlet Module
* light - Tuya Dimmer (54) Dimmer Switch
* sensor - Generic (18) with a bme280 connected
* relay - ESP with multiple relays connected.
* Arilux LC06 - Light with Dimmer and Colour Temperature capabilities

## Installation / Configuration

For installation and configuration of the plugin please use the homebridge UI/console.

### Tasmota Device Config

1. Enable Home Assistant Auto Discovery from the console

```
SetOption19 1
```

* Please note that this setting will change the topics of your Tasmota device and a couple of other settings and will break existing integrations.  Please see here (under setoption19)[https://tasmota.github.io/docs/Commands/#setoption19]

2. MQTT Topic Configuration

I found that some of my devices were not using a unique Topic for devices and I needed to update the configuration to

**Topic:** tasmota_%06X

This showed up when looking at MQTT messages and I was seeing them with this Topic.

```
sonoff/tele/STATE

or

tasmota/tele/STATE
```

## Technical Details

Under the covers this plugin leverages the Home Assistant Auto Discovery Function (setOption19) built into the Tasmota firmware and the [MQTT Discovery](https://www.home-assistant.io/docs/mqtt/discovery/) feature built into Home Assistant.  And uses the information provided by the Tasmota device to configure the HomeKit Accessory automatically without requiring within Homebridge.  

## Known issues

### Accessory Names Doubled

Accessory names are doubled with Tasmota version 8.1.3 to 8.4 - This is an issue with Tasmota firmware and is being tracked [here](https://github.com/arendst/Tasmota/issues/8995).  As a workaround downgrade to Tasmota version 8.1

i.e. "Scanner Scanner"

### Phantom Devices or Services

As device discovery is leveraging Home Assistant MQTT Auto Discovery, it is using these retained messages on your MQTT server, and will create and recreate them based on these retained messages.  To eradicate these phantom devices the retained messages for the appropriate accessory / device need to removed from your MQTT server using a tool like MQTT Explorer.

The Home Assistant MQTT Auto Discovery messages live under the topic 'homeassistant/' and a device can have multiple messages that need to be removed depending on the number and type of services.  If you make a mistake and accidentally delete a message for an active device, rebooting the device or setting 'setoption19 1' will recreate messages.

If you change the configuration in Tasmota of an existing device, and the old characteristics are still visible, you will need to clean up the 'Home Assistant MQTT Auto Discovery' messages for the device then disconnect the device for the cleanup period.  You can temporarily change the cleanup period to 0.125 which is approx 10 minutes if your in a hurry.

## Discord Server

A channel #tasmota has been created on the Homebridge Discord Server.

## Backlog prior to Production

* [x] Add config.schema.json for homebridge-config-ui-x
* [x] Add automated removal of non-responding devices
* [x] Add support for sensors
* [x] Add support for multiple relays
* [ ] Add support for RGB Lights
* [x] Enable debug logging via config.json
* [x] Clean up README
* [x] Clean up debug and production logging
