[![NPM Downloads](https://img.shields.io/npm/dm/homebridge-tasmota.svg?style=flat)](https://npmjs.org/package/homebridge-tasmota)

Homebridge Plugin for Tasmota Devices that leverage's the Home Assistant Auto Discovery Function to configure and add devices.  And remove the need to manually configure Tasmota devices with Homebridge.  So far this has been tested with Switches/Outlets, Dimmers/Light's and temperature sensors ymmv for other devices.

## Features

* Automatic discovery and configuration of supported Tasmota devices in Homebridge/Homekit.
* Cleanup and removal of disconnected devices after 24 hours.

## Tasmota Device's Tested YMMV for other devices

* switch - WiOn (17) Outlet Module
* light - Tuya Dimmer (54) Dimmer Switch
* sensor - Generic (18) with a bme280 connected
* relay - ESP with multiple relays connected.

## Installation / Configuration

For installation and configuration of the plugin please use the homebridge UI/console.

### Tasmota Device Config

1. Enable Home Assistant Auto Discovery from the console

```
SetOption19 1
```

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

1 - Accessory names are doubled with Tasmota version 8.1.3 to 8.4 - This is an issue with Tasmota firmware and is being tracked [here](https://github.com/arendst/Tasmota/issues/8995).  As a workaround downgrade to Tasmota version 8.1

i.e. "Scanner Scanner"

2 - It can take up to 5 minutes for initial status/values to appear after restarting homebridge.

## Discord Server

A channel #tasmota has been created on the Homebridge Discord Server.

## Backlog prior to Production

* [x] Add config.schema.json for homebridge-config-ui-x
* [x] Add automated removal of non-responding devices
* [x] Add support for sensors
* [x] Add support for multiple relays
* [ ] Add support for RGB Lights
* [x] Enable debug logging via config.json
* [ ] Clean up README
* [x] Clean up debug and production logging
