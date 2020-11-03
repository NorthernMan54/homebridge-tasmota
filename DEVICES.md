## Advanced configurations

My standard config after setting name
```
Backlog MqttHost mqtt.local; topic tasmota_%06X; setoption19 1
```

### BME280 Temperature Sensor

* Tasmota Configuration

```
D5 - GPIO14 -> I2C SCL
D6 - GPIO12 -> I2C SDA
D4 - GPIO2 -> LedLink

Template: {"NAME":"BME","GPIO":[255,255,157,255,255,255,255,255,6,255,5,255,255],"FLAG":15,"BASE":18}
```

### DHT11 Temperature Sensor

* Tasmota Configuration

```
D2 - GPIO4 -> DHT11
D4 - GPIO2 -> LedLinki

Template: {"NAME":"DHT-D2/GPIO4","GPIO":[255,255,158,255,2,255,255,255,255,255,255,255,255],"FLAG":15,"BASE":18}
```

### Motion + BME280 Temperature Sensor

* Tasmota Configuration

```
D5 - GPIO14 -> I2C SCL
D6 - GPIO12 -> I2C SDA
D4 - GPIO2 -> LedLink
D2 - GPIO4 -> Switch1 (9)

Template: {"NAME":"BME + Motion","GPIO":[255,255,157,255,9,255,255,255,6,255,5,255,255],"FLAG":15,"BASE":18}
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

### Tuya Dimmer Module as a FAN

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

### ZMAi-90 Current Sensor Switch

* Tasmota configuration

```
Backlog SetOption66 1; TuyaMCU 0,17; TuyaMCU 32,18; TuyaMCU 31,19; TuyaMCU 33,20; SetOption59 1
Rule1 on System#Boot do RuleTimer1 5 endon on Rules#Timer=1 do backlog SerialSend5 55aa0001000000; RuleTimer1 5 endon
```

### Water Leak Sensor with On/Off control

* DHT11 / LEAK Tasmota configuration


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

* BME280 / Leak Tasmota configuration

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

### MCULED Device with RGB+W Strip

```
D4 - GPIO 2 - ledlinki ( Blue LED )
D1 - GPIO 5 - Button 1 - Red Button
D2 - GPIO 4 - Button 2 - Black Button
D5 - GPIO 14 - PWM 1 - White LED PWM Control
D6 - GPIO 12 - ws28128 - WS2812 RGB Data Line
D0 - GPIO 16 - ( Red LED )

Template - White/PWM: {"NAME":"PWM Mode","GPIO":[0,0,157,0,18,17,0,0,0,0,37,0,0],"FLAG":0,"BASE":18}
Fade 1


Template - RGBWS2812:  {"NAME":"RGB Mode","GPIO":[0,0,0,0,18,17,0,0,7,0,21,0,157],"FLAG":0,"BASE":18}

```
