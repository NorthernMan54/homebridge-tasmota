import {
  Characteristic,
  Service
} from 'homebridge';
import { CustomHomeKitTypes } from './CustomHomeKitTypes';

/**
 * Custom HomeKit services and characteristics used by Eve accessories and the Eve app.
 * Extends `CustomHomeKitTypes`.
 */

declare module 'EveHomeKitTypes' {
  export interface Characteristics {
    TimesOpened: any; // Define the type of TimesOpened as needed
  }

  export interface EveHomeKitTypes {
    Characteristics: Characteristics;
  }
}

export declare class EveHomeKitTypes extends CustomHomeKitTypes {
  /**
   * Start time for Eve history (2001-01-01T00:00:00Z).
   */
  static get epoch(): number;

  /**
   * Create custom HomeKit services and characteristics used by Eve.
   * @param homebridge - The API object from Homebridge.
   */
  constructor(homebridge: any);

  /**
   * Custom characteristics defined by Eve.
   */
  Characteristics: {
    Voltage: Characteristic;
    AirParticulateDensity: Characteristic;
    VOCLevel: Characteristic;
    TotalConsumption: Characteristic;
    Consumption: Characteristic;
    CurrentConsumption: Characteristic;
    AirPressure: Characteristic;
    ResetTotal: Characteristic;
    HistoryStatus: Characteristic;
    HistoryEntries: Characteristic;
    OpenDuration: Characteristic;
    ClosedDuration: Characteristic;
    LastActivation: Characteristic;
    HistoryRequest: Characteristic;
    ConfigCommand: Characteristic;
    Sensitivity: Characteristic;
    SetTime: Characteristic;
    ElectricCurrent: Characteristic;
    TimesOpened: Characteristic;
    ProgramCommand: Characteristic;
    Duration: Characteristic;
    ValvePosition: Characteristic;
    ProgramData: Characteristic;
    Elevation: Characteristic;
    ConfigData: Characteristic;
    WeatherTrend: Characteristic;
    [key: string]: Characteristic; // Allows for additional dynamic characteristics.
  };

  /**
   * Custom services defined by Eve.
   */
  Services: {
    Weather: Service;
    History: Service;
    Consumption: Service;
    AirPressureSensor: Service;
    ContactSensor: Service;
    MotionSensor: Service;
    Outlet: Service;
    TemperatureSensor: Service;
    Thermostat: Service;
    [key: string]: Service; // Allows for additional dynamic services.
  };
}
