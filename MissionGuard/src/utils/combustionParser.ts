import { CombustionTelemetryPoint } from '../types/combustion';

/**
 * Parses raw NASA PSI-100 SAFFIRE-III engineering-unit CSV text
 * (`PSI-100_Raw Data_Saffire_Data_Table*.csv`).
 *
 * Raw NASA SAFFIRE-III CSV files interleave 1 Hz Saffire payload telemetry rows
 * and asynchronous Cygnus vehicle telemetry rows. Unpopulated fields in an
 * interleaved row carry hardware fill sentinels (e.g. -4002.47 for radiometers,
 * -76.18 for anemometers, -3.05 for igniter currents, or 0 for Cygnus bus fields).
 *
 * This parser cleans hardware fill sentinels to `null` and merges packets occurring
 * within the same 2-second window so Recharts displays continuous, scientifically
 * faithful curves without inventing or extrapolating measurements.
 */
export function parseNasaSaffireCsv(csvText: string): {
  success: boolean;
  points: CombustionTelemetryPoint[];
  rawRowCount: number;
  error?: string;
} {
  try {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) {
      return {
        success: false,
        points: [],
        rawRowCount: 0,
        error: 'CSV file is empty or missing data rows.',
      };
    }

    const headers = lines[0].split(',').map((h) => h.trim());
    const colIndex = (name: string) =>
      headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());

    const idxRelSec = colIndex('RelativeSeconds');
    const idxCygTs = colIndex('CygnusTimestamp');
    const idxSafTs = colIndex('SaffireTimestamp');
    const idxRad1 = colIndex('P@sfsHk.Radiometer1value');
    const idxRad2 = colIndex('P@sfsHk.Radiometer2value');
    const idxRad3 = colIndex('P@sfsHk.Radiometer3value');
    const idxRad4 = colIndex('P@sfsHk.Radiometer4value');
    const idxAnem1 = colIndex('P@sfsHk.Anemometer1');
    const idxAnem2 = colIndex('P@sfsHk.Anemometer2');
    const idxFan = colIndex('P@sfsHk.FanTachometer');
    const idxSmkWireI = colIndex('P@sfsHk.SmokeWireCurrent');
    const idxIgn1V = colIndex('P@sfsHk.Sample1IgniterVoltage');
    const idxIgn1I = colIndex('P@sfsHk.Sample1IgniterCurrent');
    const idxIgn2V = colIndex('P@sfsHk.Sample2IgniterVoltage');
    const idxIgn2I = colIndex('P@sfsHk.Sample2IgniterCurrent');
    const idxTemp = colIndex('P@PCM_ETS_TEMP_SIG');
    const idxPres1 = colIndex('P@F1PCM_AIR_PRES_EPS1_SIG_POS');
    const idxSmkObs2 = colIndex('P@CDH_F2PCM_SMK_DET_OBS_SENS_P');
    const idxSmkScat2 = colIndex('P@CDH_F2PCM_SMK_DET_SCAT_SENS_P');
    const idxEclsFan2 = colIndex('P@CDH_F2PCM_ECLS_FAN_PRESSURE_P');
    const idxImuX = colIndex('P@GNCImuSensor.imu[0].currentMeas_Bdy.acc.elements[0]');
    const idxImuY = colIndex('P@GNCImuSensor.imu[0].currentMeas_Bdy.acc.elements[1]');
    const idxImuZ = colIndex('P@GNCImuSensor.imu[0].currentMeas_Bdy.acc.elements[2]');

    if (idxRelSec === -1 || (idxRad1 === -1 && idxAnem1 === -1)) {
      return {
        success: false,
        points: [],
        rawRowCount: 0,
        error:
          'CSV does not match NASA PSI-100 SAFFIRE-III Data Table schema (missing RelativeSeconds or P@sfsHk sensor columns).',
      };
    }

    const numOrNull = (val: string | undefined, minValid: number): number | null => {
      if (val === undefined || val === '') return null;
      const n = parseFloat(val);
      if (isNaN(n) || n < minValid) return null;
      return Math.round(n * 1000) / 1000;
    };

    // Group into 2-second aligned bins keyed by Math.floor(relativeSeconds / 2) * 2
    const binMap = new Map<number, CombustionTelemetryPoint>();
    let rawCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(',');
      rawCount++;

      const relMs = parseFloat(cols[idxRelSec] || '0');
      if (isNaN(relMs)) continue;
      const relSec = Math.round((relMs / 1000) * 10) / 10;
      const binSec = Math.floor(relSec / 2) * 2;

      const safTs = parseFloat(cols[idxSafTs] || '0') || 0;
      const cygTs = parseFloat(cols[idxCygTs] || '0') || 0;

      // Clean sentinel fill values documented in NASA PSI-100 EU tables
      const rad1 = safTs > 0 ? numOrNull(cols[idxRad1], -100) : null;
      const rad2 = safTs > 0 ? numOrNull(cols[idxRad2], -100) : null;
      const rad3 = safTs > 0 ? numOrNull(cols[idxRad3], -100) : null;
      const rad4 = safTs > 0 ? numOrNull(cols[idxRad4], -100) : null;
      const anem1 = safTs > 0 ? numOrNull(cols[idxAnem1], -10) : null;
      const anem2 = safTs > 0 ? numOrNull(cols[idxAnem2], -10) : null;
      const fan = safTs > 0 ? numOrNull(cols[idxFan], -100) : null;

      // Igniter & smoke wire current sentinels are ~ -3.05 A, voltage sentinels ~ -7.37 V
      const smkWireI = safTs > 0 ? numOrNull(cols[idxSmkWireI], -1.5) : null;
      const ign1V = safTs > 0 ? numOrNull(cols[idxIgn1V], -2.0) : null;
      const ign1I = safTs > 0 ? numOrNull(cols[idxIgn1I], -1.5) : null;
      const ign2V = safTs > 0 ? numOrNull(cols[idxIgn2V], -2.0) : null;
      const ign2I = safTs > 0 ? numOrNull(cols[idxIgn2I], -1.5) : null;

      // Cygnus PCM temperature and pressure are 0 when row is a Saffire-only packet
      const rawTemp = parseFloat(cols[idxTemp] || '0');
      const cabinTemp = !isNaN(rawTemp) && rawTemp > 1 ? Math.round(rawTemp * 100) / 100 : null;

      const rawPres = parseFloat(cols[idxPres1] || '0');
      const cabinPressure1 =
        !isNaN(rawPres) && rawPres > 1 ? Math.round(rawPres * 1000) / 1000 : null;

      const rawSmkObs = parseFloat(cols[idxSmkObs2] || '0');
      const rawSmkScat = parseFloat(cols[idxSmkScat2] || '0');
      const rawEclsFan = parseFloat(cols[idxEclsFan2] || '0');
      const isCygnusPacket =
        cabinTemp !== null ||
        cabinPressure1 !== null ||
        rawSmkObs > 0 ||
        rawSmkScat > 0 ||
        rawEclsFan > 0;

      const smokeObscuration2 = isCygnusPacket ? Math.round(rawSmkObs * 1000) / 1000 : null;
      const smokeScattering2 = isCygnusPacket ? Math.round(rawSmkScat * 1000) / 1000 : null;
      const eclsFanPressure2 =
        !isNaN(rawEclsFan) && rawEclsFan > 1 ? Math.round(rawEclsFan * 100) / 100 : null;

      let imuAccelMag: number | null = null;
      if (idxImuX !== -1 && idxImuY !== -1 && idxImuZ !== -1) {
        const ax = parseFloat(cols[idxImuX] || '0');
        const ay = parseFloat(cols[idxImuY] || '0');
        const az = parseFloat(cols[idxImuZ] || '0');
        if (ax !== 0 || ay !== 0 || az !== 0) {
          imuAccelMag = Math.round(Math.sqrt(ax * ax + ay * ay + az * az) * 1e6) / 1e6;
        }
      }

      const validRads = [rad1, rad2, rad3, rad4].filter((v): v is number => v !== null);
      const radPeak = validRads.length > 0 ? Math.max(...validRads) : null;

      const existing = binMap.get(binSec);
      if (!existing) {
        binMap.set(binSec, {
          id: `saf3-${binSec}`,
          rowIndex: i,
          relativeSeconds: binSec,
          elapsedLabel: `${binSec}s`,
          cygnusTimestampMs: cygTs,
          saffireTimestampMs: safTs,
          radiometer1: rad1,
          radiometer2: rad2,
          radiometer3: rad3,
          radiometer4: rad4,
          radiometerPeak: radPeak,
          anemometer1: anem1,
          anemometer2: anem2,
          fanTachometer: fan,
          smokeWireCurrent: smkWireI,
          sample1IgniterVoltage: ign1V,
          sample1IgniterCurrent: ign1I,
          sample2IgniterVoltage: ign2V,
          sample2IgniterCurrent: ign2I,
          cabinTemp,
          cabinPressure1,
          smokeObscuration2,
          smokeScattering2,
          eclsFanPressure2,
          imuAccelMag,
        });
      } else {
        // Merge non-null measurements into the 2s aligned frame (take max for transient spikes)
        const mergeMax = (a: number | null, b: number | null) =>
          a === null ? b : b === null ? a : Math.max(a, b);
        const mergeLatest = (a: number | null, b: number | null) => (b !== null ? b : a);

        existing.radiometer1 = mergeMax(existing.radiometer1, rad1);
        existing.radiometer2 = mergeMax(existing.radiometer2, rad2);
        existing.radiometer3 = mergeMax(existing.radiometer3, rad3);
        existing.radiometer4 = mergeMax(existing.radiometer4, rad4);
        existing.radiometerPeak = mergeMax(existing.radiometerPeak, radPeak);
        existing.anemometer1 = mergeLatest(existing.anemometer1, anem1);
        existing.anemometer2 = mergeLatest(existing.anemometer2, anem2);
        existing.fanTachometer = mergeLatest(existing.fanTachometer, fan);
        existing.smokeWireCurrent = mergeMax(existing.smokeWireCurrent, smkWireI);
        existing.sample1IgniterVoltage = mergeMax(existing.sample1IgniterVoltage, ign1V);
        existing.sample1IgniterCurrent = mergeMax(existing.sample1IgniterCurrent, ign1I);
        existing.sample2IgniterVoltage = mergeMax(existing.sample2IgniterVoltage, ign2V);
        existing.sample2IgniterCurrent = mergeMax(existing.sample2IgniterCurrent, ign2I);
        existing.cabinTemp = mergeLatest(existing.cabinTemp, cabinTemp);
        existing.cabinPressure1 = mergeLatest(existing.cabinPressure1, cabinPressure1);
        existing.smokeObscuration2 = mergeMax(existing.smokeObscuration2, smokeObscuration2);
        existing.smokeScattering2 = mergeMax(existing.smokeScattering2, smokeScattering2);
        existing.eclsFanPressure2 = mergeLatest(existing.eclsFanPressure2, eclsFanPressure2);
        existing.imuAccelMag = mergeLatest(existing.imuAccelMag, imuAccelMag);
        if (safTs > 0) existing.saffireTimestampMs = safTs;
      }
    }

    const points = Array.from(binMap.values()).sort(
      (a, b) => a.relativeSeconds - b.relativeSeconds
    );

    return {
      success: true,
      points,
      rawRowCount: rawCount,
    };
  } catch (err: any) {
    return {
      success: false,
      points: [],
      rawRowCount: 0,
      error: `Failed to parse NASA SAFFIRE CSV: ${err?.message || String(err)}`,
    };
  }
}

