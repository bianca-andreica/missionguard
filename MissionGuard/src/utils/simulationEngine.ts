import { TelemetryPoint, SimulationConfig, FaultScenarioType } from '../types/telemetry';

export interface ScenarioMeta {
  id: FaultScenarioType;
  title: string;
  subsystem: string;
  description: string;
  physicalMechanism: string;
  nominalRecovery: string;
}

export const SCENARIO_CATALOG: Record<FaultScenarioType, ScenarioMeta> = {
  BATTERY_THERMAL_RUNAWAY: {
    id: 'BATTERY_THERMAL_RUNAWAY',
    title: 'Battery Thermal Runaway',
    subsystem: 'TCS / EPS',
    description: 'Post-eclipse heating loop relay fails closed, inducing battery pack overheating.',
    physicalMechanism:
      'Autonomous bi-metallic switch welding or solid-state relay gate rupture maintains full thermal heater dissipation during solar radiation peak.',
    nominalRecovery:
      'Ground commanding to TCS bus isolation breaker; attitude bias slew to present cold radiator surface to deep space sink.',
  },
  SOLAR_ARRAY_DEGRADATION: {
    id: 'SOLAR_ARRAY_DEGRADATION',
    title: 'Solar Array Partial Failure',
    subsystem: 'EPS',
    description: 'Micrometeoroid strike / bypass diode open-circuit cutting solar generation.',
    physicalMechanism:
      'Mechanical impact or electrical surge severs quadrant circuits on +Y array wing, causing sudden step drop in generated daylight wattage.',
    nominalRecovery:
      'SADA drive angle optimization to peak residual string illumination; immediate payload duty cycling to match reduced power budget.',
  },
  COMM_TRANSPONDER_LOSS: {
    id: 'COMM_TRANSPONDER_LOSS',
    title: 'Communication Transponder Degradation',
    subsystem: 'TT&C',
    description: 'RF amplifier thermal throttle or antenna gimbal offset causing signal attenuation.',
    physicalMechanism:
      'Solid-State Power Amplifier (SSPA) driver stage thermal shutdown drops RF transmit power from +33 dBm to near quiescent noise floor.',
    nominalRecovery:
      'Autonomous hardware watchdog transponder swap to redundant B-side receiver; ground station increases dish transmit uplink ERP.',
  },
  REACTION_WHEEL_RUNAWAY: {
    id: 'REACTION_WHEEL_RUNAWAY',
    title: 'Unexpected Spacecraft Tumble (ADCS Runaway)',
    subsystem: 'ADCS',
    description: 'Flywheel bearing friction runaway or tachometer false reading creating net rotational torque.',
    physicalMechanism:
      'Attitude control firmware reacts to corrupted optical gyro rate packet by commanding reaction wheel to maximum speed, inducing body tumble.',
    nominalRecovery:
      'Automatic transition to B-dot magnetic rate damping safehold; magnetorquers fire continuously to arrest spacecraft angular momentum.',
  },
  POWER_BUS_BROWNOUT: {
    id: 'POWER_BUS_BROWNOUT',
    title: 'Regulated Main Bus Brownout',
    subsystem: 'EPS',
    description: 'Transient short on 28V instrument rail pulling down bus line voltage.',
    physicalMechanism:
      'Capacitor dielectric breakdown in scientific payload power converter draws excessive inrush current exceeding bus regulator supply margin.',
    nominalRecovery:
      'Solid-state power distribution switch trips latching current limiter; unessential secondary loads are shed within 50 milliseconds.',
  },
};

/**
 * Injects a fault scenario into the telemetry series and returns modified dataset.
 */
export function injectSimulationScenario(
  baseline: TelemetryPoint[],
  config: SimulationConfig
): TelemetryPoint[] {
  const result: TelemetryPoint[] = [];

  const startMinutes = config.startMetMinutes;
  const durationMinutes = config.durationMinutes;
  const endMinutes = startMinutes + durationMinutes;

  const severityFactor =
    config.severity === 'SEVERE' ? 2.2 : config.severity === 'MODERATE' ? 1.5 : 0.8;

  for (const pt of baseline) {
    const ptMinutes = pt.metSeconds / 60;
    const clone = { ...pt };

    // Check if within injection window
    if (ptMinutes >= startMinutes && ptMinutes <= endMinutes) {
      const windowProgress = (ptMinutes - startMinutes) / durationMinutes;
      // Smooth bell/ramp curve
      const envelope = Math.sin(windowProgress * Math.PI);
      const ramp = Math.min(1, windowProgress * 1.5);

      clone.isInjectedAnomaly = true;
      clone.anomalyTag = `SIM_${config.scenario}_${config.severity}`;

      switch (config.scenario) {
        case 'BATTERY_THERMAL_RUNAWAY': {
          // Temperature increases steeply
          const deltaT = (14.0 + envelope * 18.0) * severityFactor;
          clone.batteryTemp = Math.round((clone.batteryTemp + deltaT) * 10) / 10;
          // Voltage sags slightly under severe thermal stress
          if (config.severity === 'SEVERE') {
            clone.batteryVoltage =
              Math.round((clone.batteryVoltage - envelope * 1.8) * 100) / 100;
          }
          break;
        }

        case 'SOLAR_ARRAY_DEGRADATION': {
          // Daylight solar power drops
          if (clone.orbitalPhase === 'SUNLIGHT' || clone.orbitalPhase === 'PENUMBRA') {
            const lossPercent = (0.35 + ramp * 0.45) * Math.min(1.0, severityFactor * 0.7);
            clone.solarArrayPower =
              Math.max(0, Math.round(clone.solarArrayPower * (1 - lossPercent) * 10) / 10);
            // Battery has to discharge more
            clone.batteryCurrent = Math.round((clone.batteryCurrent - 8.0 * ramp) * 100) / 100;
            clone.batteryVoltage =
              Math.round((clone.batteryVoltage - 1.2 * ramp * severityFactor) * 100) / 100;
          }
          break;
        }

        case 'COMM_TRANSPONDER_LOSS': {
          // RSSI drops severely
          const attenuation = (22.0 + envelope * 24.0) * (severityFactor * 0.8);
          clone.commRssi = Math.round((clone.commRssi - attenuation) * 10) / 10;
          clone.bitErrorRate = Math.min(0.2, clone.bitErrorRate * 1000 * severityFactor);
          break;
        }

        case 'REACTION_WHEEL_RUNAWAY': {
          // Angular rate spikes
          const deltaRate = (0.35 + envelope * 0.75) * severityFactor;
          clone.angularRate = Math.round((clone.angularRate + deltaRate) * 1000) / 1000;
          clone.angularRateX = Math.round((clone.angularRateX + deltaRate * 0.6) * 1000) / 1000;
          clone.angularRateY = Math.round((clone.angularRateY - deltaRate * 0.5) * 1000) / 1000;
          clone.angularRateZ = Math.round((clone.angularRateZ + deltaRate * 0.4) * 1000) / 1000;

          const deltaRpm = (1200 + envelope * 1800) * severityFactor;
          clone.reactionWheelSpeed = Math.round(
            Math.min(5200, clone.reactionWheelSpeed + deltaRpm)
          );
          break;
        }

        case 'POWER_BUS_BROWNOUT': {
          // Regulated bus voltage sags
          const busDrop = (1.2 + envelope * 2.2) * severityFactor;
          clone.busVoltage = Math.round(Math.max(22.0, clone.busVoltage - busDrop) * 100) / 100;
          break;
        }
      }
    }

    result.push(clone);
  }

  return result;
}
