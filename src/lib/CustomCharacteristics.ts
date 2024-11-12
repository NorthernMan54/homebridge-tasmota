import { inherits } from 'util';
import { Characteristic, Service, Formats, Perms, Units } from 'hap-nodejs';

export namespace CustomCharacteristics {

  export class Voltage extends Characteristic {
    static readonly UUID: string = 'E863F10A-079E-48FF-8F27-9C2605A29F52';

    constructor() {
      super('Voltage', CustomCharacteristics.Voltage.UUID, {
        format: Formats.FLOAT,
        unit: 'V',
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  }

  inherits(CustomCharacteristics.Voltage, Characteristic);

  export class ElectricCurrent extends Characteristic {
    static readonly UUID: string = 'E863F126-079E-48FF-8F27-9C2605A29F52';

    constructor() {
      super('Electric Current', CustomCharacteristics.ElectricCurrent.UUID, {
        format: Formats.FLOAT,
        unit: 'A',
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  }

  inherits(CustomCharacteristics.ElectricCurrent, Characteristic);

  export class CurrentConsumption extends Characteristic {
    static readonly UUID: string = 'E863F10D-079E-48FF-8F27-9C2605A29F52';

    constructor() {
      super('Current Consumption', CustomCharacteristics.CurrentConsumption.UUID, {
        format: Formats.FLOAT,
        unit: 'W',
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  }

  inherits(CustomCharacteristics.CurrentConsumption, Characteristic);

  export class TotalConsumption extends Characteristic {
    static readonly UUID: string = 'E863F10C-079E-48FF-8F27-9C2605A29F52';

    constructor() {
      super('Total Consumption', CustomCharacteristics.TotalConsumption.UUID, {
        format: Formats.FLOAT,
        unit: 'kWh',
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  }

  inherits(CustomCharacteristics.TotalConsumption, Characteristic);

  export class AtmosphericPressureLevel extends Characteristic {
    static readonly UUID: string = 'E863F10F-079E-48FF-8F27-9C2605A29F52';

    constructor() {
      super('Air Pressure', CustomCharacteristics.AtmosphericPressureLevel.UUID, {
        format: Formats.UINT16,
        unit: 'hPa',
        minValue: 100,
        maxValue: 1100,
        minStep: 1,
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  }

  inherits(CustomCharacteristics.AtmosphericPressureLevel, Characteristic);

  export class ValvePosition extends Characteristic {
    static readonly UUID: string = 'E863F12E-079E-48FF-8F27-9C2605A29F52';

    constructor() {
      super('Valve Position', CustomCharacteristics.ValvePosition.UUID, {
        format: Formats.UINT8,
        unit: Units.PERCENTAGE,
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  }

  inherits(CustomCharacteristics.ValvePosition, Characteristic);

  export class LastActivation extends Characteristic {
    static readonly UUID: string = 'E863F11A-079E-48FF-8F27-9C2605A29F52';

    constructor() {
      super('Last Activation', CustomCharacteristics.LastActivation.UUID, {
        format: Formats.UINT32,
        unit: Units.SECONDS,
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  }

  inherits(CustomCharacteristics.LastActivation, Characteristic);

  export class ProgramCommand extends Characteristic {
    static readonly UUID: string = 'E863F12C-079E-48FF-8F27-9C2605A29F52';

    constructor() {
      super('Program Command', CustomCharacteristics.ProgramCommand.UUID, {
        format: Formats.DATA,
        perms: [Perms.PAIRED_WRITE, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  }

  inherits(CustomCharacteristics.ProgramCommand, Characteristic);

  export class TimesOpened extends Characteristic {
    static readonly UUID: string = 'E863F129-079E-48FF-8F27-9C2605A29F52';

    constructor() {
      super('Times Opened', CustomCharacteristics.TimesOpened.UUID, {
        format: Formats.UINT32,
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  }

  inherits(CustomCharacteristics.TimesOpened, Characteristic);

  export class ResetTotal extends Characteristic {
    static readonly UUID: string = 'E863F112-079E-48FF-8F27-9C2605A29F52';

    constructor() {
      super('Reset Total', CustomCharacteristics.ResetTotal.UUID, {
        format: Formats.UINT32,
        unit: Units.SECONDS,
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  }

  inherits(CustomCharacteristics.ResetTotal, Characteristic);

  export class ProgramData extends Characteristic {
    static readonly UUID: string = 'E863F12F-079E-48FF-8F27-9C2605A29F52';

    constructor() {
      super('Program Data', CustomCharacteristics.ProgramData.UUID, {
        format: Formats.DATA,
        perms: [Perms.PAIRED_WRITE, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  }

  inherits(CustomCharacteristics.ProgramData, Characteristic);

  export class AtmosphericPressureSensor extends Service {
    static readonly UUID: string = 'B77831FD-D66A-46A4-B66D-FD7EE8DFE3CE';

    constructor(displayName?: string, subtype?: string) {
      super(displayName, AtmosphericPressureSensor.UUID, subtype);

      this.addCharacteristic(CustomCharacteristics.AtmosphericPressureLevel);

      this.addOptionalCharacteristic(Characteristic.StatusActive);
      this.addOptionalCharacteristic(Characteristic.StatusFault);
      this.addOptionalCharacteristic(Characteristic.StatusLowBattery);
      this.addOptionalCharacteristic(Characteristic.StatusTampered);
      this.addOptionalCharacteristic(Characteristic.Name);
    }
  }

  inherits(CustomCharacteristics.AtmosphericPressureSensor, Service);
}