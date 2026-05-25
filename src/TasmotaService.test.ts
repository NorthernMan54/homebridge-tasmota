import { vi } from 'vitest';
import { TasmotaService } from './TasmotaService.js';
import {
  makeAccessory, makeDevice, makePlatform,
  makeSwitchAccessory, makeSwitchDevice, makeSwitchPlatform, SWITCH_UNIQ_ID,
  UNIQ_ID,
} from './__mocks__/mocks.js';

describe.skip('TasmotaService', () => {
  describe('constructor', () => {
    it('should create a service and register ConfiguredName listener', () => {
      const device = makeDevice();
      const platform = makePlatform(device) as any;
      const accessory = makeAccessory(device) as any;
      const serviceType = {};

      const instance = new TasmotaService(platform, accessory, UNIQ_ID);

      // UUID generated from uniq_id
      expect(platform.api.hap.uuid.generate).toHaveBeenCalledWith(UNIQ_ID);

      // addService called since getService returned undefined
      expect(accessory.addService).toHaveBeenCalledWith(serviceType, device.name, expect.any(String));

      // service is assigned
      expect(instance.service).toBeDefined();
      expect(instance.service).toBe(accessory._mockService);

      // ConfiguredName 'set' listener registered
      expect(accessory._mockService.getCharacteristic).toHaveBeenCalledWith('ConfiguredName');
      // expect(accessory._mockCharacteristic.on).toHaveBeenCalledWith('set', expect.any(Function));

      // device_class set correctly
      expect((instance as any).device_class).toBe('temperature');
    });

    it('should reuse existing service when getService returns one', () => {
      const device = makeDevice();
      const platform = makePlatform(device) as any;
      const accessory = makeAccessory(device) as any;

      // Simulate existing service
      accessory.getService = vi.fn().mockReturnValue(accessory._mockService);

      const instance = new TasmotaService(platform, accessory, UNIQ_ID);

      expect(accessory.addService).not.toHaveBeenCalled();
      expect(instance.service).toBe(accessory._mockService);
    });
  });

  describe('switch device (tasmotaType: switch)', () => {
    it('should create a service for a switch device config', () => {
      const device = makeSwitchDevice();
      const platform = makeSwitchPlatform(device) as any;
      const accessory = makeSwitchAccessory(device) as any;
      const serviceType = {};

      const instance = new TasmotaService(platform, accessory, SWITCH_UNIQ_ID);

      // UUID generated from switch uniq_id
      expect(platform.api.hap.uuid.generate).toHaveBeenCalledWith(SWITCH_UNIQ_ID);

      // addService called since getService returned undefined
      expect(accessory.addService).toHaveBeenCalledWith(serviceType, device.name, expect.any(String));

      // service is assigned
      expect(instance.service).toBeDefined();
      expect(instance.service).toBe(accessory._mockService);

      // ConfiguredName 'set' listener registered
      expect(accessory._mockService.getCharacteristic).toHaveBeenCalledWith('ConfiguredName');
    });
  });

});
