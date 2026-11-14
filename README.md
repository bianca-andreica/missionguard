# MissionGuard

### AI-Assisted Spacecraft Telemetry Monitoring & Anomaly Detection

**NASA Space Apps Challenge 2026 — Flame in Freefall**

MissionGuard is a spacecraft telemetry monitoring and anomaly-detection platform designed to help mission operators identify unusual spacecraft behavior, investigate potential subsystem failures, and evaluate hypothetical fault scenarios.

The platform combines simulated Low Earth Orbit (LEO) telemetry, configurable anomaly-detection algorithms, interactive mission monitoring, and an AI-assisted diagnostic system to support spacecraft operations analysis.

> **Project Status:** MissionGuard is a NASA Space Apps Challenge prototype. It uses simulated telemetry and is intended for demonstration and educational purposes, not for real spacecraft operations.

---

## Key Features

- **Mission Operations Dashboard** — Monitor mission health, orbital phases, subsystem status, and active anomaly alerts.
- **Telemetry Explorer** — Explore interactive telemetry charts, statistical summaries, anomaly markers, and uploaded CSV datasets.
- **Anomaly Detection Engine** — Identify unusual behavior using engineering thresholds, rolling Z-score analysis, and rate-of-change detection.
- **Anomaly Center** — Investigate detected incidents, examine telemetry context, and manage anomaly statuses.
- **Scenario Simulator** — Simulate hypothetical spacecraft faults and compare their effects against baseline telemetry.
- **AI Mission Assistant** — Generate telemetry-aware diagnostic explanations and engineering hypotheses using Google Gemini, with a local rule-based fallback.
- **Reports & Data Export** — Export telemetry datasets, anomaly reports, and printable mission briefings.
- **Detection Configuration** — Adjust detection sensitivity, statistical parameters, and engineering thresholds.

---

## Technology Stack

| Component | Technologies |
|:---|:---|
| Frontend | React 19, TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS v4 |
| Backend | Node.js, Express |
| AI Integration | Google Gemini API, Google GenAI SDK |
| Data Visualization | Recharts |
| Icons | Lucide React |

---

## Getting Started

### Prerequisites

Before installing MissionGuard, make sure you have the following:

- **Node.js (LTS version)** – Required to run the application.
- **npm** – Included automatically with Node.js.
- Internet connection for installing dependencies.
- Google Gemini API key (optional).

**Don't have Node.js installed?**

Download it from the official website:

[https://nodejs.org/en/download](https://nodejs.org/en/download)

Choose the **LTS version** and download the installer for your operating system. For Windows, select **Windows Installer (.msi)**.

Follow the installation wizard using the default settings. After installation, restart your terminal and verify that Node.js and npm are available:

```bash
node -v
npm -v
```

**Note for Windows PowerShell users:** If the `npm -v` command fails because PowerShell blocks script execution due to execution policy restrictions, use the following command instead:

```powershell
npm.cmd -v
```

The same workaround applies to other npm commands. For example, use `npm.cmd install` instead of `npm install`.

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/bianca-andreica/missionguard.git
```

**2. Navigate to the application directory**

```bash
cd missionguard/MissionGuard
```

**3. Install dependencies**

```bash
npm install
```
Windows PowerShell users: If the command above fails due to script execution restrictions, use:

```bash
npm.cmd install
```

### Environment Configuration

Gemini integration is optional.

To enable AI-powered diagnostics, create a local `.env` file inside the `MissionGuard/` directory (the same directory as `package.json` and `server.ts`).

Add the following configuration:

```env
GEMINI_API_KEY=your_gemini_api_key
PORT=3000
```

Obtain your API key through [Google AI Studio](https://aistudio.google.com/).

**Security Notice:** Never commit your `.env` file or expose API keys in frontend code or public repositories.

Without a Gemini API key, MissionGuard can still run using its local rule-based assistant.

### Running the Application

Start the development server:

```bash
npm run dev
```

Windows PowerShell users: If the command above fails due to script execution restrictions, use:

```bash
npm.cmd run dev
```

Open the application in your browser:

[http://localhost:3000](http://localhost:3000)

### Production Build

Build the application:

```bash
npm run build
```
Windows PowerShell users: If the command above fails due to script execution restrictions, use:

```bash
npm.cmd run build
```

For additional installation instructions, configuration details, API documentation, and troubleshooting, see the [Technical Documentation](MissionGuard/README.md).

---

## Data & Scientific Scope

MissionGuard uses a deterministic, simulated 24-hour spacecraft telemetry dataset representing a Low Earth Orbit mission.

The prototype demonstrates how spacecraft telemetry can be analyzed using engineering thresholds, statistical anomaly detection, and rate-of-change monitoring.

AI-generated diagnostic explanations are intended as potential engineering hypotheses rather than confirmed root causes.

All telemetry and simulation results should be interpreted within the scope of this prototype.

---

## Project Structure

```text
missionguard/
│
├── README.md
│
└── MissionGuard/
    ├── README.md
    ├── package.json
    ├── bun.lock
    ├── server.ts
    ├── vite.config.ts
    │
    └── src/
        ├── App.tsx
        ├── main.tsx
        ├── components/
        │   ├── anomalies/
        │   ├── assistant/
        │   ├── explorer/
        │   ├── layout/
        │   ├── overview/
        │   ├── reports/
        │   ├── settings/
        │   └── simulator/
        │
        ├── context/
        ├── types/
        └── utils/
```

---

## NASA Space Apps Challenge 2026

**Challenge:** Flame in Freefall

**Project:** MissionGuard

Developed as a collaborative project for the NASA Space Apps Challenge 2026.

