var inherits = require('util').inherits;
var Service, Characteristic;

module.exports = function(Service, Characteristic) {

  var CustomCharacteristic: any = {};

  CustomCharacteristic.Voltage = function() {
    Characteristic.call(this, 'Voltage', CustomCharacteristic.Voltage.UUID);
    this.setProps({
      format: Characteristic.Formats.FLOAT,
      unit: "V",
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };
  CustomCharacteristic.Voltage.UUID = 'E863F10A-079E-48FF-8F27-9C2605A29F52';
  inherits(CustomCharacteristic.Voltage, Characteristic);

  // Aka Amps

  CustomCharacteristic.ElectricCurrent = function() {
    Characteristic.call(this, 'Electric Current', CustomCharacteristic.ElectricCurrent.UUID);
    this.setProps({
      format: Characteristic.Formats.FLOAT,
      unit: "A",
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };
  CustomCharacteristic.ElectricCurrent.UUID = 'E863F126-079E-48FF-8F27-9C2605A29F52';
  inherits(CustomCharacteristic.ElectricCurrent, Characteristic);

  // Aka watts

  CustomCharacteristic.CurrentConsumption = function() {
    Characteristic.call(this, 'Current Consumption', CustomCharacteristic.CurrentConsumption.UUID);
    this.setProps({
      format: Characteristic.Formats.FLOAT,
      unit: "W",
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };
  CustomCharacteristic.CurrentConsumption.UUID = 'E863F10D-079E-48FF-8F27-9C2605A29F52';
  inherits(CustomCharacteristic.CurrentConsumption, Characteristic);

  // Aka kilowatts

  CustomCharacteristic.TotalConsumption = function() {
    Characteristic.call(this, 'Total Consumption', CustomCharacteristic.TotalConsumption.UUID);
    this.setProps({
      format: Characteristic.Formats.FLOAT,
      unit: "kWh",
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };
  CustomCharacteristic.TotalConsumption.UUID = 'E863F10C-079E-48FF-8F27-9C2605A29F52';
  inherits(CustomCharacteristic.TotalConsumption, Characteristic);


  CustomCharacteristic.AtmosphericPressureLevel = function() {
    Characteristic.call(this, 'Air Pressure', CustomCharacteristic.AtmosphericPressureLevel.UUID);
    this.setProps({
      format: Characteristic.Formats.UINT8,
      unit: "mbar",
      minValue: 800,
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

  CustomCharacteristic.LastActivation = function() {
    Characteristic.call(this, 'Last Activation', CustomCharacteristic.LastActivation.UUID);
    this.setProps({
      format: Characteristic.Formats.UINT32,
      unit: Characteristic.Units.SECONDS,
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };
  CustomCharacteristic.LastActivation.UUID = 'E863F11A-079E-48FF-8F27-9C2605A29F52';
  inherits(CustomCharacteristic.LastActivation, Characteristic);

  CustomCharacteristic.ResetTotal = function() {
    Characteristic.call(this, 'Reset Total', CustomCharacteristic.ResetTotal.UUID);
    this.setProps({
      format: Characteristic.Formats.UINT32,
      unit: Characteristic.Units.SECONDS,
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };
  CustomCharacteristic.ResetTotal.UUID = 'E863F112-079E-48FF-8F27-9C2605A29F52';
  inherits(CustomCharacteristic.LastActivation, Characteristic);

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

  return CustomCharacteristic;
};
