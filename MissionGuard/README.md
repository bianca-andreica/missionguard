# MissionGuard: AI-Assisted Spacecraft Telemetry Monitoring & Anomaly Detection

**NASA Space Apps Challenge 2026 Submission**

**MissionGuard** is an aerospace flight-controller dashboard that monitors spacecraft telemetry in real time, detects subtle operational anomalies using multi-method statistical and physical rules, explains unusual behaviors with quantified scientific uncertainty, and simulates hypothetical spacecraft faults to evaluate contingency preparedness.

---

## Key Features

1. **Mission Operations Overview**
   - **Mission Health Score (0–100%)**: Dynamically calculated from active anomaly severity weights and operator acknowledgments.
   - **Orbital Ephemeris & Phase Tracking**: Monitors Low Earth Orbit (LEO, 92.8 min orbital period, 415 km altitude) daylight vs. eclipse umbra cycles.
   - **Subsystem Health Matrix**: Real-time status for EPS, TCS, ADCS, TT&C, and CDH.
   - **5 Core Telemetry Streams**: Battery Voltage (V), Battery Core Temperature (°C), Solar Array Power (W), Net Angular Rate (deg/s), and Ground Station S-band RSSI (dBm).

2. **Telemetry Explorer**
   - Interactive Recharts time-series visualizations with threshold guidelines and zoomable brush slider.
   - Comprehensive statistical summaries: Latest Value, Rolling Mean ($\mu$), Minimum, Maximum, and Standard Deviation ($\sigma$).
   - Anomaly overlay flags directly positioned at the exact orbital frames where deviations occurred.
   - Observations Data Table with search, pagination, and one-click filtered CSV export.
   - **CSV Upload Modal**: Ingest custom telemetry data with client-side header validation and schema parsing.

3. **Multi-Method Anomaly Detection Engine**
   - **Threshold Detection**: Configurable nominal ranges, yellow warning limits, and redline critical limits.
   - **Rolling Z-Score Outlier Analysis**: Sliding 48-minute orbital window computing $z = |x_i - \mu| / \sigma$ with configurable sigma thresholds (2.0σ to 4.5σ).
   - **Rate-of-Change ($\Delta v / \Delta t$) Derivative Filter**: Catches sudden friction, electrical transients, or thermal runaways before static limits are breached.
   - **Episode Clustering**: Deduplicates contiguous sample spikes into coherent incident episodes.

4. **Anomaly Center & Register**
   - Searchable and filterable by Subsystem, Severity (Critical, Warning, Info), and Status (Active, Acknowledged, Resolved).
   - Detailed inspection drawer with ±16 min telemetry snapshot, prioritized scientific hypotheses, recommended contingency steps, and operator notes.

5. **AI Mission Assistant**
   - Powered by Gemini 3.8 Flash via a secure server-side proxy route (`/api/ai/chat` & `/api/ai/diagnose`).
   - Grounded in live spacecraft telemetry context and detection outputs.
   - **Scientific Honesty**: Formulates hypotheses rather than unproven root causes; explicitly communicates uncertainty levels (Low / Medium / High).
   - **Offline Rule-Based Fallback**: Works seamlessly without any API key or external connection.

6. **Scenario Simulator (Fault Injection Engine)**
   - 5 interactive aerospace fault scenarios:
     1. *Battery Thermal Runaway* (post-eclipse heating relay failure)
     2. *Solar Panel Degradation* (micrometeoroid strike / string diode open-circuit)
     3. *Communication Transponder Loss* (SSPA thermal foldback / antenna offset)
     4. *Unexpected Spacecraft Tumble* (ADCS reaction wheel runaway)
     5. *Regulated Power Bus Brownout* (inrush current transient)
   - Configurable Severity (Mild, Moderate, Severe), injection onset MET, and duration.
   - **Baseline Comparison Overlay**: Visualizes nominal vs. simulated divergence on the same chart.
   - Immediate feedback: Watch the anomaly detection engine react to the injected fault in real time.

7. **Reports & Data Provenance**
   - Download full 24h orbital telemetry CSV.
   - Download sample telemetry template CSV.
   - Download structured Anomaly Incident JSON report.
   - Printable Flight Telemetry Briefing Sheet (`window.print()` formatted for official evaluation).

8. **Engine Settings & Calibration**
   - Preset sensitivity profiles: Conservative, Nominal, Aggressive.
   - Sliders for Z-score threshold and rate multiplier.
   - Toggle individual detection algorithms.
   - Per-metric redline overrides with instant dashboard recalculation.
   - One-click factory reset.

---

## Data & Scientific Honesty

- **Telemetry Provenance**: The 24-hour telemetry dataset is deterministically synthesized using an orbital mechanics model reflecting typical Low Earth Orbit conditions (92.8-minute period, solar incidence angle calculations, eclipse battery discharge curves, thermal dissipation lag, and ground station horizon passes).
- **Injected Baseline Anomalies**: Three realistic baseline anomalies are deliberately placed at MET 08:24 (Battery overheating during eclipse exit), MET 13:40 (ADCS reaction wheel bearing drag), and MET 19:10 (TT&C transponder RF slump during ground contact).
- **Hypothesis Formulation**: The AI assistant and diagnostic engine strictly frame potential causes as hypotheses with quantified uncertainty rather than claiming omniscience.

---

## Architecture & Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React icons, Recharts.
- **Backend**: Express server with Vite middleware integration in development and static asset serving in production.
- **AI Integration**: `@google/genai` TypeScript SDK with server-side proxy routes and zero client-side key leakage.
- **State Management**: React Context (`MissionContext`) with memoized anomaly detection pipelines.

---

## Setup & Running Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment (Optional)**:
   Copy `.env.example` to `.env`:
   ```bash
   # GEMINI_API_KEY is optional! If omitted, the deterministic aerospace rule-based engine operates automatically.
   GEMINI_API_KEY="your-gemini-api-key"
   PORT=3000
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

4. **Build for Production**:
   ```bash
   npm run build
   npm start
   ```

---

## Limitations

- The current implementation models single-satellite operations in Low Earth Orbit; interplanetary deep-space trajectory tracking (e.g. DSN Doppler ranging) is not simulated in this release.
- Uploaded CSVs must contain continuous time-series samples; automated gap reconstruction uses linear interpolation.
