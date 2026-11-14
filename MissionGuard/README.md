# MissionGuard: AI-Assisted Spacecraft Telemetry & Microgravity Fire-Safety Dashboard

**NASA Space Apps Challenge 2026 — *"Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data"***

**MissionGuard** combines real **NASA Physical Sciences Informatics (PSI)** microgravity combustion experimental telemetry with an existing spacecraft telemetry monitoring, anomaly detection, and fault-simulation platform. It enables researchers and flight controllers to inspect real NASA SAFFIRE-III burn telemetry, detect combustion-specific excursions, separate measured observations from AI-generated hypotheses, and evaluate spacecraft fire-safety implications.

---

## Verified NASA Microgravity Combustion Resources Integrated

### 1. Primary Integrated Dataset (Live CSV + Active Telemetry Window)
- **Official Name:** NASA Physical Sciences Informatics (PSI) — Investigation **PSI-100: Spacecraft Fire Experiment-III (`SAFFIRE-III`)**
- **Portal URL:** https://psi.nasa.gov/physci/repo/data/investigations/PSI-100
- **Metadata API URL:** https://psi.nasa.gov/geode-py/ws/repo/investigations/PSI-100
- **Official EU Telemetry CSV URL:** `https://psi.nasa.gov/geode-py/ws/studies/PSI-100/download?file=PSI-100_Raw%20Data_Saffire_Data_Table2017.161.00.42.03-EU.csv`
- **DOI & License:** `10.60555/040q-4h36` · `CC0-1.0` (Public Domain)
- **Principal Investigator & Center:** Dr. David L. Urban · NASA Glenn Research Center (GRC) · Saffire III enclosure aboard Cygnus OA-7
- **Integrated Measurements (Active Burn Window `5525s–6900s`, 3,300 raw rows aligned to 2-second frames):**
  - `P@sfsHk.Radiometer1value..4value`: Flame radiative heat flux (EU counts)
  - `P@sfsHk.Anemometer1`, `P@sfsHk.Anemometer2`: Forced duct airflow velocity (cm/s)
  - `P@sfsHk.FanTachometer`: Saffire duct fan speed (RPM)
  - `P@sfsHk.Sample1IgniterCurrent`, `P@sfsHk.Sample2IgniterCurrent`, `P@sfsHk.SmokeWireCurrent`: Hot-wire ignition & smoke-wire current pulses (A)
  - `P@PCM_ETS_TEMP_SIG`, `P@F1PCM_AIR_PRES_EPS1_SIG_POS`: Cygnus module temperature (°C) & cabin pressure (psia)
  - `P@CDH_F2PCM_SMK_DET_SCAT_SENS_P`, `P@CDH_F2PCM_SMK_DET_OBS_SENS_P`: Cygnus F2PCM optical smoke scattering & obscuration detectors

### 2. Additional Verified NASA PSI Combustion Metadata Cataloged
- **PSI-98 (`SAFFIRE-I`)** — *Spacecraft Fire Safety Experiment-I* (`10.60555/0t15-1z43`): https://psi.nasa.gov/physci/repo/data/investigations/PSI-98
- **PSI-25 (`BASS-II`)** — *Burning and Suppression of Solids - II* (`10.60555/4qc4-de67`): https://psi.nasa.gov/physci/repo/data/investigations/PSI-25
- **PSI-10 (`ACME/Flame Design`)** — *Advanced Combustion via Microgravity Experiments* (`10.60555/w4zy-bt45`): https://psi.nasa.gov/physci/repo/data/investigations/PSI-10
- **PSI-159 (`ACME CFI-G`)** — *Coflow Laminar Diffusion Flames*: https://psi.nasa.gov/physci/repo/data/investigations/PSI-159

---

## Key Features

1. **NASA Combustion Data (`PSI-100` / `SAFFIRE-III`)**
   - Dedicated view with real NASA radiometric heat flux, igniter pulse timing, forced duct airflow (`Anemometer1/2`, `FanTachometer`), and Cygnus cabin smoke breakthrough (`F2PCM` scattering/obscuration & cabin temperature/pressure).
   - **Sentinel Cleaning & Asynchronous Packet Alignment**: Hardware fill codes (`-4002.47`, `-76.18`, `-3.05`, and unpopulated `0` bus fields on Saffire-only packets) are converted to `null` and merged into 2-second aligned bins without fabricating missing readings.
   - **Live NASA PSI Sync + Custom CSV Import/Export**: Fetch fresh streams via `/api/nasa/psi/saffire3` and `/api/nasa/psi/catalog`, import official NASA PSI CSV files locally, or export aligned telemetry and findings.
   - **Combustion-Specific Event Detector**: Identifies igniter activations, radiometric heat-flux excursions (threshold + rolling Z-score), Cygnus smoke detector breakthroughs, and duct airflow perturbations—never applying spacecraft battery or RF thresholds to combustion channels.

