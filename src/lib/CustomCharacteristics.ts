import { Formats, Perms, Units } from 'homebridge';
import { Characteristic, Service } from 'hap-nodejs';
import { inherits } from 'util';

export const CustomCharacteristic: any = {};

CustomCharacteristic.Voltage = function () {
  Characteristic.call(this, 'Voltage', CustomCharacteristic.Voltage.UUID);
  this.setProps({
    format: Formats.FLOAT,
    unit: 'V',
    perms: [Perms.PAIRED_READ, Perms.NOTIFY],
  });
  this.value = this.getDefaultValue();
};
CustomCharacteristic.Voltage.UUID = 'E863F10A-079E-48FF-8F27-9C2605A29F52';
inherits(CustomCharacteristic.Voltage, Characteristic);

CustomCharacteristic.ElectricCurrent = function () {
  Characteristic.call(this, 'Electric Current', CustomCharacteristic.ElectricCurrent.UUID);
  this.setProps({
    format: Formats.FLOAT,
    unit: 'A',
    perms: [Perms.PAIRED_READ, Perms.NOTIFY],
  });
  this.value = this.getDefaultValue();
};
CustomCharacteristic.ElectricCurrent.UUID = 'E863F126-079E-48FF-8F27-9C2605A29F52';
inherits(CustomCharacteristic.ElectricCurrent, Characteristic);

CustomCharacteristic.CurrentConsumption = function () {
  Characteristic.call(this, 'Current Consumption', CustomCharacteristic.CurrentConsumption.UUID);
  this.setProps({
    format: Formats.FLOAT,
    unit: 'W',
    perms: [Perms.PAIRED_READ, Perms.NOTIFY],
  });
  this.value = this.getDefaultValue();
};
CustomCharacteristic.CurrentConsumption.UUID = 'E863F10D-079E-48FF-8F27-9C2605A29F52';
inherits(CustomCharacteristic.CurrentConsumption, Characteristic);

CustomCharacteristic.TotalConsumption = function () {
  Characteristic.call(this, 'Total Consumption', CustomCharacteristic.TotalConsumption.UUID);
  this.setProps({
    format: Formats.FLOAT,
    unit: 'kWh',
    perms: [Perms.PAIRED_READ, Perms.NOTIFY],
  });
  this.value = this.getDefaultValue();
};
CustomCharacteristic.TotalConsumption.UUID = 'E863F10C-079E-48FF-8F27-9C2605A29F52';
inherits(CustomCharacteristic.TotalConsumption, Characteristic);

CustomCharacteristic.AtmosphericPressureLevel = function () {
  Characteristic.call(this, 'Air Pressure', CustomCharacteristic.AtmosphericPressureLevel.UUID);
  this.setProps({
    format: Formats.UINT16,
    unit: 'hPa',
    minValue: 100,
    maxValue: 1100,
    minStep: 1,
    perms: [Perms.PAIRED_READ, Perms.NOTIFY],
  });
  this.value = this.getDefaultValue();
};
CustomCharacteristic.AtmosphericPressureLevel.UUID = 'E863F10F-079E-48FF-8F27-9C2605A29F52';
inherits(CustomCharacteristic.AtmosphericPressureLevel, Characteristic);

CustomCharacteristic.AtmosphericPressureSensor = function (displayName: string, subtype?: string) {
  Service.call(this, displayName, CustomCharacteristic.AtmosphericPressureSensor.UUID, subtype);
  this.addCharacteristic(CustomCharacteristic.AtmosphericPressureLevel);
};
CustomCharacteristic.AtmosphericPressureSensor.UUID = 'B77831FD-D66A-46A4-B66D-FD7EE8DFE3CE';
inherits(CustomCharacteristic.AtmosphericPressureSensor, Service);

CustomCharacteristic.ValvePosition = function () {
  Characteristic.call(this, 'Valve position', 'E863F12E-079E-48FF-8F27-9C2605A29F52');
  this.setProps({
    format: Formats.UINT8,
    unit: Units.PERCENTAGE,
    perms: [Perms.PAIRED_READ, Perms.NOTIFY],
  });
  this.value = this.getDefaultValue();
};
inherits(CustomCharacteristic.ValvePosition, Characteristic);

CustomCharacteristic.ProgramCommand = function () {
  Characteristic.call(this, 'Program command', 'E863F12C-079E-48FF-8F27-9C2605A29F52');
  this.setProps({
    format: Formats.DATA,
    perms: [Perms.PAIRED_WRITE, Perms.NOTIFY],
  });
  this.value = this.getDefaultValue();
};
inherits(CustomCharacteristic.ProgramCommand, Characteristic);

CustomCharacteristic.ProgramData = function () {
  Characteristic.call(this, 'Program data', 'E863F12F-079E-48FF-8F27-9C2605A29F52');
  this.setProps({
    format: Formats.DATA,
    perms: [Perms.PAIRED_READ, Perms.NOTIFY],
  });
  this.value = this.getDefaultValue();
};
inherits(CustomCharacteristic.ProgramData, Characteristic);

CustomCharacteristic.LastActivation = function () {
  Characteristic.call(this, 'Last Activation', CustomCharacteristic.LastActivation.UUID);
  this.setProps({
    format: Formats.UINT32,
    unit: Units.SECONDS,
    perms: [Perms.PAIRED_READ, Perms.NOTIFY],
  });
  this.value = this.getDefaultValue();
};
CustomCharacteristic.LastActivation.UUID = 'E863F11A-079E-48FF-8F27-9C2605A29F52';
inherits(CustomCharacteristic.LastActivation, Characteristic);

CustomCharacteristic.ResetTotal = function () {
  Characteristic.call(this, 'Reset Total', CustomCharacteristic.ResetTotal.UUID);
  this.setProps({
    format: Formats.UINT32,
    unit: Units.SECONDS,
    perms: [Perms.PAIRED_READ, Perms.NOTIFY],
  });
  this.value = this.getDefaultValue();
};
CustomCharacteristic.ResetTotal.UUID = 'E863F112-079E-48FF-8F27-9C2605A29F52';
inherits(CustomCharacteristic.ResetTotal, Characteristic);

CustomCharacteristic.TimesOpened = function () {
  Characteristic.call(this, 'Times Opened', CustomCharacteristic.TimesOpened.UUID);
  this.setProps({
    format: Formats.UINT32,
    perms: [Perms.PAIRED_READ, Perms.NOTIFY],
  });
  this.value = this.getDefaultValue();
};
CustomCharacteristic.TimesOpened.UUID = 'E863F129-079E-48FF-8F27-9C2605A29F52';
inherits(CustomCharacteristic.TimesOpened, Characteristic);

export default CustomCharacteristic;
