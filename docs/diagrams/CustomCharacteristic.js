var inherits = require('util').inherits;
var Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  var CustomCharacteristic = {};

  // Motion Sensor
  // Persistence of motion indication in seconds.

  CustomCharacteristic.Duration = function() {
    Characteristic.call(this, 'Duration', CustomCharacteristic.Duration.UUID);
    this.setProps({
      format: Characteristic.Formats.UINT16,
      unit: "seconds",
      minValue: 5,
      maxValue: 15 * 3600,
      validValues: [
        5, 10, 20, 30,
        1 * 60, 2 * 60, 3 * 60, 5 * 60, 10 * 60, 20 * 60, 30 * 60,
        1 * 3600, 2 * 3600, 3 * 3600, 5 * 3600, 10 * 3600, 12 * 3600, 15 * 3600
      ],
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY, Characteristic.Perms.WRITE]
    });
    this.value = this.getDefaultValue();
  };
  CustomCharacteristic.Duration.UUID = 'E863F12D-079E-48FF-8F27-9C2605A29F52';
  inherits(CustomCharacteristic.Duration, Characteristic);

  // Motion Sensor
  // Time of last activation

  CustomCharacteristic.LastActivation = function() {
    Characteristic.call(this, 'Last Activation', CustomCharacteristic.LastActivation.UUID);
    this.setProps({
      format: Characteristic.Formats.UINT32,
      unit: "seconds",
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };
  CustomCharacteristic.LastActivation.UUID = 'E863F11A-079E-48FF-8F27-9C2605A29F52';
  inherits(CustomCharacteristic.LastActivation, Characteristic);

  // Motion Sensor
  // Sensitivity of sensor

  CustomCharacteristic.Sensitivity = function() {
    Characteristic.call(this, 'Sensitivity', CustomCharacteristic.Sensitivity.UUID);
    this.setProps({
      format: Characteristic.Formats.UINT8,
      unit: "seconds",
      minValue: 0,
      maxValue: 7,
      validValues: [0, 4, 7],
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY, Characteristic.Perms.WRITE]
    });
    this.value = this.getDefaultValue();
  };
  CustomCharacteristic.Sensitivity.UUID = 'E863F120-079E-48FF-8F27-9C2605A29F52';
  inherits(CustomCharacteristic.Sensitivity, Characteristic);

  // Door

  CustomCharacteristic.ResetTotal = function() {
    Characteristic.call(this, 'Reset Total', CustomCharacteristic.ResetTotal.UUID);
    this.setProps({
      format: Characteristic.Formats.UINT32,
      unit: "seconds",
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY, Characteristic.Perms.WRITE]
    });
    this.value = this.getDefaultValue();
  };
  CustomCharacteristic.ResetTotal.UUID = 'E863F112-079E-48FF-8F27-9C2605A29F52';
  inherits(CustomCharacteristic.ResetTotal, Characteristic);


  CustomCharacteristic.OpenDuration = function() {
    Characteristic.call(this, 'Open Duration', CustomCharacteristic.OpenDuration.UUID);
    this.setProps({
      format: Characteristic.Formats.UINT32,
      unit: "seconds",
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY, Characteristic.Perms.WRITE]
    });
    this.value = this.getDefaultValue();
  };
  CustomCharacteristic.OpenDuration.UUID = 'E863F118-079E-48FF-8F27-9C2605A29F52';
  inherits(CustomCharacteristic.OpenDuration, Characteristic);

  CustomCharacteristic.ClosedDuration = function() {
    Characteristic.call(this, 'Closed Duration', CustomCharacteristic.ClosedDuration.UUID);
    this.setProps({
      format: Characteristic.Formats.UINT32,
      unit: "seconds",
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY, Characteristic.Perms.WRITE]
    });
    this.value = this.getDefaultValue();
  };
  CustomCharacteristic.ClosedDuration.UUID = 'E863F119-079E-48FF-8F27-9C2605A29F52';
  inherits(CustomCharacteristic.ClosedDuration, Characteristic);

  CustomCharacteristic.TimesOpened = function() {
    Characteristic.call(this, 'Times Opened', CustomCharacteristic.TimesOpened.UUID);
    this.setProps({
      format: Characteristic.Formats.UINT32,
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };
  CustomCharacteristic.TimesOpened.UUID = 'E863F129-079E-48FF-8F27-9C2605A29F52';
  inherits(CustomCharacteristic.TimesOpened, Characteristic);

  CustomCharacteristic.AtmosphericPressureLevel = function() {
    Characteristic.call(this, 'Air Pressure', CustomCharacteristic.AtmosphericPressureLevel.UUID);
    this.setProps({
      format: Characteristic.Formats.UINT16,
      unit: "mbar",
      minValue: 700,
      maxValue: 1200,
      minStep: 1,
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };
  CustomCharacteristic.AtmosphericPressureLevel.UUID = 'E863F10F-079E-48FF-8F27-9C2605A29F52';
  inherits(CustomCharacteristic.AtmosphericPressureLevel, Characteristic);


  // courtesy of https://github.com/robi-van-kinobi/homebridge-cubesensors
  CustomCharacteristic.AtmosphericPressureSensor = function(displayName, subtype) {
    Service.call(this, displayName, CustomCharacteristic.AtmosphericPressureSensor.UUID, subtype);

    // Required Characteristics
    this.addCharacteristic(CustomCharacteristic.AtmosphericPressureLevel);

    // Optional Characteristics
    this.addOptionalCharacteristic(Characteristic.StatusActive);
    this.addOptionalCharacteristic(Characteristic.StatusFault);
    this.addOptionalCharacteristic(Characteristic.StatusLowBattery);
    this.addOptionalCharacteristic(Characteristic.StatusTampered);
    this.addOptionalCharacteristic(Characteristic.Name);
  };
  CustomCharacteristic.AtmosphericPressureSensor.UUID = 'B77831FD-D66A-46A4-B66D-FD7EE8DFE3CE';
  inherits(CustomCharacteristic.AtmosphericPressureSensor, Service);

  CustomCharacteristic.ValvePosition = function() {
    Characteristic.call(this, 'Valve position', 'E863F12E-079E-48FF-8F27-9C2605A29F52');
    this.setProps({
      format: Characteristic.Formats.UINT8,
      unit: Characteristic.Units.PERCENTAGE,
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };
  inherits(CustomCharacteristic.ValvePosition, Characteristic);

  CustomCharacteristic.ProgramCommand = function() {
    Characteristic.call(this, 'Program command', 'E863F12C-079E-48FF-8F27-9C2605A29F52');
    this.setProps({
      format: Characteristic.Formats.DATA,
      perms: [Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };
  inherits(CustomCharacteristic.ProgramCommand, Characteristic);

  CustomCharacteristic.ProgramData = function() {
    Characteristic.call(this, 'Program data', 'E863F12F-079E-48FF-8F27-9C2605A29F52');
    this.setProps({
      format: Characteristic.Formats.DATA,
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };
  inherits(CustomCharacteristic.ProgramData, Characteristic);


  return CustomCharacteristic;
};
