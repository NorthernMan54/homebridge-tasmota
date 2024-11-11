import { expect } from '@jest/globals';
import { Formats, Perms, Units } from 'homebridge';
import { Characteristic, Service } from 'hap-nodejs';
import customCharacteristics from './CustomCharacteristics';

describe('CustomCharacteristic', () => {

  test('CustomCharacteristic object is defined', () => {
    expect(customCharacteristics).toBeDefined();
  });

  test.only('Voltage characteristic has correct properties', () => {
    console.log(customCharacteristics);
    const voltage = new customCharacteristics.Voltage();
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
    const electricCurrent = new customCharacteristics.ElectricCurrent();
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
    const currentConsumption = new customCharacteristics.CurrentConsumption();
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
    const totalConsumption = new customCharacteristics.TotalConsumption();
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
    const pressureLevel = new customCharacteristics.AtmosphericPressureLevel();
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
    const valvePosition = new customCharacteristics.ValvePosition();
    expect(valvePosition.displayName).toBe('Valve position');
    expect(valvePosition.UUID).toBe('E863F12E-079E-48FF-8F27-9C2605A29F52');
    expect(valvePosition.props).toEqual({
      format: Formats.UINT8,
      unit: Units.PERCENTAGE,
      perms: [Perms.PAIRED_READ, Perms.NOTIFY],
    });
    expect(valvePosition.value).toBeDefined();
  });

  test('Program Command characteristic has correct properties', () => {
    const programCommand = new customCharacteristics.ProgramCommand();
    expect(programCommand.displayName).toBe('Program command');
    expect(programCommand.UUID).toBe('E863F12C-079E-48FF-8F27-9C2605A29F52');
    expect(programCommand.props).toEqual({
      format: Formats.DATA,
      perms: [Perms.PAIRED_WRITE, Perms.NOTIFY],
    });
    expect(programCommand.value).toBeDefined();
  });

  test('Last Activation characteristic has correct properties', () => {
    const lastActivation = new customCharacteristics.LastActivation();
    expect(lastActivation.displayName).toBe('Last Activation');
    expect(lastActivation.UUID).toBe('E863F11A-079E-48FF-8F27-9C2605A29F52');
    expect(lastActivation.props).toEqual({
      format: Formats.UINT32,
      unit: Units.SECONDS,
      perms: [Perms.PAIRED_READ, Perms.NOTIFY],
    });
    expect(lastActivation.value).toBeDefined();
  });

  test('Reset Total characteristic has correct properties', () => {
    const resetTotal = new customCharacteristics.ResetTotal();
    expect(resetTotal.displayName).toBe('Reset Total');
    expect(resetTotal.UUID).toBe('E863F112-079E-48FF-8F27-9C2605A29F52');
    expect(resetTotal.props).toEqual({
      format: Formats.UINT32,
      unit: Units.SECONDS,
      perms: [Perms.PAIRED_READ, Perms.NOTIFY],
    });
    expect(resetTotal.value).toBeDefined();
  });

  test('Times Opened characteristic has correct properties', () => {
    const timesOpened = new customCharacteristics.TimesOpened();
    expect(timesOpened.displayName).toBe('Times Opened');
    expect(timesOpened.UUID).toBe('E863F129-079E-48FF-8F27-9C2605A29F52');
    expect(timesOpened.props).toEqual({
      format: Formats.UINT32,
      perms: [Perms.PAIRED_READ, Perms.NOTIFY],
    });
    expect(timesOpened.value).toBeDefined();
  });
});
