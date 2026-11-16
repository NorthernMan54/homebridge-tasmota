import createDebug from 'debug';
import { CharacteristicSetCallback, CharacteristicValue, PlatformAccessory } from 'homebridge';
import { TasmotaService } from './TasmotaService.js';
import { tasmotaPlatform } from './tasmotaPlatform.js';

const debug = createDebug('Tasmota:climate');

// Delay before sending a setpoint command, so rapid HomeKit slider changes
// produce one radio command rather than many
const COMMAND_DEBOUNCE_MS = 500;

// Tolerance (°C) below the setpoint before the thermostat shows heating, so readings
// near the setpoint don't flip it between heating and idle
const HEATING_BAND = 0.2;

/**
 * Home Assistant climate discovery fields used by this service
 * homeassistant/climate/<uniq_id>/config
 */
interface ClimateConfig {
  name: string;
  temp_cmd_t?: string;
  temp_cmd_tpl?: string;
  temp_stat_t?: string;
  temp_stat_tpl?: string;
  curr_temp_t?: string;
  curr_temp_tpl?: string;
  min_temp?: number;
  max_temp?: number;
  temp_step?: number;
  act_t?: string; // action_topic: what the device is doing (heating, idle, off ...)
  act_tpl?: string;
}

/**
 * Thermostat service for a single climate zone (e.g. OMG Connex heater zone).
 * Heat only: target state is always HEAT; current state comes from act_t, or is estimated from the temperatures.
 */
export class tasmotaClimateService extends TasmotaService {
  private readonly config: ClimateConfig;
  private commandTimer?: ReturnType<typeof setTimeout>;
  private pendingTemperature?: number;

  constructor(
    public readonly platform: tasmotaPlatform,
    public readonly accessory: PlatformAccessory,
    protected readonly uniq_id: string,
  ) {
    super(platform, accessory, uniq_id);

    this.config = accessory.context.device[this.uniq_id] as ClimateConfig;

    const service = this.accessory.getService(this.uuid)
      || this.accessory.addService(this.platform.Service.Thermostat, this.config.name, this.uuid);
    this.service = service;
    // The thermostat is the accessory's main tile; with several zones, only the first is primary
    if (!this.accessory.services.some(s => s.isPrimaryService && s !== service)) {
      this.service.setPrimaryService(true);
    }
    this.service.setCharacteristic(this.platform.Characteristic.ConfiguredName, this.config.name);
    if (!this.service.displayName) {
      this.service.setCharacteristic(this.platform.Characteristic.Name, this.config.name);
    }

    const heat = this.platform.Characteristic.TargetHeatingCoolingState.HEAT;

    this.service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .updateValue(heat)
      .setProps({ validValues: [heat] });
    // From the device's action topic when it has one, otherwise estimated from the temperatures
    const off = this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
    this.service.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState)
      .setProps({ validValues: [off, heat] })
      .updateValue(off);
    this.service.getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
      .updateValue(this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS);

    const targetTemperature = this.service.getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .setProps({
        minValue: this.config.min_temp ?? 0,
        maxValue: this.config.max_temp ?? 30,
        minStep: this.config.temp_step ?? 0.5,
      });

