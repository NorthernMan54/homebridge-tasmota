<H1>Sample Device Configurations ( My personal collection )</H1>

<!--ts-->
* [Sample Device Configurations ( My personal collection )](#sample-device-configurations--my-personal-collection-)
* [My standard config after setting name and device configuration ](#my-standard-config-after-setting-name-and-device-configuration-)
   * [Tasmota Configuration](#tasmota-configuration)
* [Sonoff IFAN03](#sonoff-ifan03)
   * [Tasmota Configuration](#tasmota-configuration-1)
   * [configuration override of discovery object to create a FAN ( post version 0.1.0 )](#configuration-override-of-discovery-object-to-create-a-fan--post-version-010-)
   * [configuration override of discovery object to create a FAN ( pre version 0.1.0 )](#configuration-override-of-discovery-object-to-create-a-fan--pre-version-010-)
   * [Slave a FEIT Wifi Dimmer Wall Switch to an iFan as a light switch](#slave-a-feit-wifi-dimmer-wall-switch-to-an-ifan-as-a-light-switch)
* [BME280 Temperature Sensor - <a href="docs/MCUIOT.md">MCUIOT</a>](docs/MCUIOT.md)
* [DHT11 Temperature Sensor - <a href="docs/MCUIOT.md">MCUIOT</a>](docs/MCUIOT.md)
* [Water Leak Sensor with On/Off control](#water-leak-sensor-with-onoff-control)
   * [LEAK Tasmota configuration - <a href="docs/MCUIOT.md#dht-yl">DHT11</a>](docs/MCUIOT.md#dht-yl)
   * [Leak Tasmota configuration - <a href="docs/MCUIOT.md#dht-yl">BME280</a>](docs/MCUIOT.md#dht-yl)
* [Motion + BME280 Temperature Sensor](#motion--bme280-temperature-sensor)
* [PIR Motion + BME280 Temperature Sensor + BH1750 Lux Illuminance Sensor](#pir-motion--bme280-temperature-sensor--bh1750-lux-illuminance-sensor)
* [ZMAi-90 Current Sensor Switch](#zmai-90-current-sensor-switch)
* [MCULED Device with RGB+W Strip](#mculed-device-with-rgbw-strip)
* [MCULED Device with RGB+W Strip - Version 2 ( Basement )](#mculed-device-with-rgbw-strip---version-2--basement-)
* [MCULED Device with RGB+W Strip - Version 2 ( Cottage Sink )](#mculed-device-with-rgbw-strip---version-2--cottage-sink-)
* [Tuya Dimmer Module as a FAN](#tuya-dimmer-module-as-a-fan)
* [Trailer Relay Board](#trailer-relay-board)
* [Gowfeel EN71 Water Valve](#gowfeel-en71-water-valve)
* [Homebrew Doorbutton Button](#homebrew-doorbutton-button)
* [Homebrew Garage Door Opener](#homebrew-garage-door-opener)
* [CE SMART Wifi Dimmer](#ce-smart-wifi-dimmer)
* [FEIT Wifi Dimmer](#feit-wifi-dimmer)
   * [Using a FEIT Wifi Dimmer as a remote switch to OpenBK RGBCCT Potlights](#using-a-feit-wifi-dimmer-as-a-remote-switch-to-openbk-rgbcct-potlights)
* [Turn off after 30 minutes](#turn-off-after-30-minutes)
* [Hampton Bay Fan/Light RF Remote Control ( 303.9 Mhz )](#hampton-bay-fanlight-rf-remote-control--3039-mhz-)
* [Valor Fireplace Remote ( 315 Mhz )](#valor-fireplace-remote--315-mhz-)
* [Treatlife DS03 Fan Controller and Light Dimmer](#treatlife-ds03-fan-controller-and-light-dimmer)
* [OpenMQTTGateway devices](#openmqttgateway-devices)
* [Hampton Bay Light](#hampton-bay-light)
* [Hampton Bay FAN](#hampton-bay-fan)
* [openMQTTGateway / PiLight temperature sensor](#openmqttgateway--pilight-temperature-sensor)
* [Internet Connection WatchDog](#internet-connection-watchdog)
   * [Version 1 ( Uses node-red to monitor google.com and turn off the plug )](#version-1--uses-node-red-to-monitor-googlecom-and-turn-off-the-plug-)
   * [Version 2](#version-2)
<!--te-->

# My standard config after setting name and device configuration <!-- omit in toc -->

## Tasmota Configuration

```
Backlog MqttHost mqtt.local; topic tasmota_%06X; setoption57 1; setoption19 1
```

# Sonoff IFAN03

## Tasmota Configuration

```
Backlog MqttHost mqtt.local; topic tasmota_%06X; setoption57 1; module 71; webbutton1 Light; webbutton2 Off; webbutton3 Fan Low; webbutton4 Fan Med; webbutton5 Fan High; SetOption30 1; devicename Master; friendlyname1 Master; friendlyname2 Master Fan; setoption19 1;

Backlog Rule1 on FanSpeed#Data do teleperiod break; rule1 1
```

## configuration override of discovery object to create a FAN ( post version 0.1.0 )

`302F1B` is the Tasmota ID

`Message Topic to apply override to` - `302F1B_LI_2`
`Key:` - `tasmotaType`
`Value:` - `fanFixed`

`Message Topic to apply override to` - `302F1B_LI_3`
`Key:` - `tasmotaType`
`Value:` - `other`

`Message Topic to apply override to` - `302F1B_LI_4`
`Key:` - `tasmotaType`
`Value:` - `other`

## configuration override of discovery object to create a FAN ( pre version 0.1.0 )

`302F1B` is the Tasmota ID

```
"302F1B_LI_3": {
   "tasmotaType": "other"
},
"302F1B_LI_4": {
   "tasmotaType": "other"
},
"302F1B_LI_2": {
"tasmotaType": "fan",
"payload_high_speed": "3",
"payload_medium_speed": "2",
"payload_low_speed": "1",
"pl_off": "0",
"pl_on": "1",
"val_tpl": "{% if value_json.FanSpeed == 0 -%}0{%- elif value_json.FanSpeed > 0 -%}1{%- endif %}",
"bri_val_tpl": "{{value_json.FanSpeed*1/3*100}}",
"cmd_t": "cmnd/tasmota_302F1B/FanSpeed",
"speeds": [
    "off",
    "low",
    "medium",
    "high"
]
}
```

## Slave a FEIT Wifi Dimmer Wall Switch to an iFan as a light switch

Configure FEIT WiFi dimmer as per normal without setoption19, then apply this to both devices.

```
backlog SetOption85 1; DevGroupName1 Master; DevGroupShare 1,1
```

# BME280 Temperature Sensor - [MCUIOT](docs/MCUIOT.md)

* Tasmota Configuration

```
D5 - GPIO14 -> I2C SCL
D6 - GPIO12 -> I2C SDA
D4 - GPIO2 -> LedLink

Template: {"NAME":"BME","GPIO":[255,255,157,255,255,255,255,255,6,255,5,255,255],"FLAG":15,"BASE":18}
```

# DHT11 Temperature Sensor - [MCUIOT](docs/MCUIOT.md)

* Tasmota Configuration

```
D2 - GPIO4 -> DHT11
D4 - GPIO2 -> LedLinki

Template: {"NAME":"DHT-D2/GPIO4","GPIO":[255,255,158,255,2,255,255,255,255,255,255,255,255],"FLAG":15,"BASE":18}
```

# Water Leak Sensor with On/Off control

##  LEAK Tasmota configuration - [DHT11](docs/MCUIOT.md#dht-yl)


```
gpio2 - ledlinki
gpio4 - dht22
gpio14 - Moisture Sensor Switch
```

```
Template:  {"NAME":"DHT-Water","GPIO":[0,0,158,0,2,0,0,0,0,255,21,0,0],"FLAG":6,"BASE":18}

Rule1 ON System#Boot DO RuleTimer1 150; publish2 homeassistant/binary_sensor/18A6B3_SNS_1/config {"name":"WaterMeterLeak","stat_t":"~stat/Moisture","avty_t":"~tele/LWT","pl_avail":"Online","pl_not_avail":"Offline","uniq_id":"18A6B3_SNS_1","device":{"identifiers":["18A6B3"]},"~":"tasmota_18A6B3/","val_tpl":"{{value_json.Leak}}","pl_off":"OFF","pl_on":"ON","dev_cla":"moisture"} ; endon on Rules#Timer=1 do backlog power on; RuleTimer1 150 endon

Rule2 on Power1#state=1 do backlog delay 25 ; teleperiod 300 endon

Rule3 on Tele-ANALOG#Moisture>=10 DO backlog publish tasmota_18A6B3/stat/Moisture {"Leak":"ON"} ; power off endon
on Tele-ANALOG#Moisture<10 do backlog publish tasmota_18A6B3/stat/Moisture {"Leak":"OFF"} ; power off endon
```

## Leak Tasmota configuration - [BME280](docs/MCUIOT.md#dht-yl)

```
gpio2 - ledlink
D5 - GPIO14 -> I2C SCL
D6 - GPIO12 -> I2C SDA
gpio13 - Moisture Sensor Switch
adc0 - Moisture
```

```
Template:  {"NAME":"BME + Leak","GPIO":[0,0,157,0,0,0,0,0,6,21,5,0,0],"FLAG":6,"BASE":18}

Rule1 ON System#Boot DO RuleTimer1 150; publish2 homeassistant/binary_sensor/860695_SNS_1/config {"name":"SewerStackLeak","stat_t":"~stat/Moisture","avty_t":"~tele/LWT","pl_avail":"Online","pl_not_avail":"Offline","uniq_id":"860695_SNS_1","device":{"identifiers":["860695"]},"~":"tasmota_860695/","val_tpl":"{{value_json.Leak}}","pl_off":"OFF","pl_on":"ON","dev_cla":"moisture"} ; endon on Rules#Timer=1 do backlog power on; RuleTimer1 150 endon

Rule2 on Power1#state=1 do backlog delay 25 ; teleperiod 300 endon

Rule3 on Tele-ANALOG#Moisture>=20 DO backlog publish tasmota_860695/stat/Moisture {"Leak":"ON"} ; power off endon
on Tele-ANALOG#Moisture<20 do backlog publish tasmota_860695/stat/Moisture {"Leak":"OFF"} ; power off endon
```

# Motion + BME280 Temperature Sensor

* Tasmota Configuration

```
D5 - GPIO14 -> I2C SCL
D6 - GPIO12 -> I2C SDA
D4 - GPIO2 -> LedLink
D2 - GPIO4 -> Switch1 (9)

Template {"NAME":"BME + Motion","GPIO":[255,255,157,255,9,255,255,255,6,255,5,255,255],"FLAG":15,"BASE":18}
SwitchMode 1
```

* homerbidge-tasmota config.json

```
"override":
  "869815_SW_1": {             <--- This is the unique_id of the discovery message you want to override
    "device_class": "motion",  <--- This is the key and property you want to override
    "name": "Motion Sensor",    <--- You can overwrite an existing value
    "tasmotaType": "binary_sensor"
 }
 ```

 # PIR Motion + BME280 Temperature Sensor + BH1750 Lux Illuminance Sensor

 * Tasmota Configuration

 ```
 D5 - GPIO14 -> I2C SCL
 D6 - GPIO12 -> I2C SDA
 D4 - GPIO2 -> LedLink
 D2 - GPIO4 -> Switch1 (9)

 Template {"NAME":"BME + Motion","GPIO":[255,255,157,255,9,255,255,255,6,255,5,255,255],"FLAG":15,"BASE":18}
 Console: SwitchMode 1
 ```

 * homerbidge-tasmota config.json

 ```
 "override":
   "869815_SW_1": {             <--- This is the unique_id of the discovery message you want to override
     "device_class": "motion",  <--- This is the key and property you want to override
     "name": "Motion Sensor",    <--- You can overwrite an existing value
     "tasmotaType": "binary_sensor"
  }
  ```


# ZMAi-90 Current Sensor Switch

* Tasmota configuration

```
Backlog module 54; SetOption66 1; TuyaMCU 0,17; TuyaMCU 32,18; TuyaMCU 31,19; TuyaMCU 33,20; SetOption59 1; MqttHost mqtt.local; topic tasmota_%06X; SetOption57 1;
Rule1 on System#Boot do RuleTimer1 5 endon on Rules#Timer=1 do backlog SerialSend5 55aa0001000000; RuleTimer1 5 endon
```

# MCULED Device with RGB+W Strip

```
D4 - GPIO 2 - ledlinki ( Blue LED )
D1 - GPIO 5 - Button 1 - Red Button
D2 - GPIO 4 - Button 2 - Black Button
D5 - GPIO 14 - PWM 1 - White LED PWM Control
D6 - GPIO 12 - ws28128 - WS2812 RGB Data Line
D0 - GPIO 16 - ( Red LED )

Template - White/PWM:
backlog power1 off; power2 off; Fade 1; setoption37 0; template {"NAME":"PWM Mode","GPIO":[0,0,157,0,18,17,0,0,0,0,37,0,0],"FLAG":0,"BASE":18}


Template - RGBWS2812:
backlog power off; setoption37 24; template {"NAME":"RGB Mode","GPIO":[0,0,0,0,18,17,0,0,7,0,21,0,157],"FLAG":0,"BASE":18}

    RGB Mode             PWM Mode
Power1 - White            RGB         <--- Mode Switch
Power2 - RGB              White



backlog template {"NAME":"PWM Mode","GPIO":[0,0,157,0,18,17,0,0,22,0,37,0,0],"FLAG":0,"BASE":18}; friendlyname1 Sink Mode ; friendlyname2 Kitchen Sink ; rule2 1; MqttHost mqtt.local; topic tasmota_%06X; Module 0; fade 1; webbutton2 Power; webbutton1 Mode; switchmode2 3; MqttHost mqtt.local; topic tasmota_%06X; setoption19 1

rule2 on Power1#State=1 do backlog power1 off; power2 off; rule2 0; rule3 1; setoption37 24; template {"NAME":"RGB Mode","GPIO":[0,0,0,0,18,10,0,0,7,17,21,0,157],"FLAG":0,"BASE":18}; power2 on endon

rule3 on Power1#State=1 do backlog power1 off; dimmer2 0; power2 off; rule3 0; rule2 1; setoption37 0; template  {"NAME":"PWM Mode","GPIO":[0,0,157,0,18,10,0,0,22,17,37,0,0],"FLAG":0,"BASE":18}; power2 on; endon
```

# MCULED Device with RGB+W Strip - Version 2 ( Basement )

```
D4 - GPIO 2 - ledlinki ( Blue LED )
D1 - GPIO 5 - Button 1 - Red Button
D2 - GPIO 4 - Button 2 - Black Button
D5 - GPIO 14 - PWM 1 - White LED PWM Control
D6 - GPIO 12 - ws28128 - WS2812 RGB Data Line
D0 - GPIO 16 - ( Red LED )

Unit 1

backlog DevGroupName basement_led; power1 off; power2 off; Fade 1; setoption37 24; SetOption85 1; webbutton1 White; webbutton2 LED; friendlyname1 Basement White;  friendlyname2 Basement LED; MqttHost mqtt.local; topic tasmota_%06X; Module 0; setoption19 1; rule2 1; template  {"NAME":"MCULED","GPIO":[0,0,0,0,0,0,0,0,1376,0,224,0,544,0],"FLAG":0,"BASE":18}

rule2 on Power1#State=1 do backlog power2 off endon
  on Power2#State=1 do backlog power1 off endon

Unit 2 - this is a slave unit using device groups to sync status

backlog DevGroupName basement_led; power1 off; power2 off; Fade 1; setoption37 24; SetOption85 1; webbutton1 White; webbutton2 LED; friendlyname1 Basement White 2;  friendlyname2 Basement LED 2; MqttHost mqtt.local; topic tasmota_%06X; Module 0; setoption19 0; rule2 0; template  {"NAME":"MCULED","GPIO":[0,0,0,0,0,0,0,0,1376,0,224,0,544,0],"FLAG":0,"BASE":18}
```

# MCULED Device with RGB+W Strip - Version 2 ( Cottage Sink )

```
D4 - GPIO 2 - ledlinki ( Blue LED )
D1 - GPIO 5 - Button 1 - Red Button
D2 - GPIO 4 - Button 2 - Black Button
D5 - GPIO 14 - PWM 1 - White LED PWM Control
D6 - GPIO 12 - ws28128 - WS2812 RGB Data Line
D0 - GPIO 16 - ( Red LED )

Unit 1

backlog power1 off; power2 off; Fade 1; setoption37 24; SetOption85 1; webbutton1 White; webbutton2 LED; friendlyname1 Kitchen Sink;  friendlyname2 Kitchen LED; MqttHost mqtt.local; topic tasmota_%06X; Module 0; setoption19 1; rule2 1; template  {"NAME":"MCULED","GPIO":[0,0,0,0,33,32,0,0,1376,0,224,0,544,0],"FLAG":0,"BASE":18}

rule2 on Power1#State=1 do backlog power2 off endon
  on Power2#State=1 do backlog power1 off endon
```


# Tuya Dimmer Module as a FAN

* Tasmota configuration

```
TuyaMCU 21,3
DimmerRange 100,255
```

* homerbidge-tasmota config.json

```
"override": {
   "EF159D_LI_1": {     <--- This is the unique_id of the discovery message you want to override
   "tasmotaType": "fan" <--- This is the key and property you want to override
  }
```

# Trailer Relay Board

* Tasmota configuration

```
backlog webbutton1 Ceiling; webbutton2 Flood; webbutton3 Porch; webbutton4 Step
```

# Gowfeel EN71 Water Valve

Flashing required opening the case and using a FTDI connected to the TYWE3S.  Flashed with Tasmota 9.2

* Tasmota configuration

```
backlog template  {"NAME":"SmartValve","GPIO":[224,0,0,0,0,0,0,0,32,288,0,0,0,0],"FLAG":0,"BASE":18}; module 0; MqttHost mqtt.local; topic tasmota_%06X; setoption19 1; setoption57 1
```

# Homebrew Doorbutton Button

This is to document my replacement backend for a doorbell.  I have the button and wiring that is it.  I also had a bunch of bme280's in the parts bin, so I wired it in as well.

* Device Wiring - based on a ESP8266 12-E NodeMCU Kit

```
GPIO 2  - LEDLink
GPIO 12 - BME280 SDA
GPIO 13 - Switch 1 - This is wired to the button
GPIO 14 - BME280 SCL
GPIO 16 - Relay_i 1 - The second LED will turn on when the button is pressed
```

* Tasmota configuration

```
backlog template  {"NAME":"Doorbell Button","GPIO":[0,1,544,1,0,1,1,1,640,160,608,1,256,1],"FLAG":0,"BASE":18}; module 0; MqttHost mqtt.local; topic tasmota_%06X; setoption57 1; setoption19 1
rule1 on System#Boot do pulsetime 10 endon
rule1 1
```

# Homebrew Garage Door Opener

This is to document my efforts with my Chamberlain Garage Door Opener, which uses Security 2.0 on local control.  Technical details are here [MCUIOT](docs/GarageDoor.md).

* Test Device Wiring

```
 GPIO 2 - LED_i 1
 GPIO 12 - Switch 2 ( Open Contact Sensor )
 GPIO 14 - Switch 3 ( Closed Contact Sensor )
 GPIO 16 - Relay_i 1 ( Using nodemcu to simulate relay )
```

* Tasmota configuration for Test Device

```
backlog template {"NAME":"Test Door","GPIO":[0,1,320,1,0,1,1,1,161,0,162,1,256,1],"FLAG":0,"BASE":18}; module 0; SetOption114 0; PulseTime1 1; MqttHost mqtt.local; topic tasmota_%06X; setoption57 1; switchmode2 1; switchmode3 1; setoption19 1
```

```
Backlog Rule1
  ON Switch2#state=0 DO publish tele/%topic%/DOOR OPEN endon
  ON Switch2#state=1 DO Publish tele/%topic%/DOOR CLOSING endon
  ON Switch3#state=0 DO publish tele/%topic%/DOOR CLOSED endon
  ON Switch3#state=1 DO Publish tele/%topic%/DOOR OPENING endon
; rule1 1
```

* Production Wiring

GPIO 0 - Button 1
GPIO X - Button 2
GPIO X - LED 1
GPIO X - LED 2
GPIO 4 - Open Contact Sensor
GPIO 12 - Relay
GPIO 14 - Closed Contact Sensor

* Tasmota configuration for Production Device ( Template has different GPIO settings )

```
backlog template {"NAME":"Garage Door","GPIO":[32,1,1,1,161,1,1,1,224,288,162,1,1,1],"FLAG":0,"BASE":18}; module 0; SetOption114 0; PulseTime1 1; MqttHost mqtt.local; topic tasmota_%06X; setoption57 1; switchmode2 1; switchmode3 1; setoption19 1
```

```
Backlog Rule1
  ON Switch2#state=0 DO publish2 tele/%topic%/DOOR OPEN endon
  ON Switch2#state=1 DO Publish2 tele/%topic%/DOOR CLOSING endon
  ON Switch3#state=0 DO publish2 tele/%topic%/DOOR CLOSED endon
  ON Switch3#state=1 DO Publish2 tele/%topic%/DOOR OPENING endon
; rule1 1
```

* homerbidge-tasmota config.json

```
"override": {
  "FB6A07_RL_1": {
     "tasmotaType": "garageDoor"
  }
```


# CE SMART Wifi Dimmer

* Tasmota configuration

```
backlog template {"NAME":"CE-WF500D","GPIO":[0,0,0,0,0,0,0,0,0,108,0,107,0],"FLAG":0,"BASE":54}; module 0; TuyaMCU 21,3; MqttHost mqtt.local; topic tasmota_%06X; setoption57 1 ;dimmerrange 30,255; setoption19 1
```

# FEIT Wifi Dimmer

* Tasmota configuration

```
backlog module 54;  TuyaMCU 21,2; MqttHost mqtt.local; topic tasmota_%06X; setoption57 1; DimmerRange 10,1000; setoption19 1
```

* Tasmota configuration with Dimming removed

I have one installed on a non-dimmable light.  This removes the dimmer functionality from HomeKit only, unfortunately local control is still available, and if used will reset to 100% after turning off/on.

```
backlog module 54; DimmerRange 10,1000; MqttHost mqtt.local; topic tasmota_%06X; setoption19 1
rule1 on Power1#State do tuyasend2 2,1440 endon
rule1 1
```

## Using a FEIT Wifi Dimmer as a remote switch to OpenBK RGBCCT Potlights

* Tasmota configuration

```
backlog module 54;  TuyaMCU 21,2; TuyaMCU 23,3; TuyaMCU 24,4; MqttHost mqtt.local; topic tasmota_%06X; setoption57 1; DimmerRange 10,1000; setoption19 1; DevGroupShare 3,19; SetOption85 1; DevGroupName1 Master
rule1 on Power1#State=1 do backlog CT 325 endon
rule1 1
```

# Turn off after 30 minutes

backlog pulsetime 1900

Or

```
rule1 on System#Boot do pulsetime 1900 endon
rule1 1
```

# Hampton Bay Fan/Light RF Remote Control ( 303.9 Mhz )

FCCID: CHQ7083T / CHQ9050H 303.9 Mhz RF Remote Control

* Tasmota configuration

D4 - GPIO 2 - ledlink ( Blue LED )
D6 - GPIO 12 - 303.9 Mhz RF Transmitter
D7 - GPIO 13 - 303.9 Mhz RF Receiver
D0 - GPIO 16 - ( Red LED )


```
backlog template {"NAME":"RF Transmitter","GPIO":[0,0,544,0,0,0,0,0,1120,1152,416,225,0,0],"FLAG":0,"BASE":18}
backlog friendlyname1 Light; friendlyname2 Fan; webbutton1 Light; webbutton2 Fan; MqttHost mqtt.local; topic tasmota_%06X; setoption20 1

template {"NAME":"RF Transmitter","GPIO":[0,0,544,0,0,0,0,0,1,1,417,224,0,0],"FLAG":0,"BASE":18}
```

```
Rule2
  on Power2#State=0 do dimmer 0 endon
  on dimmer#state = 0 do rfsend {"Data":"0x67D","Bits":12,"Protocol":6,"Pulse":340} break
  on dimmer#state <= 33 do rfsend {"Data":"0x677","Bits":12,"Protocol":6,"Pulse":340} break
  on dimmer#state <= 66 do rfsend {"Data":"0x66F","Bits":12,"Protocol":6,"Pulse":340} break
  on dimmer#state <= 100 do rfsend {"Data":"0x65F","Bits":12,"Protocol":6,"Pulse":340} break
  on Power2#State=1 do dimmer 25 break

Rule3 on Power1#State do rfsend {"Data":"0x67E","Bits":12,"Protocol":6,"Pulse":340} endon
```

* homerbidge-tasmota config.json

```
"override": {
   "562CC4_LI_2": {     <--- This is the unique_id of the discovery message you want to override
   "tasmotaType": "fan" <--- This is the key and property you want to override
  }
```

# Valor Fireplace Remote ( 315 Mhz )

```
Off
rfsend {"Data":"0x5D1C8","Bits":22,"Protocol":6,"Pulse":340}

rfsend {"Data":"0x3A2E37","Bits":24,"Protocol":2,"Pulse":340}

rfsend {"Data":"0x3A2E37","Bits":23,"Protocol":2,"Pulse":340}

rfsend {"Data":"0xE8B8DC","Bits":22,"Protocol":2,"Pulse":340}

rfsend {"Data":"0x555555","Bits":22,"Protocol":2,"Pulse":340}

rfsend {"Data":"0x174720","Bits":22,"Protocol":6,"Pulse":340}

irsend 0,200,700,700,200,700,200,700,200,200,700,700,200,200,700,200,700,200,700,700,200,200,700,700,200,700,200,700,200,200,700,200,700,200,700,700,200,700,200,200,700,700,200,700,200,700,200

irsend raw,0,300,10001011101000111001000
irsend raw,0,300,00101110111011100010111000100010001011100010111011101110001000100010111011100010111011101110

```


# Treatlife DS03 Fan Controller and Light Dimmer

* Tasmota configuration - from https://newadventuresinwi-fi.blogspot.com/2019/12/brilliant-smart-ceiling-fan-remote-in-home-assistant.html

```
backlog module 54
backlog so97 1 ; tuyamcu 11,1 ; tuyamcu 12,9 ; tuyamcu 21,10
backlog ledtable 0 ; dimmerrange 10,1000 ; so59
```

Trial Tasmota config based on fake dimmer concept ( Requires Tasmota 9.1.0 or greater )
At the present time this configuration does not work.

```
backlog so68 1; so37 128; tuyamcu 22,99
backlog webbutton1 Fan; webbutton2 Light

Rule1 on TuyaReceived#Data=55AA03070005030400010016 do channel1 0 endon
      on TuyaReceived#Data=55AA03070005030400010117 do channel1 33 endon
      on TuyaReceived#Data=55AA03070005030400010218 do channel1 66 endon
      on TuyaReceived#Data=55AA03070005030400010319 do channel1 100 endon

Rule2 on channel1 <= 25 do TuyaSend4 3,0 break
      on Channel1 <= 50 do TuyaSend4 3,1 break
      on Channel1 <= 75 do TuyaSend4 3,2 break
      on Channel1 <= 100 do TuyaSend4 3,3 endon

backlog rule1 1; rule2 1
```

What do the settings mean

```
so37 128 -->  same as 0..127 but with independent channel handling enabled
so97 --> Set TuyaMCU serial baudrate
so59 --> Send tele/%topic%/STATE in addition to stat/%topic%/RESULT for commands: State, Power and any command causing a light to be turned on.
so68 --> Multi-channel PWM instead of a single light
ledtable - do not use LED gamma correction (default «6.5.0.9)
tuyamcu 22,99 --> create a fake dimmer control

tuyamcu 62,3 --> 62 for 4 speeds fan controller (possible values 0,1,2,3)
```


* homerbidge-tasmota config.json

```
"override": {
   "EF159D_LI_1": {     <--- This is the unique_id of the discovery message you want to override
   "tasmotaType": "fan" <--- This is the key and property you want to override
  }
```

# OpenMQTTGateway devices

I have been working on utilizing an OpenMQTTGateway device configured with a cc1101 RF Transceiver and the GatewayRF module.  The goal is to control my Hampton Bay ( 303 Mhz ), and GE Fans ( 315 Mhz ) and other RF devices.

# Hampton Bay Light

msg.payload =
```
{
    "avty_t": "~LWT",
    "name": "Test Ceiling 1",
    "uniq_id": "3C71BF9E0770_LI_1",
    "pl_on": "{\"value\": 1150,\"protocol\": 6,\"length\": 12,\"delay\": 437,\"mhz\": 303.732}",
    "pl_off": "{\"value\": 1150,\"protocol\": 6,\"length\": 12,\"delay\": 437,\"mhz\": 303.732}",
    "pl_avail": "online",
    "pl_not_avail": "offline",
    "cmd_t": "~commands/MQTTto433",
    "device": {
        "name": "cc1101-9e0770",
        "model": "[\"BME280\",\"BH1750\",\"RF\",\"Pilight\",\"rtl_433\"]",
        "manufacturer": "OMG_community",
        "sw_version": "esp32dev_rtl_433",
        "identifiers": [
            "3C71BF9E0770-1"
        ]
    },
    "~": "home/cc1101-9e0770/"
}
```

msg.topic =
```
homeassistant/light/9e0770_LI_1/config
```

msg.retain = true

# Hampton Bay FAN

msg.payload =
```
{
    "avty_t": "~LWT",
    "name": "Test Fan 1",
    "uniq_id": "3C71BF9E0770_F1_1",
    "payload_high_speed": "{\"value\": 1119,\"protocol\": 6,\"length\": 12,\"delay\": 437,\"mhz\": 303.732}",
    "payload_medium_speed": "{\"value\": 1135,\"protocol\": 6,\"length\": 12,\"delay\": 437,\"mhz\": 303.732}",
    "payload_low_speed": "{\"value\": 1143,\"protocol\": 6,\"length\": 12,\"delay\": 437,\"mhz\": 303.732}",
    "pl_off": "{\"value\": 1149,\"protocol\": 6,\"length\": 12,\"delay\": 437,\"mhz\": 303.732}",
    "pl_avail": "online",
    "pl_not_avail": "offline",
    "speeds": [
        "off",
        "low",
        "medium",
        "high"
    ],
    "cmd_t": "~commands/MQTTto433",
    "device": {
        "name": "cc1101-9e0770",
        "model": "[\"BME280\",\"BH1750\",\"RF\",\"Pilight\",\"rtl_433\"]",
        "manufacturer": "OMG_community",
        "sw_version": "esp32dev_rtl_433",
        "identifiers": [
            "3C71BF9E0770-1"
        ]
    },
    "~": "home/cc1101-bbbbbb/"
}
```

msg.topic =
```
homeassistant/fan/9e0770_F1_1/config
```

msg.retain = true

# openMQTTGateway / PiLight temperature sensor

Sensor Message

```
{"message":
  {"id":97,
  "temperature":-16.6,
  "humidity":14.0,
  "battery":1},
"protocol":"alecto_ws1700",
"length":"97",
"value":"97",
"repeats":2,
"status":2}
```

msg.payload =
```
{
    "stat_t": "~PilighttoMQTT",
    "name": "temp",
    "uniq_id": "240AC4EC20DCtemppilight",
    "dev_cla": "temperature",
    "val_tpl": "{% if value_json is defined and value_json.message.id == 97 %} {{ value_json.message.temperature | is_defined }} {% endif %}",
    "unit_of_meas": "°C",
    "device": {
        "name": "cc1101-ec20dc",
        "model": "[\"BME280\",\"Pilight\",\"BT\"]",
        "manufacturer": "OMG_community",
        "sw_version": "development-rtl_433",
        "identifiers": [
            "240AC4EC20DC"
        ]
    },
    "~": "home/cc1101-ec20dc/"
}
```

msg.topic =
```
homeassistant/sensor/240AC4EC20DCtemppilight/config
```

msg.retain = true

# Internet Connection WatchDog

## Version 1 ( Uses node-red to monitor google.com and turn off the plug )

```
rule1 on wifi#disconnected do backlog power 0;delay 150;power 1; delay 1800 endon
rule2 on system#boot do ruletimer1 600 endon on Rules#Timer=1 do backlog power 1; ruletimer1 600 endon
rule3 on Mqtt#Disconnected do MqttHost 0 endon

Backlog MqttHost mqtt.local; topic tasmota_%06X; setoption57 1; setoption19 1; rule2 1
```

## Version 2

On boot, setup timer with a exponential backoff algorithm. Var1 contains the current interval in minutes, which is tripled after each failed query, but limited to 1439 minutes (1 day).  Set the poweronstate so that when the plug is turned off, it turns on again after 30 seconds.

Every Var1 minutes, make sure the plug is on, then check that google.com is reachable.
If google.com is not reachable, back off timer by a factor of 3, and flicks the power off then on again 10 seconds later.
If google.com is reachable, reset the exponential backoff algorithm back to 3 minutes.

```
Rule1
  ON system#boot do backlog Var1 3; poweronstate 5; pulsetime 130; Power1 1 ENDON
  ON Var1#State>1439 DO Var1 1439 ENDON

  ON Time#Minute|%var1% DO backlog Power1 1 ; websend [google.com] / ENDON
  ON WebSend#Data$!Done DO backlog Mult1 3; Power1 0; Delay 10; Power1 1 ENDON
  ON WebSend#Data=Done DO backlog Var1 3 ENDON

Backlog MqttHost mqtt.local; topic tasmota_%06X; setoption57 1; setoption19 1; rule1 1
```

## Version 3

Rule 1 - Reboot router if internet connection fails 3 times in 15 seconds.  Delay reboot for 5 seconds to allow mqtt message to publish

```
Rule1
  ON system#boot DO backlog Var1 3; Var2 0; poweronstate 5; pulsetime 130; Power1 1 ENDON
  ON Var1#State>1439 DO Var1 1439 ENDON
  ON Time#Minute|%var1% DO backlog Power1 1; websend [google.com] / ENDON
  ON WebSend#Data$!Done DO backlog Add2 1; Delay 5; IF Var2>=3 DO backlog Mult1 3; Power1 0; Delay 10; Power1 1; Var2 0 ENDON ENDIF ENDON
  ON WebSend#Data=Done DO backlog Var1 3; Var2 0 ENDON
Backlog rule1 1

```
Rule 2 - Publish status to router/Internet_Status

```
Rule2
  ON system#boot DO backlog Var3 3; Var4 0 ENDON
  ON Var3#State>1439 DO Var3 1439 ENDON
  ON Time#Minute|%var3% DO backlog websend [brokegoogle.com] / ENDON
  ON WebSend#Data$!Done DO backlog Add4 1; Publish router/Internet_Status "Internet may be down" ENDON
  ON Var4>=3 DO backlog Publish router/Internet_Status "Internet Down"; Var4 0 ENDON
  ON WebSend#Data=Done DO backlog Publish router/Internet_Status "Internet OK"; backlog Var3 3; Var4 0 ENDON
Backlog rule2 1
```