/**
 * Exports aligned NASA SAFFIRE-III combustion telemetry points back to CSV
 */
export function exportCombustionPointsToCSV(points: CombustionTelemetryPoint[]): string {
  const headers = [
    'relativeSeconds',
    'cygnusTimestampMs',
    'saffireTimestampMs',
    'radiometer1',
    'radiometer2',
    'radiometer3',
    'radiometer4',
    'anemometer1_cms',
    'anemometer2_cms',
    'fanTachometer_rpm',
    'sample1IgniterCurrent_A',
    'sample2IgniterCurrent_A',
    'smokeWireCurrent_A',
    'cabinTemp_C',
    'cabinPressure_psia',
    'smokeObscuration2',
    'smokeScattering2',
  ];

  const rows = points.map((p) =>
    [
      p.relativeSeconds,
      p.cygnusTimestampMs,
      p.saffireTimestampMs,
      p.radiometer1 ?? '',
      p.radiometer2 ?? '',
      p.radiometer3 ?? '',
      p.radiometer4 ?? '',
      p.anemometer1 ?? '',
      p.anemometer2 ?? '',
      p.fanTachometer ?? '',
      p.sample1IgniterCurrent ?? '',
      p.sample2IgniterCurrent ?? '',
      p.smokeWireCurrent ?? '',
      p.cabinTemp ?? '',
      p.cabinPressure1 ?? '',
      p.smokeObscuration2 ?? '',
      p.smokeScattering2 ?? '',
    ].join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}
