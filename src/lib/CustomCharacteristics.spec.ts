import { expect } from '@jest/globals';
import { CustomCharacteristics } from './CustomCharacteristics';
import { Formats, Perms, Units } from 'hap-nodejs';

describe('Custom Characteristics', () => {

  test('CustomCharacteristic object is defined', () => {
    expect(CustomCharacteristics).toBeDefined();
  });

  test('Voltage characteristic has correct properties', () => {
    const voltage = new CustomCharacteristics.Voltage();
    expect(voltage.displayName).toBe('Voltage');
    expect(voltage.UUID).toBe('E863F10A-079E-48FF-8F27-9C2605A29F52');
    expect(voltage.props).toEqual({
      format: Formats.FLOAT,
      unit: 'V',
      perms: [Perms.PAIRED_READ, Perms.NOTIFY],
    });
    expect(voltage.value).toBeDefined();
  });

  test('Electric Current characteristic has correct properties', () => {
    const electricCurrent = new CustomCharacteristics.ElectricCurrent();
    expect(electricCurrent.displayName).toBe('Electric Current');
    expect(electricCurrent.UUID).toBe('E863F126-079E-48FF-8F27-9C2605A29F52');
    expect(electricCurrent.props).toEqual({
      format: Formats.FLOAT,
      unit: 'A',
      perms: [Perms.PAIRED_READ, Perms.NOTIFY],
    });
    expect(electricCurrent.value).toBeDefined();
  });

  test('Current Consumption characteristic has correct properties', () => {
    const currentConsumption = new CustomCharacteristics.CurrentConsumption();
    expect(currentConsumption.displayName).toBe('Current Consumption');
    expect(currentConsumption.UUID).toBe('E863F10D-079E-48FF-8F27-9C2605A29F52');
    expect(currentConsumption.props).toEqual({
      format: Formats.FLOAT,
      unit: 'W',
      perms: [Perms.PAIRED_READ, Perms.NOTIFY],
    });
    expect(currentConsumption.value).toBeDefined();
  });

  test('Total Consumption characteristic has correct properties', () => {
    const totalConsumption = new CustomCharacteristics.TotalConsumption();
    expect(totalConsumption.displayName).toBe('Total Consumption');
    expect(totalConsumption.UUID).toBe('E863F10C-079E-48FF-8F27-9C2605A29F52');
    expect(totalConsumption.props).toEqual({
      format: Formats.FLOAT,
      unit: 'kWh',
      perms: [Perms.PAIRED_READ, Perms.NOTIFY],
    });
    expect(totalConsumption.value).toBeDefined();
  });

  test('Atmospheric Pressure Level characteristic has correct properties', () => {
    const pressureLevel = new CustomCharacteristics.AtmosphericPressureLevel();
    expect(pressureLevel.displayName).toBe('Air Pressure');
    expect(pressureLevel.UUID).toBe('E863F10F-079E-48FF-8F27-9C2605A29F52');
    expect(pressureLevel.props).toEqual({
      format: Formats.UINT16,
      unit: 'hPa',
      minValue: 100,
      maxValue: 1100,
      minStep: 1,
      perms: [Perms.PAIRED_READ, Perms.NOTIFY],
    });
    expect(pressureLevel.value).toBeDefined();
  });

  test('Valve Position characteristic has correct properties', () => {
    const valvePosition = new CustomCharacteristics.ValvePosition();
    expect(valvePosition.displayName).toBe('Valve Position');
    expect(valvePosition.UUID).toBe('E863F12E-079E-48FF-8F27-9C2605A29F52');
    expect(valvePosition.props).toEqual({
      format: Formats.UINT8,
      unit: Units.PERCENTAGE,
      perms: [Perms.PAIRED_READ, Perms.NOTIFY],
    });
    expect(valvePosition.value).toBeDefined();
  });

  test('Program Command characteristic has correct properties', () => {
    const programCommand = new CustomCharacteristics.ProgramCommand();
    expect(programCommand.displayName).toBe('Program Command');
    expect(programCommand.UUID).toBe('E863F12C-079E-48FF-8F27-9C2605A29F52');
    expect(programCommand.props).toEqual({
      format: Formats.DATA,
      perms: [Perms.PAIRED_WRITE, Perms.NOTIFY],
    });
    expect(programCommand.value).toBeDefined();
  });

  test('Last Activation characteristic has correct properties', () => {
    const lastActivation = new CustomCharacteristics.LastActivation();
    expect(lastActivation.displayName).toBe('Last Activation');
    expect(lastActivation.UUID).toBe('E863F11A-079E-48FF-8F27-9C2605A29F52');
    expect(lastActivation.props).toEqual({
      format: Formats.UINT32,
      unit: Units.SECONDS,
      perms: [Perms.PAIRED_READ, Perms.NOTIFY],
    });
    expect(lastActivation.value).toBeDefined();
  });

  test('Times Opened characteristic has correct properties', () => {
    const timesOpened = new CustomCharacteristics.TimesOpened();
    expect(timesOpened.displayName).toBe('Times Opened');
    expect(timesOpened.UUID).toBe('E863F129-079E-48FF-8F27-9C2605A29F52');
    expect(timesOpened.props).toEqual({
      format: Formats.UINT32,
      perms: [Perms.PAIRED_READ, Perms.NOTIFY],
    });
    expect(timesOpened.value).toBeDefined();
  });

  test('Reset Total characteristic has correct properties', () => {
    expect(CustomCharacteristics.ResetTotal).toBeDefined();
    const resetTotal = new CustomCharacteristics.ResetTotal();
    expect(resetTotal).toBeDefined();
    expect(resetTotal.displayName).toBe('Reset Total');
    expect(resetTotal.UUID).toBe('E863F112-079E-48FF-8F27-9C2605A29F52');
    expect(resetTotal.props).toEqual({
      format: Formats.UINT32,
      unit: Units.SECONDS,
      perms: [Perms.PAIRED_READ, Perms.NOTIFY],
    });
    expect(resetTotal.value).toBeDefined();
  });
});

describe('Custom Services', () => {
  test('CustomCharacteristic object is defined', () => {
    expect(CustomCharacteristics).toBeDefined();
  });

  test('Atmospheric Pressure Sensor has correct properties', () => {
    expect(CustomCharacteristics.AtmosphericPressureSensor).toBeDefined();
    const atmosphericPressureSensor = new CustomCharacteristics.AtmosphericPressureSensor('test Atmospheric Pressure Sensor');
    expect(atmosphericPressureSensor).toBeDefined();
    expect(atmosphericPressureSensor.displayName).toBe('test Atmospheric Pressure Sensor');
    expect(atmosphericPressureSensor.UUID).toBe('B77831FD-D66A-46A4-B66D-FD7EE8DFE3CE');
    expect(atmosphericPressureSensor.characteristics).toBeDefined();
  });

});  
