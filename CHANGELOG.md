# Changelog

All notable changes to this project will be documented in this file. This project uses [Semantic Versioning](https://semver.org/).

## 0.0.29 (2020-09-16)

## [Version 0.0.29](https://github.com/northernman54/homebridge-tasmota/compare/v0.0.27...v0.0.29)

#### Changes

- Added support for WemosDB - My esp8266 doorbell monitor
- Improved translation of home assistant abbreviations
- Improved topic subscriptions
- Ability to refresh accessory name and other device details from Device
- Device removal when setoption19 is set to 0
- Device reconfiguration when setoption30 is changed

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
