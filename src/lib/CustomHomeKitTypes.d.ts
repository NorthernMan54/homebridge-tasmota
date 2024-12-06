import {
  Characteristic
} from 'homebridge';
/**
 * Abstract superclass for custom HomeKit types, including custom services and characteristics.
 */
export declare class CustomHomeKitTypes {
  constructor(homebridge: any);

  /**
   * Valid HomeKit admin-only access permissions.
   */
  get Access(): Readonly<Record<string, any>>;

  /**
   * Valid HomeKit characteristic formats.
   */
  get Formats(): Readonly<Record<string, any>>;

  /**
   * Valid HomeKit characteristic permissions.
   */
  get Perms(): Readonly<Record<string, any>>;

  /**
   * Standard HomeKit characteristic units.
   */
  get Units(): Readonly<Record<string, any>>;

  /**
   * Custom characteristics managed by this instance.
   */
  get Characteristics(): Record<string, any>;

  /**
   * Custom services managed by this instance.
   */
  get Services(): Record<string, any>;

  /**
   * Standard HomeKit characteristics.
   */
  get hapCharacteristics(): Record<string, any>;

  /**
   * Standard HomeKit services.
   */
  get hapServices(): Record<string, any>;

  /**
   * Create a new custom characteristic class.
   * @param key - The unique key for the characteristic.
   * @param uuid - The unique UUID for the characteristic.
   * @param props - The properties for the characteristic.
   * @param displayName - The display name for the characteristic.
   */
  createCharacteristicClass(
    key: string,
    uuid: string,
    props: Record<string, any>,
    displayName?: string
  ): any;

  /**
   * Create a new custom service class.
   * @param key - The unique key for the service.
   * @param uuid - The unique UUID for the service.
   * @param Characteristics - Characteristics required by the service.
   * @param OptionalCharacteristics - Optional characteristics for the service.
   */
  createServiceClass(
    key: string,
    uuid: string,
    Characteristics: Characteristic[],
    OptionalCharacteristics?: Characteristic[]
  ): any;

  /**
   * Generate a full HAP UUID.
   * @param id - The short HAP UUID.
   * @param suffix - The suffix for the full UUID.
   * @returns The full HAP UUID.
   */
  static uuid(id: string, suffix?: string): string;
}
