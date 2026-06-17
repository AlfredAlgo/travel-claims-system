# GPG Travel Claims System

Gauteng Provincial Government — Persal Travel & Subsistence Claims System

## Overview

A React-based travel claims management system that automates the GPG Persal Travel & Subsistence claim workflow, replacing the manual Excel form process.

## Roles covered

| Role | Responsibilities |
|---|---|
| **Official** | Complete claim form, attach supporting docs, submit to supervisor |
| **Supervisor** | Review, verify, approve or reject claims |
| **HRS Payroll** | Quality check, capture on Persal (fn 5.3.11), upload mandate to ECM |
| **DMC Payroll Team Leader** | Receive ECM mandate, pay on supplementary, verify on Persal |

## Workflow (as-is process)

```
Official → completes Persal claim form with supporting docs
       ↓
Official → submits to immediate supervisor
       ↓
Supervisor → approves (checks dates, km, destination, purpose, log sheet)
       ↓
HRS Payroll → quality check → captures on Persal → uploads mandate to ECM
       ↓
HRS Payroll → routes mandate to DMC Payroll Team Leader
       ↓
DMC Payroll → pays on supplementary → verifies on Persal
       ↓
Claim successfully paid to the official
```

## Automated features

- **Tariff calculation** — select engine capacity + km bracket, rate auto-fills from DPSA tariff table
- **Persal code auto-population** — correct code (0469 / 0470) applied based on km bracket
- **Advance arithmetic** — fields A, B, C (Outstanding = A − B) calculated automatically
- **Nett amount** = Total claim − Advance outstanding
- **All 11 Persal S&T codes** (04036–04070) with SARS codes
- **Status workflow** — Draft → Pending → Approved → Persal Captured → ECM → Routed → Paid

## Getting started

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000)

## Tech stack

- React 18
- Tabler Icons (webfont)
- IBM Plex Sans + Mono fonts
- No external state management — React useState only
- No backend required (extend with API calls as needed)

## Extending

- **Backend**: Replace `SAMPLE_CLAIMS` in `src/data/constants.js` with API calls
- **Authentication**: Add role-based login to show only relevant queue pages per user
- **Persal integration**: Wire "Capture & ECM" button to actual Persal API
- **ECM upload**: Implement mandate PDF generation and ECM file upload on the capture step
- **Exports**: The Reports page export buttons are ready to be wired to a PDF/CSV generator
