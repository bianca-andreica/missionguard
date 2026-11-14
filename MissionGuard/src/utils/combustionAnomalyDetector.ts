import { CombustionTelemetryPoint, CombustionAnomaly } from '../types/combustion';

function rollingMeanStd(values: number[]): { mean: number; std: number } {
  if (values.length === 0) return { mean: 0, std: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

/**
 * Scientifically calibrated anomaly & combustion-event detector for NASA PSI-100 SAFFIRE-III
 * microgravity combustion telemetry. Does NOT apply spacecraft EPS/TT&C thresholds.
 *
 * Strictly separates measured NASA sensor facts from AI/engineering hypotheses.
 */
export function detectCombustionAnomalies(
  points: CombustionTelemetryPoint[],
  zScoreCutoff: number = 2.8
): CombustionAnomaly[] {
  if (!points || points.length === 0) return [];
  const raw: CombustionAnomaly[] = [];

  // 1. Detect Igniter & Smoke Wire Activations
  for (const pt of points) {
    if (pt.sample2IgniterCurrent !== null && pt.sample2IgniterCurrent > 0.25) {
      raw.push({
        id: `comb-ign2-${pt.relativeSeconds}`,
        relativeSeconds: pt.relativeSeconds,
        elapsedLabel: pt.elapsedLabel,
        channelKey: 'sample2IgniterCurrent',
        channelName: 'Sample 2 Igniter Current',
        severity: 'INFO',
        method: 'IGNITER_ACTIVATION',
        observedValue: pt.sample2IgniterCurrent,
        baselineContext: 'Nominal quiescent idle < 0.05 A',
        measuredFact: `NASA sensor P@sfsHk.Sample2IgniterCurrent measured ${pt.sample2IgniterCurrent.toFixed(3)} A at t=${pt.relativeSeconds}s.`,
        aiHypotheses: [
          'Hypothesis: Planned hot-wire ignition pulse energized for SAFFIRE-III Sample 2 material burn test.',
        ],
        fireSafetyImplications: [
          'Marks ignition onset window; radiometers and downstream airflow sensors should be monitored for flame propagation.',
        ],
        uncertaintyNote:
          'EU telemetry table alone does not specify sample material thickness or exact igniter wire resistance without consulting the PSI-100 Experimental Details document.',
      });
    }

    if (pt.sample1IgniterCurrent !== null && pt.sample1IgniterCurrent > 0.25) {
      raw.push({
        id: `comb-ign1-${pt.relativeSeconds}`,
        relativeSeconds: pt.relativeSeconds,
        elapsedLabel: pt.elapsedLabel,
        channelKey: 'sample1IgniterCurrent',
        channelName: 'Sample 1 Igniter Current',
        severity: 'INFO',
        method: 'IGNITER_ACTIVATION',
        observedValue: pt.sample1IgniterCurrent,
        baselineContext: 'Nominal quiescent idle < 0.05 A',
        measuredFact: `NASA sensor P@sfsHk.Sample1IgniterCurrent measured ${pt.sample1IgniterCurrent.toFixed(3)} A at t=${pt.relativeSeconds}s.`,
        aiHypotheses: [
          'Hypothesis: Planned hot-wire ignition pulse energized for SAFFIRE-III Sample 1 SIBAL fabric burn test.',
        ],
        fireSafetyImplications: [
          'Critical ignition marker: compare flame spread & radiometer rise latency between Sample 1 and Sample 2.',
        ],
        uncertaintyNote:
          'Ignition energy alone confirms electrical energization; sustained combustion must be verified via Radiometers 1–4.',
      });
    }

    if (pt.smokeWireCurrent !== null && pt.smokeWireCurrent > 0.2) {
      raw.push({
        id: `comb-smkwire-${pt.relativeSeconds}`,
        relativeSeconds: pt.relativeSeconds,
        elapsedLabel: pt.elapsedLabel,
        channelKey: 'smokeWireCurrent',
        channelName: 'Smoke Wire Current',
        severity: 'INFO',
        method: 'IGNITER_ACTIVATION',
        observedValue: pt.smokeWireCurrent,
        baselineContext: 'Quiescent idle < 0.05 A',
        measuredFact: `NASA sensor P@sfsHk.SmokeWireCurrent measured ${pt.smokeWireCurrent.toFixed(3)} A at t=${pt.relativeSeconds}s.`,
        aiHypotheses: [
          'Hypothesis: Flow visualization smoke-wire pulse activated prior to or during duct flow verification.',
        ],
        fireSafetyImplications: [
          'Aerosol release from smoke wire can register on downstream optical smoke scattering detectors.',
        ],
        uncertaintyNote:
          'Correlate smoke-wire timing with Cygnus PCM smoke detector spikes to separate calibration smoke from combustion smoke.',
      });
    }
  }

  // 2. Detect Radiometric Flame Heat-Flux Excursions (Threshold + Rolling Z-Score)
  const radWindow: number[] = [];
  for (const pt of points) {
    if (pt.radiometerPeak === null) continue;

    let zScore: number | undefined;
    if (radWindow.length >= 10) {
      const { mean, std } = rollingMeanStd(radWindow);
      if (std > 0.5) {
        const z = (pt.radiometerPeak - mean) / std;
        if (z >= zScoreCutoff && pt.radiometerPeak > 10) {
          zScore = Math.round(z * 100) / 100;
        }
      }
    }

    if (pt.radiometerPeak >= 40 || zScore !== undefined) {
      const isCrit = pt.radiometerPeak >= 100;
      raw.push({
        id: `comb-rad-${pt.relativeSeconds}`,
        relativeSeconds: pt.relativeSeconds,
        elapsedLabel: pt.elapsedLabel,
        channelKey: 'radiometerPeak',
        channelName: 'Peak Radiometer Heat Flux (R1–R4)',
        severity: isCrit ? 'CRITICAL' : 'WARNING',
        method: 'RADIOMETRIC_EXCURSION',
        observedValue: pt.radiometerPeak,
        baselineContext: 'Pre-ignition radiometer baseline ≈ -18 to 0 EU',
        zScore,
        measuredFact: `Peak Radiometer reading reached ${pt.radiometerPeak.toFixed(2)} EU at t=${pt.relativeSeconds}s (R1=${pt.radiometer1 ?? 'N/A'}, R2=${pt.radiometer2 ?? 'N/A'}, R3=${pt.radiometer3 ?? 'N/A'}, R4=${pt.radiometer4 ?? 'N/A'}).`,
        aiHypotheses: [
          'Hypothesis A: Intense radiative heat emission from active concurrent/opposed-flow microgravity flame front passing radiometer field of view.',
          'Hypothesis B: Forced ~20–30 cm/s airflow increases oxygen transport to the flame zone, elevating flame temperature and soot radiation compared to quiescent 0-g flames.',
        ],
        fireSafetyImplications: [
          'High radiant flux in confined spacecraft modules accelerates thermal pre-heating of adjacent structural cabling and materials.',
          'Demonstrates why ventilation shutdown (stopping forced airflow) is a primary spacecraft fire-suppression countermeasure.',
        ],
        uncertaintyNote:
          'EU values represent engineering-unit calibrated sensor output; absolute kW/m² irradiance conversion and local flame geometry require camera imagery correlation.',
      });
    }

    radWindow.push(pt.radiometerPeak);
    if (radWindow.length > 25) radWindow.shift();
  }

  // 3. Detect Cygnus Cabin Smoke Detector Breakthrough
  for (const pt of points) {
    if (pt.smokeScattering2 !== null && pt.smokeScattering2 >= 0.1) {
      const isCrit = pt.smokeScattering2 >= 1.0;
      raw.push({
        id: `comb-smkscat-${pt.relativeSeconds}`,
        relativeSeconds: pt.relativeSeconds,
        elapsedLabel: pt.elapsedLabel,
        channelKey: 'smokeScattering2',
        channelName: 'Cygnus Cabin Smoke Scattering (F2PCM)',
        severity: isCrit ? 'CRITICAL' : 'WARNING',
        method: 'SMOKE_BREAKTHROUGH',
        observedValue: pt.smokeScattering2,
        baselineContext: 'Clean cabin nominal = 0.000',
        measuredFact: `Cygnus sensor P@CDH_F2PCM_SMK_DET_SCAT_SENS_P measured ${pt.smokeScattering2.toFixed(3)} at t=${pt.relativeSeconds}s.`,
        aiHypotheses: [
          'Hypothesis A: Combustion soot particulates or aerosolized pyrolysis products escaped or exhausted from the Saffire flow duct into the Cygnus Pressurized Cargo Module.',
          'Hypothesis B: Early spikes near t=5675s may correlate with Smoke Wire activation rather than bulk fabric combustion.',
        ],
        fireSafetyImplications: [
          'Validates spacecraft smoke-detector sensitivity to microgravity combustion aerosol size distributions (which often skew larger than terrestrial buoyancy flames).',
          'In crewed habitats, elevated scattering triggers ECLSS fire response and requires post-fire filtration of toxic/particulate species.',
        ],
        uncertaintyNote:
          'Scattering sensor output alone cannot distinguish smoke chemical composition (e.g. CO, HF, soot) without FTIR or gas analyzer data.',
      });
    }
  }

  // 4. Detect Airflow / Anemometer Perturbations during active Saffire operations
  const anemWindow: number[] = [];
  for (const pt of points) {
    if (pt.anemometer1 === null) continue;
    if (anemWindow.length >= 10) {
      const { mean, std } = rollingMeanStd(anemWindow);
      const delta = Math.abs(pt.anemometer1 - mean);
      if (std > 0.2 && delta / std >= zScoreCutoff + 0.5 && delta > 5.0) {
        raw.push({
          id: `comb-anem-${pt.relativeSeconds}`,
          relativeSeconds: pt.relativeSeconds,
          elapsedLabel: pt.elapsedLabel,
          channelKey: 'anemometer1',
          channelName: 'Duct Airflow Velocity (Anemometer 1)',
          severity: 'WARNING',
          method: 'FLOW_PERTURBATION',
          observedValue: pt.anemometer1,
          baselineContext: `Rolling mean ≈ ${mean.toFixed(1)} cm/s`,
          zScore: Math.round((delta / std) * 100) / 100,
          measuredFact: `P@sfsHk.Anemometer1 shifted sharply to ${pt.anemometer1.toFixed(2)} cm/s (rolling mean ${mean.toFixed(2)} cm/s) at t=${pt.relativeSeconds}s.`,
          aiHypotheses: [
            'Hypothesis A: Planned fan speed transition or shutdown sequence altering duct convective flow.',
            'Hypothesis B: Thermal expansion / buoyancy-free flow blockage across burning fabric sample.',
          ],
          fireSafetyImplications: [
            'Low-velocity spacecraft ventilation (10–30 cm/s) strongly governs flame spread rate and extinction boundary in microgravity.',
          ],
          uncertaintyNote:
            'Single-point anemometer velocity does not capture 3D wake turbulence downstream of the sample holder.',
        });
      }
    }
    anemWindow.push(pt.anemometer1);
    if (anemWindow.length > 20) anemWindow.shift();
  }

  // Cluster proximate events per channel within 25 seconds to avoid clutter
  return clusterCombustionEvents(raw);
}

function clusterCombustionEvents(events: CombustionAnomaly[]): CombustionAnomaly[] {
  if (events.length <= 1) return events;
  const sorted = [...events].sort((a, b) => {
    if (a.channelKey !== b.channelKey) return String(a.channelKey).localeCompare(String(b.channelKey));
    return a.relativeSeconds - b.relativeSeconds;
  });

  const clustered: CombustionAnomaly[] = [];
  let group: CombustionAnomaly[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = group[group.length - 1];
    const curr = sorted[i];
    if (
      curr.channelKey === prev.channelKey &&
      curr.relativeSeconds - prev.relativeSeconds <= 25
    ) {
      group.push(curr);
    } else {
      clustered.push(pickPeak(group));
      group = [curr];
    }
  }
  if (group.length > 0) clustered.push(pickPeak(group));

  return clustered.sort((a, b) => a.relativeSeconds - b.relativeSeconds);
}

function pickPeak(group: CombustionAnomaly[]): CombustionAnomaly {
  return group.reduce((best, curr) =>
    curr.observedValue > best.observedValue ? curr : best
  );
}
