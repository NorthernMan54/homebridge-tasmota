import { Formats, Perms, Units } from 'homebridge';

const inherits = require('util').inherits;

module.exports = function (hap) {

  const CustomCharacteristic: any = {};

  class Voltage extends hap.Characteristic {
    constructor() {
      super('Voltage', 'E863F10A-079E-48FF-8F27-9C2605A29F52', {
        format: Formats.FLOAT,
        unit: 'V',
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  }
  CustomCharacteristic.Voltage = Voltage

  class ElectricCurrent extends hap.Characteristic {
    constructor() {
      super('Electric Current', 'E863F126-079E-48FF-8F27-9C2605A29F52', {
        format: Formats.FLOAT,
        unit: 'A',
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  }
  CustomCharacteristic.ElectricCurrent = ElectricCurrent;

  class CurrentConsumption extends hap.Characteristic {
    constructor() {
      super('Current Consumption', 'E863F10D-079E-48FF-8F27-9C2605A29F52', {
        format: Formats.FLOAT,
        unit: 'W',
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  }
  CustomCharacteristic.CurrentConsumption = CurrentConsumption;

  class TotalConsumption extends hap.Characteristic {
    constructor() {
      super('Total Consumption', 'E863F10C-079E-48FF-8F27-9C2605A29F52', {
        format: Formats.FLOAT,
        unit: 'kWh',
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  }
  CustomCharacteristic.TotalConsumption = TotalConsumption;

  class AtmosphericPressureLevel extends hap.Characteristic {
    constructor() {
      super('Air Pressure', 'E863F10F-079E-48FF-8F27-9C2605A29F52', {
        format: Formats.UINT16,
        unit: 'hPa',
        minValue: 100,      // Issue #45
        maxValue: 1100,
        minStep: 1,
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  }
  CustomCharacteristic.AtmosphericPressureLevel = AtmosphericPressureLevel;

  class AtmosphericPressureSensor extends hap.Service {
    constructor() {
      super('AtmosphericPressureSensor', 'B77831FD-D66A-46A4-B66D-FD7EE8DFE3CE');
      // Required Characteristics
      this.addCharacteristic(CustomCharacteristic.AtmosphericPressureLevel);

      // Optional Characteristics
      this.addOptionalCharacteristic(hap.Characteristic.StatusActive); // Fixed line
      this.addOptionalCharacteristic(hap.Characteristic.StatusFault);
      this.addOptionalCharacteristic(hap.Characteristic.StatusLowBattery);
      this.addOptionalCharacteristic(hap.Characteristic.StatusTampered);
      this.addOptionalCharacteristic(hap.Characteristic.Name);
    }
  }
  CustomCharacteristic.AtmosphericPressureSensor = AtmosphericPressureSensor;



  class ValvePosition extends hap.Characteristic {
    constructor() {
      super('Valve Position', 'E863F12E-079E-48FF-8F27-9C2605A29F52', {
        format: Formats.UINT8,
        unit: Units.PERCENTAGE,
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  }
  CustomCharacteristic.ValvePosition = ValvePosition;

  class ProgramCommand extends hap.Characteristic {
    constructor() {
      super('Program Command', 'E863F12C-079E-48FF-8F27-9C2605A29F52', {
        format: Formats.DATA,
        perms: [Perms.PAIRED_WRITE, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  }
  CustomCharacteristic.ProgramCommand = ProgramCommand;

  class ProgramData extends hap.Characteristic {
    constructor() {
      super('Program Data', 'E863F12F-079E-48FF-8F27-9C2605A29F52', {
        format: Formats.DATA,
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  }
  CustomCharacteristic.ProgramData = ProgramData;

  class LastActivation extends hap.Characteristic {
    constructor() {
      super('Last Activation', 'E863F11A-079E-48FF-8F27-9C2605A29F52', {
        format: Formats.UINT32,
        unit: Units.SECONDS,
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  }
  CustomCharacteristic.LastActivation = LastActivation;


  class ResetTotal extends hap.Characteristic {
    constructor() {
      super('Reset Total', 'E863F112-079E-48FF-8F27-9C2605A29F52', {
        format: Formats.UINT32,
        unit: Units.SECONDS,
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  }
  CustomCharacteristic.ResetTotal = ResetTotal;

  class TimesOpened extends hap.Characteristic {
    constructor() {
      super('Times Opened', 'E863F129-079E-48FF-8F27-9C2605A29F52', {
        format: Formats.UINT32,
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  }
  CustomCharacteristic.TimesOpened = TimesOpened;

  return CustomCharacteristic;
};