2. **Mission Operations Overview (Synthetic Spacecraft Demo)**
   - **Mission Health Score (0–100%)**, LEO orbital phase tracking (92.8 min period), subsystem health matrix, and 5 core spacecraft telemetry charts.

3. **Telemetry Explorer**
   - Interactive Recharts time-series visualizations, statistical summaries ($\mu$, min, max, $\sigma$), anomaly overlays, searchable data table, and CSV upload/export.

4. **Anomaly Center & Multi-Method Detection Engine**
   - Threshold redlines, rolling Z-score analysis, and rate-of-change ($\Delta v / \Delta t$) filtering with operator acknowledgment and resolution notes.

5. **AI Mission & Fire-Safety Assistant**
   - Powered by Gemini 3.8 Flash via secure server-side proxy routes (`/api/ai/chat`, `/api/ai/diagnose`, `/api/ai/diagnose-combustion`) with a deterministic rule-based fallback when no API key is configured.
   - Grounded in both real NASA PSI-100 combustion telemetry and synthetic AURA-SAT-4 spacecraft telemetry while keeping their physical domains strictly separated.

6. **Scenario Simulator, Reports & Settings**
   - Interactive spacecraft fault injection (`Battery Thermal Runaway`, `Solar Panel Degradation`, `Transponder Loss`, `Spacecraft Tumble`, `Bus Brownout`), printable flight & fire-safety briefings, JSON/CSV exports, and calibratable detector sensitivity.

---

## Strict Provenance Separation & Scientific Honesty

MissionGuard explicitly separates three categories across the UI, exports, and AI outputs:
1. **Real NASA Experimental Data:** Directly parsed from NASA PSI-100 (`SAFFIRE-III`) engineering-unit telemetry (`psi.nasa.gov`).
2. **Synthetic Demonstration Data:** Deterministically generated 24-hour LEO telemetry for `AURA-SAT-4` used solely to demonstrate spacecraft orbital fault monitoring.
3. **AI-Generated Interpretations:** All root-cause hypotheses and fire-safety recommendations are labeled as working hypotheses alongside uncertainty and sensor limitations rather than confirmed conclusions.

---

## Architecture & Technology Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide React icons, Recharts.
- **Backend:** Express server (`server.ts`) with Vite middleware in development, NASA PSI proxy routes (`/api/nasa/psi/*`), and server-side `@google/genai` proxy routes.
- **State Management:** React Context (`MissionContext`) with memoized detection pipelines for both combustion and spacecraft telemetry.

---

## Setup & Running Locally

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment (Optional):**
   Copy `.env.example` to `.env`:
   ```bash
   # GEMINI_API_KEY is optional; the deterministic rule-based engine works automatically offline.
   GEMINI_API_KEY="your-gemini-api-key"
   PORT=3000
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

4. **Build for Production:**
   ```bash
   npm run build
   npm start
   ```

---

## Limitations

- The bundled `PSI-100_Saffire3_ActiveWindow.csv` extract covers the active burn window (`5525s–6900s`) of the `PSI-100` engineering-unit data table for fast browser loading; full tables or other PSI CSVs can be loaded live via **Fetch Live NASA PSI** or **Import NASA CSV**.
- The EU telemetry table used here records radiometers (EU counts), anemometers, fan RPM, igniter currents, and Cygnus vehicle smoke/environmental sensors, but does not include O₂/CO₂ gas species mole fractions or high-speed flame imagery (which are archived in separate PSI-100 files).
- The `AURA-SAT-4` spacecraft tabs use deterministic synthetic LEO telemetry and should not be interpreted as live NASA spacecraft telemetry.

---

## Acknowledgments

- **NASA Physical Sciences Informatics (PSI):** Dataset `PSI-100` (`SAFFIRE-III`), `PSI-98`, `PSI-25`, `PSI-10`, and `PSI-159` provided by NASA Glenn Research Center and the PSI data repository (`https://psi.nasa.gov/`).
- **AI Development Assistance:** Portions of the application architecture, TypeScript data-parsing utilities, and UI components were developed with assistance from Google AI Studio and Gemini.