    if (targetTemperature.listenerCount('set') < 1) {
      this.characteristic = targetTemperature.on('set', this.setTargetTemperature.bind(this));
      this.subscribeStatus();
      this.enableStatus();
    }
  }

  private subscribeStatus() {
    if (this.config.act_t) {
      this.platform.log.debug('Creating action listener for %s %s', this.config.act_t, this.config.name);
      this.platform.mqttHost.on(this.config.act_t, this.actionUpdate.bind(this));
      this.platform.mqttHost.statusSubscribe(this.config.act_t);
    }
    if (this.config.temp_stat_t) {
      this.platform.log.debug('Creating setpoint listener for %s %s', this.config.temp_stat_t, this.config.name);
      this.platform.mqttHost.on(this.config.temp_stat_t, this.statusUpdate.bind(this));
      this.platform.mqttHost.statusSubscribe(this.config.temp_stat_t);
    }
    if (this.config.curr_temp_t) {
      this.platform.log.debug('Creating current temperature listener for %s %s', this.config.curr_temp_t, this.config.name);
      this.platform.mqttHost.on(this.config.curr_temp_t, this.currentTemperatureUpdate.bind(this));
      this.platform.mqttHost.statusSubscribe(this.config.curr_temp_t);
    }
  }

  /**
   * Setpoint status from temp_stat_t. Overrides the base statusUpdate.
   * Mirrors the setpoint into CurrentTemperature when no curr_temp_t is configured.
   */
  statusUpdate(topic: string, message: Buffer) {
    debug('setpoint statusUpdate for "%s" on topic "%s" ->', this.config.name, topic, message.toString());

    this.accessory.context.timeout = this.platform.autoCleanup(this.accessory);

    try {
      const setpoint = this.parseReading(this.config.temp_stat_tpl, message);
      if (setpoint === undefined) {
        debug('Ignoring setpoint for %s: %s', this.config.name, message.toString());
        return;
      }
      const prevSetpoint = this.service?.getCharacteristic(this.platform.Characteristic.TargetTemperature).value;
      this.platform.log[prevSetpoint !== setpoint ? 'info' : 'debug']('Updating \'%s:TargetTemperature\' to %s', this.service?.displayName, setpoint);
      this.service?.getCharacteristic(this.platform.Characteristic.TargetTemperature).updateValue(setpoint);
      if (!this.config.curr_temp_t) {
        this.service?.getCharacteristic(this.platform.Characteristic.CurrentTemperature).updateValue(setpoint);
      }
      this.updateHeatingState();
    } catch (err: unknown) {
      this.platform.log.error('ERROR: Message Parse Error', topic, message.toString());
      this.platform.log.debug(String((err && (err as Error).message ? (err as Error).message : err)));
    }
  }

  /**
   * Measured temperature from curr_temp_t (BME280 and similar).
   */
  currentTemperatureUpdate(topic: string, message: Buffer) {
    debug('current temperature update for "%s" on topic "%s" ->', this.config.name, topic, message.toString());

    this.accessory.context.timeout = this.platform.autoCleanup(this.accessory);

    try {
      const current = this.parseReading(this.config.curr_temp_tpl, message);
      if (current === undefined) {
        debug('Ignoring current temperature for %s: %s', this.config.name, message.toString());
        return;
      }
      const prevCurrent = this.service?.getCharacteristic(this.platform.Characteristic.CurrentTemperature).value;
      this.platform.log[prevCurrent !== current ? 'info' : 'debug']('Updating \'%s:CurrentTemperature\' to %s', this.service?.displayName, current);
      this.service?.getCharacteristic(this.platform.Characteristic.CurrentTemperature).updateValue(current);
      this.updateHeatingState();
    } catch (err: unknown) {
      this.platform.log.error('ERROR: Message Parse Error', topic, message.toString());
      this.platform.log.debug(String((err && (err as Error).message ? (err as Error).message : err)));
    }
  }

  /**
   * CurrentHeatingCoolingState: HEAT once the current temperature drops below target - HEATING_BAND, OFF once it reaches the target.
   * The heaters never report their state, so this is an estimate from the room sensor.
   */
  private updateHeatingState() {
    if (this.config.act_t) {
      return; // the device reports its own state on act_t
    }
    const C = this.platform.Characteristic;
    const current = Number(this.service?.getCharacteristic(C.CurrentTemperature).value);
    const target = Number(this.service?.getCharacteristic(C.TargetTemperature).value);
    const previous = this.service?.getCharacteristic(C.CurrentHeatingCoolingState).value;
    // Hysteresis: start heating below target - band, stop at target, keep the last state in between
    let state = previous;
    if (current < target - HEATING_BAND) {
      state = C.CurrentHeatingCoolingState.HEAT;
    } else if (current >= target) {
      state = C.CurrentHeatingCoolingState.OFF;
    }
    if (previous !== state) {
      debug('%s heating state -> %s (current %s, target %s)', this.config.name, state ? 'HEAT' : 'OFF', current, target);
      this.service?.getCharacteristic(C.CurrentHeatingCoolingState).updateValue(state);
    }
  }

  /**
   * Device-reported action from act_t (HA climate action: heating, preheating, idle, off ...).
   * Heating and preheating show as HEAT, everything else as OFF (idle).
   */
  actionUpdate(topic: string, message: Buffer) {
    debug('action update for "%s" on topic "%s" ->', this.config.name, topic, message.toString());
    try {
      const action = (this.config.act_tpl ? this.parseValue(this.config.act_tpl, message.toString()) : message.toString())
        .trim().toLowerCase();
      if (action === '' || action === 'none') {
        return;
      }
      const C = this.platform.Characteristic;
      const state = ['heating', 'preheating'].includes(action) ? C.CurrentHeatingCoolingState.HEAT : C.CurrentHeatingCoolingState.OFF;
      this.service?.getCharacteristic(C.CurrentHeatingCoolingState).updateValue(state);
    } catch (err: unknown) {
      this.platform.log.error('ERROR: Message Parse Error', topic, message.toString());
      this.platform.log.debug(String((err && (err as Error).message ? (err as Error).message : err)));
    }
  }

  /**
   * Parse a numeric reading. Returns undefined for empty, 'None' or NaN results.
   */
  private parseReading(template: string | undefined, message: Buffer): number | undefined {
    const text = (template ? this.parseValue(template, message.toString()) : message.toString()).trim();
    if (text === '' || text === 'None') {
      return undefined;
    }
    const value = Number(text);
    return Number.isNaN(value) ? undefined : value;
  }

  /**
   * HomeKit set for TargetTemperature. Debounced, then sent once to temp_cmd_t (not retained).
   */
  setTargetTemperature(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.platform.log.info('%s Set Characteristic TargetTemperature ->', this.accessory.displayName, value);
    this.pendingTemperature = Number(value);

    if (this.commandTimer) {
      clearTimeout(this.commandTimer);
    }
    this.commandTimer = setTimeout(() => {
      this.commandTimer = undefined;
      this.publishTemperature();
    }, COMMAND_DEBOUNCE_MS);

    callback(null);
  }

  private publishTemperature() {
    const topic = this.config.temp_cmd_t;
    if (!topic || this.pendingTemperature === undefined) {
      this.platform.log.warn('Warning: no temperature command for %s', this.config.name);
      return;
    }
    const payload = this.config.temp_cmd_tpl
      ? this.nunjucksEnvironment.renderString(this.config.temp_cmd_tpl, { value: this.pendingTemperature })
      : String(this.pendingTemperature);
    this.platform.mqttHost.sendMessage(topic, payload);
  }
}
