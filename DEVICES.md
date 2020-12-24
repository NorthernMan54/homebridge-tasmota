# Sample Device Configurations ( My personal collection )

My standard config after setting name and device configuration
```
Backlog MqttHost mqtt.local; topic tasmota_%06X; setoption57 1; setoption19 1
```

## [MCUIOT](docs/MCUIOT.md) BME280 Temperature Sensor

* Tasmota Configuration

```
D5 - GPIO14 -> I2C SCL
D6 - GPIO12 -> I2C SDA
D4 - GPIO2 -> LedLink

Template: {"NAME":"BME","GPIO":[255,255,157,255,255,255,255,255,6,255,5,255,255],"FLAG":15,"BASE":18}
```

## [MCUIOT](docs/MCUIOT.md) DHT11 Temperature Sensor

* Tasmota Configuration

```
D2 - GPIO4 -> DHT11
D4 - GPIO2 -> LedLinki

Template: {"NAME":"DHT-D2/GPIO4","GPIO":[255,255,158,255,2,255,255,255,255,255,255,255,255],"FLAG":15,"BASE":18}
```

## Water Leak Sensor with On/Off control

* [DHT11](docs/MCUIOT.md#dht-yl) / LEAK Tasmota configuration


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

* [BME280](docs/MCUIOT.md#dht-yl) / Leak Tasmota configuration

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

## Motion + BME280 Temperature Sensor

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
    "name": "Motion Sensor"    <--- You can overwrite an existing value
 }
 ```



## ZMAi-90 Current Sensor Switch

* Tasmota configuration

```
Backlog module 54; SetOption66 1; TuyaMCU 0,17; TuyaMCU 32,18; TuyaMCU 31,19; TuyaMCU 33,20; SetOption59 1; MqttHost mqtt.local; topic tasmota_%06X;
Rule1 on System#Boot do RuleTimer1 5 endon on Rules#Timer=1 do backlog SerialSend5 55aa0001000000; RuleTimer1 5 endon
```

## MCULED Device with RGB+W Strip

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

## Tuya Dimmer Module as a FAN

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

## Trailer Relay Board

backlog webbutton1 Ceiling; webbutton2 Flood; webbutton3 Porch; webbutton4 Step

## FEIT Wifi Dimmer

* Tasmota configuration

```
backlog module 54; DimmerRange 10,1440; TuyaMCU 21,2; MqttHost mqtt.local; topic tasmota_%06X; setoption19 1
```

* Tasmota configuration with Dimming removed

I have one installed on a non-dimmable light.  This removes the dimmer functionality from HomeKit only, unfortunately local control is still available, and if used will reset to 100% after turning off/on.

```
backlog module 54; DimmerRange 10,1440; MqttHost mqtt.local; topic tasmota_%06X; setoption19 1
rule1 on Power1#State do tuyasend2 2,1440 endon
rule1 1
```

## Hampton Bay Fan/Light RF Remote Control

FCCID: CHQ7083T / CHQ9050H 303.9 Mhz RF Remote Control

* Tasmota configuration

D6 - GPIO 12 - 303.9 Mhz RF Transmitter
D7 - GPIO 13 - 303.9 Mhz RF Receiver


```
backlog template {"NAME":"RF Transmitter","GPIO":[0,0,544,0,0,0,0,0,1120,1152,416,225,0,0],"FLAG":0,"BASE":18}
backlog webbutton1 Light; webbutton2 Fan; MqttHost mqtt.local; topic tasmota_%06X;
```

```
Rule2 on Power1#State do rfsend {"Data":"0x67E","Bits":12,"Protocol":6,"Pulse":340} endon
      on Power2#State=0 do rfsend {"Data":"0x67D","Bits":12,"Protocol":6,"Pulse":340} endon
      on dimmer#state <= 25 do rfsend {"Data":"0x67D","Bits":12,"Protocol":6,"Pulse":340} break
      on dimmer#state <= 50 do rfsend {"Data":"0x677","Bits":12,"Protocol":6,"Pulse":340} break
      on dimmer#state <= 75 do rfsend {"Data":"0x66F","Bits":12,"Protocol":6,"Pulse":340} break
      on dimmer#state <= 100 do rfsend {"Data":"0x65F","Bits":12,"Protocol":6,"Pulse":340} break
      on Power2#State=1 do rfsend {"Data":"0x677","Bits":12,"Protocol":6,"Pulse":340} break
```

* homerbidge-tasmota config.json

```
"override": {
   "EF159D_LI_1": {     <--- This is the unique_id of the discovery message you want to override
   "tasmotaType": "fan" <--- This is the key and property you want to override
  }
```

## Treatlife DS03 Fan Controller and Light Dimmer

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
