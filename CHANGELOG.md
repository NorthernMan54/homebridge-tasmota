# Changelog

All notable changes to this project will be documented in this file. This project uses [Semantic Versioning](https://semver.org/).

## 0.2.0 (2024-10-10)

## [Version 0.1.12](https://github.com/northernman54/homebridge-tasmota/compare/v0.1.18...v0.1.12)

#### Changes

- Preperation for Homebridge 2.0
- Minor exception fixes

## 0.1.18 (2024-06-09)

## [Version 0.1.18](https://github.com/northernman54/homebridge-tasmota/compare/v0.1.16...v0.1.18)

#### Changes

- Automate publishing
  
## 0.1.16 (2024-06-09)

## [Version 0.1.16](https://github.com/northernman54/homebridge-tasmota/compare/v0.1.11...v0.1.16)

#### Changes

- Don't create accessory if friendly name is empty
- Fix documentation

## 0.1.11 (2024-06-09)

## [Version 0.1.11](https://github.com/northernman54/homebridge-tasmota/compare/v0.1.9...v0.1.11)

#### Changes

- Fix for iFan module

## 0.1.9 (2023-05-21)

## [Version 0.1.9](https://github.com/northernman54/homebridge-tasmota/compare/v0.1.7...v0.1.9)

#### Changes

- Fixed naming for devices with multiple services.

## 0.1.7 (2023-05-15)

## [Version 0.1.7](https://github.com/northernman54/homebridge-tasmota/compare/v0.1.4...v0.1.7)

#### Changes

- Fixed Outlet in Use
- Fixes for #45 #44 #35
  
## 0.1.4 (2021-06-07)

## [Version 0.1.3](https://github.com/northernman54/homebridge-tasmota/compare/v0.1.3...v0.1.4)

#### Changes

- Added TOC to DEVICES.md

## 0.1.3 (2021-04-01)

## [Version 0.1.3](https://github.com/northernman54/homebridge-tasmota/compare/v0.1.0...v0.1.3)

#### Changes

- Support for Tasmota 10.x.x and RGB bulbs #43

## 0.1.0 (2021-02-04)

## [Version 0.1.0](https://github.com/northernman54/homebridge-tasmota/compare/v0.0.126...v0.1.0)

#### Changes

- Updated Tasmota settings gui in the Homebridge UI to support injecting configuration options into the MQTT Discovery message.  This new setting `MQTT Discovery Message Injection` replaces the existing setting `override` with a format that works with Homebridge UI.
- Please note that you can use either injection or override but not both at the same time.
- When implementing this change, identified a latent defect that the existing override settings are removed by the Homebridge UI.  If your using an override, do not use the Homebridge UI to edit your config.json.
- To ease moving from overide to injections, if debug logging is enabled the plugin will convert your override to an injection during inital startup of homebridge ( prior to the scan code being displayed. )
- Fix for issue #33, fahrenheit not being respected by homebridge
- Added a `tasmotaType` `fanFixed` as a simplified macro for a Sonoff iFan03 configuration.  Updated DEVICES.md to reflect this.
- Added preliminary support for device_class contact sensors.  Further details on device configuration to come.

## 0.0.126 (2021-12-28)

## [Version 0.0.124](https://github.com/northernman54/homebridge-tasmota/compare/v0.0.125...v0.0.126)

#### Changes

- Fix for incorrect temperature historical graphs #40
- Improved handling of OpenMQTTGateway devices and corrected system information service
- Fix for duplicated historical graphs from devices with the same name

## 0.0.125 (2021-12-12)

## [Version 0.0.124](https://github.com/northernman54/homebridge-tasmota/compare/v0.0.124...v0.0.125)

#### Changes

- Made changes to the new device discovery routine, and stopped the adding of accessories without any services
- Added a malformed accessory cleanup routine that is triggered on startup, any accessory without services will be removed from the Configuration.  The accessories being removed would should up in the HomeApp as 'Not Supported'
- These changes were as a result of my work with OpenMQTTGateway and the accidental creation of several hundred malformed IBEACON accessories.
- Changes to the documentation of MCULED ( Was tweaking my Christmas Configuration )

## 0.0.124 (2021-10-28)

## [Version 0.0.124](https://github.com/northernman54/homebridge-tasmota/compare/v0.0.120...v0.0.124)

#### Changes

- Add support for a Homebrew Garage Door controller based on a esp8266 relay Board
- Fix for power control of Lights with Tasmota 9.5.0

## 0.0.120 (2021-06-28)

## [Version 0.0.119](https://github.com/northernman54/homebridge-tasmota/compare/v0.0.117...v0.0.120)

#### Changes

- Changed valid minimum value for a BME280 Pressure sensor to 300 in alignment with datasheet.

## 0.0.117 (2021-06-18)

## [Version 0.0.115](https://github.com/northernman54/homebridge-tasmota/compare/v0.0.115...v0.0.117)

#### Changes

- Added support for OpenMQTTGateway DT24 Bluetooth Voltmeter

## 0.0.115 (2021-05-20)

## [Version 0.0.115](https://github.com/northernman54/homebridge-tasmota/compare/v0.0.112...v0.0.115)

#### Changes

- Added support for SonOff iFan03 as a configuration override

## 0.0.112 (2021-04-6)

## [Version 0.0.112](https://github.com/northernman54/homebridge-tasmota/compare/v0.0.111...v0.0.112)

#### Changes

- Tweaks for OpenMQTTGateway PiLight sensor devices

## 0.0.111 (2021-03-25)

## [Version 0.0.111](https://github.com/northernman54/homebridge-tasmota/compare/v0.0.100...v0.0.111)

#### Changes

- Fixes for homebridge 1.3.4
- Support for FAN devices with fixed speeds ( off, low, medium and high). Tested with OpenMQTTGateway, Hampton Bay and an injected FAN config via node-red ( see DEVICES.md )
- Improved logging for MQTT connection errors
- Tweaks for OpenMQTTGateway devices

## 0.0.100 (2021-02-06)

## [Version 0.0.100](https://github.com/northernman54/homebridge-tasmota/compare/v0.0.77...v0.0.100)

#### Changes

- Fixes for homebridge 1.3.0
- Add auto discovery support for ESP Home devices, tks [Zach White](https://github.com/skullydazed)

## 0.0.77 (2020-12-16)

## [Version 0.0.70](https://github.com/northernman54/homebridge-tasmota/compare/v0.0.67...v0.0.77)

#### Changes

- Added support for RGB Effects control using a TV Accessory widget and the input selection slider to select effects scheme.
- Fix for issue #21 - Colour temperature causing error messages
- Updated DEVICES.md with my latest personal device settings


## 0.0.67 (2020-10-30)

## [Version 0.0.67](https://github.com/northernman54/homebridge-tasmota/compare/v0.0.22...v0.0.67)

#### Changes

- Fix for OpenMQTTGateway devices crashing plugin
- Fix for color flip flops
- Support for Pressure sensor on BME280 and other others ( Only visible from HomeKit apps that support pressure )
- Support for ZMAi-90 Current Sensor / Switch
- Support for Fakegato history for Temperature, Humidity, Current and Pressure sensors.
- Added support for overriding the discovery response
- Added tasmota device type fan, to allow control of Fan ( Based on a dimmable device )
- Added tasmota binary sensor device moisture as a water leak device

## 0.0.32 (2020-09-30)

## [Version 0.0.32](https://github.com/northernman54/homebridge-tasmota/compare/v0.0.27...v0.0.32)

#### Changes

- Added support for WemosDB - My esp8266 doorbell monitor
- Improved translation of home assistant abbreviations
- Improved topic subscriptions
- Ability to refresh accessory name and other device details from Device
- Device removal when setoption19 is set to 0
- Device reconfiguration when setoption30 is changed
- Support for [AZ-7798 CO2 Monitor](https://tasmota.github.io/docs/AZ-7798) - Tks Jeroen Vermeulen

## 0.0.27 (2020-09-16)

## [Version 0.0.27](https://github.com/northernman54/homebridge-tasmota/compare/v0.0.26...v0.0.27)

#### Changes

- Fix temperature sensors support for below zero temperatures
- Added support for RGB and Color changing light bulbs ( issue #11 )

## 0.0.26 (2020-09-13)

## [Version 0.0.26](https://github.com/northernman54/homebridge-tasmota/compare/v0.0.24...v0.0.26)

#### Changes

- Fixed updating sensor status on startup
- Removed duplicate service creation when a device restarts
- Reduced frequency of status update messages to whole numbers only ( Issue #5 )
- Cleanup logging messages and debug messages
- Added logging of missing sensor data ( ie sensor removed or disconnected from device )
- Fix for issue #6 luminance sensors

## 0.0.24 (2020-09-10)

## [Version 0.0.24](https://github.com/northernman54/homebridge-tasmota/compare/v0.0.21...v0.0.24)

#### Changes

- Added support for MQTT Username and Passwords - Thanks to Tobix99 for PR #8
- Fix for Sensors going 'Not Responding', part of Issue #6

## 0.0.21 (2020-09-05)

## [Version 0.0.21](https://github.com/northernman54/homebridge-tasmota/compare/v0.0.20...v0.0.21)

#### Changes

- Updated statueUpdate logging to only log Delta values, and use debug for non changing updates

## 0.0.20 (2020-09-03)

## [Version 0.0.20](https://github.com/northernman54/homebridge-tasmota/compare/v0.0.19...v0.0.20)

#### Changes

- Added support for Colour Temperature on lights
- Updated Issue templates to include details on the Tasmota device

## 0.0.19 (2020-09-01)

## [Version 0.0.19](https://github.com/northernman54/homebridge-tasmota/compare/v0.0.16...v0.0.19)

#### Changes

- Fix for the automated cleanup routine being too aggressive and cleaning up devices prematurely

## 0.0.16 (2020-08-31)

## [Version 0.0.16](https://github.com/northernman54/homebridge-tasmota/compare/v0.0.9...v0.0.16)

#### Changes

- Added support sensor devices
- Added support for multiple relay devices
- Usage of Jinja templates for value extraction ( in alignment with HASS design )
- Use of teleperiod to get current status on startup of plugin

## 0.0.11 (2020-08-27)

## [Version 0.0.11](https://github.com/northernman54/homebridge-tasmota/compare/v0.0.9...v0.0.11)

#### Changes

- Added support for the automated cleanup of disconnected devices

## 0.0.9 (2020-08-27)

## [Version 0.0.9](https://github.com/northernman54/homebridge-tasmota/compare/v0.0.8...v0.0.9)

#### Changes

- Added CHANGELOG.md

## 0.0.8 (2020-08-27)

## [Version 0.0.8](https://github.com/northernman54/homebridge-tasmota/compare/v0.0.7...v0.0.8)

#### Changes

- Added support for homebridge-config-ui-x

## 0.0.7 (2020-08-26)

## [Version 0.0.7](https://github.com/northernman54/homebridge-tasmota/compare/v0.0.2...v0.0.7)

#### Changes

- Initial deployment with support for Tasmota Lights and Switches

## Before 0.0.7

### No Changelog

- No Changelog before 0.0.7
