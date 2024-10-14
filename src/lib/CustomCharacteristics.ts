import { Formats, Perms, Units } from 'homebridge';

const inherits = require('util').inherits;


module.exports = function (hap) {

  const CustomCharacteristic: any = {};

  CustomCharacteristic.Voltage = new hap.Characteristic('Voltage', 'E863F10A-079E-48FF-8F27-9C2605A29F52'
    , {
      format: Formats.FLOAT,
      unit: 'V',
      perms: [Perms.PAIRED_READ, Perms.NOTIFY],
    });

  CustomCharacteristic.ElectricCurrent = new hap.Characteristic('Electric Current', 'E863F126-079E-48FF-8F27-9C2605A29F52',
    {
      format: Formats.FLOAT,
      unit: 'A',
      perms: [Perms.PAIRED_READ, Perms.NOTIFY],
    });

  // Aka watts

  CustomCharacteristic.CurrentConsumption = new hap.Characteristic('Current Consumption', 'E863F10D-079E-48FF-8F27-9C2605A29F52', {
    format: Formats.FLOAT,
    unit: 'W',
    perms: [Perms.PAIRED_READ, Perms.NOTIFY],
  });

  // Aka kilowatts

  CustomCharacteristic.TotalConsumption = new hap.Characteristic('Total Consumption', 'E863F10C-079E-48FF-8F27-9C2605A29F52', {
    format: Formats.FLOAT,
    unit: 'kWh',
    perms: [Perms.PAIRED_READ, Perms.NOTIFY],
  });


  CustomCharacteristic.AtmosphericPressureLevel = new hap.Characteristic('Air Pressure', 'E863F10F-079E-48FF-8F27-9C2605A29F52', {
    format: Formats.UINT16,
    unit: 'hPa',
    minValue: 100,      // Issue #45
    maxValue: 1100,
    minStep: 1,
    perms: [Perms.PAIRED_READ, Perms.NOTIFY],
  });


  CustomCharacteristic.AtmosphericPressureSensor = new hap.Service('AtmosphericPressureSensor', 'B77831FD-D66A-46A4-B66D-FD7EE8DFE3CE');

  // Required Characteristics
  CustomCharacteristic.AtmosphericPressureSensor.addCharacteristic(CustomCharacteristic.AtmosphericPressureLevel);

  // Optional Characteristics
  CustomCharacteristic.AtmosphericPressureSensor.addOptionalCharacteristic(hap.Characteristic.StatusActive); // Fixed line
  CustomCharacteristic.AtmosphericPressureSensor.addOptionalCharacteristic(hap.Characteristic.StatusFault);
  CustomCharacteristic.AtmosphericPressureSensor.addOptionalCharacteristic(hap.Characteristic.StatusLowBattery);
  CustomCharacteristic.AtmosphericPressureSensor.addOptionalCharacteristic(hap.Characteristic.StatusTampered);
  CustomCharacteristic.AtmosphericPressureSensor.addOptionalCharacteristic(hap.Characteristic.Name);

  CustomCharacteristic.ValvePosition = new hap.Characteristic('Valve position', 'E863F12E-079E-48FF-8F27-9C2605A29F52', {
    format: Formats.UINT8,
    unit: Units.PERCENTAGE,
    perms: [Perms.PAIRED_READ, Perms.NOTIFY],
  });

  CustomCharacteristic.ProgramCommand = new hap.Characteristic('Program command', 'E863F12C-079E-48FF-8F27-9C2605A29F52', {
    format: Formats.DATA,
    perms: [Perms.PAIRED_WRITE, Perms.NOTIFY],
  });

  CustomCharacteristic.ProgramData = new hap.Characteristic('Program data', 'E863F12F-079E-48FF-8F27-9C2605A29F52', {
    format: Formats.DATA,
    perms: [Perms.PAIRED_READ, Perms.NOTIFY],
  });


  CustomCharacteristic.LastActivation = new hap.Characteristic('Last Activation', 'E863F11A-079E-48FF-8F27-9C2605A29F52', {
    format: Formats.UINT32,
    unit: Units.SECONDS,
    perms: [Perms.PAIRED_READ, Perms.NOTIFY],
  });

  CustomCharacteristic.ResetTotal = new hap.Characteristic('Reset Total', 'E863F112-079E-48FF-8F27-9C2605A29F52', {
    format: Formats.UINT32,
    unit: Units.SECONDS,
    perms: [Perms.PAIRED_READ, Perms.NOTIFY],
  });

  CustomCharacteristic.TimesOpened = new hap.Characteristic('Times Opened', 'E863F129-079E-48FF-8F27-9C2605A29F52', {
    format: Formats.UINT32,
    perms: [Perms.PAIRED_READ, Perms.NOTIFY],
  });

  return CustomCharacteristic;
};