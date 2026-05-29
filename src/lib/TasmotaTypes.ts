/**
 * Represents the device block nested inside a Tasmota HASS discovery message.
 * Only present on messages that carry full device metadata (e.g. the `_status` topic).
 */
export interface TasmotaDeviceInfo {
  /** Device identifiers — ids[0] is the unique accessory identifier */
  ids: string[];
  /** Human-readable device name */
  name?: string;
  /** Device model */
  mdl?: string;
  /** Firmware / software version, e.g. "9.5.0(tasmota)" */
  sw?: string;
  /** Manufacturer name */
  mf?: string;
}

/**
 * A single normalised Tasmota HASS-compatible discovery message.
 * Fields use the HASS short-form names as sent over MQTT.
 * All fields except the core identity ones are optional because different
 * device types only populate a subset.
 */
export interface TasmotaDiscoveryMessage {
  // ── Identity ────────────────────────────────────────────────────────────────
  /** Human-readable service/entity name, e.g. "Dryer Power" */
  name?: string;
  /** Unique entity identifier, e.g. "130C86_RL_1" */
  uniq_id?: string;
  /** Device information block (may be minimal on non-status topics) */
  dev?: TasmotaDeviceInfo;

  // ── Plugin-injected type ────────────────────────────────────────────────────
  /** Tasmota service type injected by the MQTT handler, e.g. "switch", "light", "sensor" */
  tasmotaType?: string;

  // ── MQTT topics ─────────────────────────────────────────────────────────────
  /** State topic */
  stat_t?: string;
  /** Availability topic */
  avty_t?: string;
  /** Command topic */
  cmd_t?: string;
  /** Brightness command topic */
  bri_cmd_t?: string;
  /** Brightness state topic */
  bri_stat_t?: string;
  /** RGB command topic */
  rgb_cmd_t?: string;
  /** RGB state topic */
  rgb_stat_t?: string;
  /** Hue/Saturation command topic */
  hs_cmd_t?: string;
  /** Hue/Saturation state topic */
  hs_stat_t?: string;
  /** Colour temperature command topic */
  clr_temp_cmd_t?: string;
  /** Effects/scene command topic */
  fx_cmd_t?: string;
  /** JSON attributes topic */
  json_attr_t?: string;

  // ── Payloads ─────────────────────────────────────────────────────────────────
  /** Payload that represents the ON state */
  pl_on?: string | boolean;
  /** Payload that represents the OFF state */
  pl_off?: string | boolean;
  /** Payload meaning "available" */
  pl_avail?: string;
  /** Payload meaning "not available" */
  pl_not_avail?: string;
  /** High-speed fan payload */
  pl_hi_spd?: string;
  /** Medium-speed fan payload */
  pl_med_spd?: string;
  /** Low-speed fan payload */
  pl_lo_spd?: string;

  // ── Value templates ──────────────────────────────────────────────────────────
  /** Jinja2 value template for the state */
  val_tpl?: string;
  /** Jinja2 value template for the state (light on/off, distinct from brightness) */
  stat_val_tpl?: string;
  /** Jinja2 value template for brightness */
  bri_val_tpl?: string;
  /** Jinja2 value template for RGB */
  rgb_val_tpl?: string;
  /** Jinja2 value template for hue/saturation */
  hs_val_tpl?: string;

  // ── Sensor metadata ──────────────────────────────────────────────────────────
  /** HASS device class, e.g. "temperature", "humidity", "power", "doorbell" */
  dev_cla?: string;
  /** Unit of measurement, e.g. "°C", "W", "kWh" */
  unit_of_meas?: string;
  /** Material Design icon override */
  ic?: string;
  /** Force update flag */
  frc_upd?: boolean;

  // ── Light-specific ───────────────────────────────────────────────────────────
  /** Brightness scale (e.g. 100 for percentage) */
  bri_scl?: number;
  /** How the ON command is sent when using brightness ("brightness" | "last") */
  on_cmd_type?: string;
  /** Available fan speeds array */
  spds?: string[];

  // ── Allow extra fields added by normalizeMessage or discoveryOverride ────────
  [key: string]: unknown;
}
