import { Characteristic, CharacteristicProps, Formats, Perms, Service } from '@homebridge/hap-nodejs';
import { vi } from 'vitest';
import { tasmotaSensorService } from './tasmotaSensorService.js';

const ENERGY_UNIQ_ID = '139827_ENERGY_TotalStartTime';

describe.skip('tasmotaSensorService', () => {
  describe('constructor', () => {
    describe('ENERGY TotalStartTime sensor (no dev_cla)', () => {
      it('should not create a sensor service and warn for missing dev_cla', () => {
        const device = makeEnergyDevice();
        const platform = makeEnergyPlatform() as any;
        const accessory = makeEnergyAccessory(device) as any;

        const instance = new tasmotaSensorService(platform, accessory, ENERGY_UNIQ_ID);

        // expect(platform.api.hap.uuid.generate).toHaveBeenCalledWith(ENERGY_UNIQ_ID);
        expect(platform.deviceClassToHKService).toHaveBeenCalledWith(undefined);
        expect(instance.service).toBeUndefined();
        expect((instance as any).device_class).toBeUndefined();
        expect(platform.log.warn).toHaveBeenCalledWith('Warning: missing dev_cla', device.name);
        // expect(platform.mqttHost.on).toHaveBeenCalledWith(device.stat_t, expect.any(Function));
        // expect(platform.mqttHost.on).toHaveBeenCalledWith(device.avty_t, expect.any(Function));
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Local test helpers
// ---------------------------------------------------------------------------

function makeEnergyDevice(overrides = {}) {
  return {
    name: 'Trailer Power ENERGY TotalStartTime',
    stat_t: 'tele/tasmota_139827/SENSOR',
    avty_t: 'tele/tasmota_139827/LWT',
    pl_avail: 'Online',
    pl_not_avail: 'Offline',
    uniq_id: ENERGY_UNIQ_ID,
    dev: { ids: ['139827'] },
    unit_of_meas: ' ',
    ic: 'mdi:progress-clock',
    frc_upd: true,
    val_tpl: '{{value_json[\'ENERGY\'][\'TotalStartTime\']}}',
    tasmotaType: 'sensor',
    pl_on: 'ON',
    pl_off: 'OFF',
    ...overrides,
  };
}

function mockCharacteristic() {
  return {
    on: vi.fn().mockReturnThis(),
    listenerCount: vi.fn().mockReturnValue(0),
    value: null,
    updateValue: vi.fn(),
    displayName: 'ConfiguredName',
    setProps: vi.fn().mockReturnThis(),
  };
}

function mockService(name: string) {
  const ch = mockCharacteristic();
  return {
    displayName: name,
    getCharacteristic: vi.fn().mockReturnValue(ch),
    addCharacteristic: vi.fn().mockReturnValue(ch),
    setCharacteristic: vi.fn().mockReturnThis(),
    _mockCharacteristic: ch,
  };
}

function makeEnergyPlatform() {
  const makeCustomChar = (uuid: string) => {
    const props: CharacteristicProps = { format: 'float' as Formats, perms: ['ev' as Perms, 'pr' as Perms] };
    return class extends Characteristic {
      static UUID = uuid;
      constructor() {
        super('Custom', uuid, props);
      }
    };
  };
  const makeCustomSvc = (uuid: string) => class extends Service {
    static UUID = uuid;
    constructor(displayName?: string, subtype?: string) {
      super(displayName ?? '', uuid, subtype);
    }
  };

  return {
    api: {
      hap: {
        uuid: { generate: vi.fn().mockReturnValue(`mock-uuid-${ENERGY_UNIQ_ID}`) },
      },
    },
    Service,
    Characteristic,
    CustomServices: {
      Weather: makeCustomSvc('E863F001-079E-48FF-8F27-9C2605A29F52'),
      AirPressureSensor: makeCustomSvc('E863F00A-079E-48FF-8F27-9C2605A29F52'),
      Outlet: makeCustomSvc('00000047-0000-1000-8000-0026BB765291'),
    },
    CustomCharacteristics: {
      Voltage: makeCustomChar('E863F10A-079E-48FF-8F27-9C2605A29F52'),
      TotalConsumption: makeCustomChar('E863F10C-079E-48FF-8F27-9C2605A29F52'),
      CurrentConsumption: makeCustomChar('E863F10D-079E-48FF-8F27-9C2605A29F52'),
      AirPressure: makeCustomChar('E863F10F-079E-48FF-8F27-9C2605A29F52'),
      ElectricCurrent: makeCustomChar('E863F126-079E-48FF-8F27-9C2605A29F52'),
    },
    deviceClassToHKService: vi.fn().mockReturnValue(undefined),
    mqttHost: {
      on: vi.fn(),
      statusSubscribe: vi.fn(),
      availabilitySubscribe: vi.fn(),
      sendMessage: vi.fn(),
    },
    config: {
      platform: 'Tasmota',
      name: 'Tasmota',
      mqttHost: 'mqtt.local',
      history: false,
      debug: true,
      cleanup: 0,
      filterAllow: ['139827'],
      filterDeny: ['5673B2'],
      teleperiod: 300,
    },
    log: {
      info: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      prefix: 'Tasmota',
    },
    FakeGatoHistoryService: vi.fn(),
    teleperiod: 300,
    autoCleanup: vi.fn(),
  };
}

function makeEnergyAccessory(device = makeEnergyDevice()) {
  const accessoryInfoService = new Service.AccessoryInformation('', '');
  const outletService = new Service.Outlet('Trailer Power', '1a3727dc-ab9a-4314-abcb-c41d88864d67');
  const energySensorService = new Service.ContactSensor(device.name, '559926fb-1c82-45dd-87ad-27e8f15dd377');

  const services = [accessoryInfoService, outletService];

  type ServiceConstructor = new (displayName?: string, subtype?: string) => Service;

  const accessory = {
    context: {
      device: { [ENERGY_UNIQ_ID]: device },
      identifier: '139827',
    },
    displayName: device.name,
    UUID: '26ab1bba-c216-426f-8bb0-692843834be2',
    category: 1,
    services,
    getService: vi.fn((serviceType) => {
      if (serviceType === Service.AccessoryInformation) {
        return accessoryInfoService;
      }
      if (serviceType === Service.Outlet) {
        return outletService;
      }
      // Guard: only use instanceof when serviceType is a constructor, not a UUID string
      if (typeof serviceType === 'function') {
        return services.find(s => s instanceof (serviceType as any)) ?? undefined;
      }
      return undefined;
    }),
    addService: vi.fn((serviceType: ServiceConstructor | undefined, name: string, subtype: string) => {
      const svc = serviceType ? new serviceType(name ?? '', subtype ?? '') : energySensorService;
      services.push(svc);
      return svc;
    }),
    _accessoryInfoService: accessoryInfoService,
    _outletService: outletService,
  };

  return accessory;
}
