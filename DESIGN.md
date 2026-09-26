# HPD Calculator — Design Document

**Version:** Phase 1 draft  
**Standard:** CSA Z94.2-14 / CSA Z94.2:18  
**Audience:** Workers, supervisors, and safety professionals in Canada

---

## 1. Purpose

A free, static web tool that helps any worker or safety professional determine whether a hearing protector (HPD) provides adequate protection for a given noise exposure, using the CSA Z94.2 class/grade methodology and Canadian derating formulas.

The tool runs entirely in the browser — no account, no API, no internet connection required after first load.

---

## 2. Who Uses This

| User | What they need |
|------|---------------|
| Worker | Quick answer: is my earplug good enough for my job? |
| Supervisor | Class/grade recommendation for a work area |
| Safety officer | Documented screening estimate for a hearing conservation file |
| Audiometric technician (Norm) | Verify HPD adequacy before a fit test; generate a printed summary |

---

## 3. User Flow

```
[Jurisdiction] → [Noise Exposure] → [Hearing Protector] → [Result]
                      ↑
              two entry paths:
              (A) enter a measured Lex/Leq value
              (B) build exposure from tasks
```

The user can move backward at any step. Completing Step 3 triggers the calculation. The result page has a print/save action.

---

## 4. Screens

### 4.1 App Header (always visible)

- App name: "HPD Adequacy Calculator"
- Subtitle: "CSA Z94.2 — Canadian Standard"
- Small disclaimer chip: "Screening estimates only — not a substitute for measurement"
- No navigation menu (single-flow tool)

---

### 4.2 Step 1 — Jurisdiction

**Purpose:** Select the province, territory, or federal jurisdiction so the correct regulatory limit is applied.

**Elements:**
- Heading: "Which province or jurisdiction?"
- Dropdown or scrollable list with all 10 provinces, 3 territories, and "Federal (Canada Labour Code)"
- Default: British Columbia
- Helper text: "Federal jurisdiction covers aviation, rail, and telecommunications workers."
- "Next" button (always active — a jurisdiction is always pre-selected)

**Rules applied by jurisdiction:**
- All provinces & territories: 85 dBA limit, 3 dB exchange rate
- Federal: 87 dBA limit, 3 dB exchange rate
- Peak limit for all: 140 dB (C-weighted) — shown as info, not user input

---

### 4.3 Step 2 — Noise Exposure

**Purpose:** Establish the worker's daily noise exposure (Lex,8h).

Two entry paths side by side as cards:

#### Path A — Measured Value (recommended, shown first / highlighted)

Label: **"I have a measured value"**  
Badge: **RECOMMENDED** (measured data beats estimates)

Elements:
- Number input: "Enter Lex or Leq (dBA or dBC)"
- Weighting toggle: **dBA** | **dBC**
  - Helper text when dBC selected: "A +3 dB correction will be removed since dBC values don't need it."
- If Leq (not yet 8-hr normalized), show: "Is this already normalized to an 8-hour day?" Yes/No. If No, show duration input and normalize automatically.
- Disclaimer note: "In BC, noise measurement is required where workers may be exposed above 82 dBA Lex."

Validation:
- Must be a number between 50 and 140
- Non-numeric input → friendly error: "Please enter a number, such as 95."
- Out of range → "That value seems outside a typical workplace range. Please double-check."

#### Path B — Build from Tasks

Label: **"I don't have a measurement — build from tasks"**  
Note: shown with a softer style to nudge users toward Path A

Elements:
- Search box: "Search for a job, trade, or task…"
  - Fuzzy search over task labels and aliases in data/noise-exposures.json
  - Results show: task name | industry | typical dBA | source
  - "Source level" entries are flagged clearly: "This is a sound source level, not an 8-hour exposure — enter time carefully."
- Task list (grows as user adds):
  - Each row: task name | hours input | dBA used | contribution bar
  - Hours validation: numeric, 0.1–12, sum ≤ 24 h
- Running Lex display (updates live): "Estimated Lex,8h: XX.X dBA"
- Formula disclosure (collapsed by default): shows the Lex formula used
- Weighting toggle: **dBA** | **dBC** (same as Path A)

At least one task with valid hours is required to proceed.

---

### 4.4 Step 3 — Hearing Protector

**Purpose:** Identify the HPD and compute the estimated protected level.

**Elements:**

**HPD search** (primary path):
- Search box: "Search by brand or model name…"
  - Fuzzy search over data/hpd-products.json (make, model, aliases)
  - Results show: brand | model | type | NRR
  - Selecting a result auto-fills the NRR and type fields
- "Don't see your HPD?" → link to manual entry

**Manual entry** (secondary path):
- Rating type selector: **NRR** | **SLC80** | **CSA Class/Grade**
- Number input: rating value
- Note: If Class/Grade is selected, the user also enters the NRR (since the class alone doesn't give enough precision for the formula).

**HPD type selector** (earplug / earmuff / dual):
- Required. If HPD was selected from search, pre-filled.
- Dual → second HPD search/entry appears for the secondary device.
- Dual note: "Dual protection is required when no single device can bring exposure below the limit."

**Derating note** (always visible):
> "The app applies the CSA Z94.2 derating formula: 50% for earplugs, 70% for earmuffs, 65% of the higher NRR+5 for dual. This is a Canadian regulatory requirement."

---

### 4.5 Step 4 — Result

**Purpose:** Deliver the verdict clearly, with enough detail for a file note.

**Top section — verdict:**
- Large number: estimated protected level at the ear (e.g., "79.5 dBA")
- Colour-coded verdict badge:
  - Green — **ADEQUATE** — "This HPD provides sufficient protection."
  - Yellow — **OVER-PROTECTED** — "Protection is too high. Worker may have trouble hearing safety signals or communicating. Consider a lower-attenuation device."
  - Red — **UNDER-PROTECTED** — "This HPD does not provide sufficient protection. Select a higher-rated device."
- Dual protection flag (if applicable): "Dual protection is required for this exposure level."

**Middle section — recommendation:**
- "For an exposure of XX dBA, the minimum required HPD is: Class X / Grade Y"
- Shows the full class/grade table for reference (collapsed by default)

**Bottom section — calculation breakdown:**
- Noise exposure: XX dBA (measured / estimated from tasks)
- Weighting correction applied: +3 dB (if dBA) or none (if dBC)
- HPD: brand/model (or "manual entry") — NRR XX — type
- Derating applied: 50% / 70% / 65%
- Estimated protected level: XX dBA
- Regulatory limit: 85 dBA (or 87 dBA for Federal)

**Disclaimer block** (always visible, cannot be dismissed):
> "Results are screening estimates only and do not replace noise measurement or a formal noise assessment. In BC, noise measurement is required where a worker may be exposed above 82 dBA Lex. Consult a qualified occupational hygienist or audiometric technician for compliance decisions."

**Actions:**
- "Print / Save as PDF" — triggers browser print dialog on a clean one-page summary
- "Start over" — resets all fields and returns to Step 1

---

### 4.6 Print Summary (print-only layout)

Triggered by the print button. Uses CSS `@media print` to show a single formatted page:

- App name, date, jurisdiction
- Noise exposure (source, value, weighting)
- HPD details (name/NRR/type)
- Derating formula shown explicitly
- Protected level + verdict
- CSA class/grade recommendation
- Full disclaimer text
- "Generated by HPD Adequacy Calculator — hpd-calc — free and open source"

---

### 4.7 About Page

Accessible from a link in the footer. Contains:
- What this tool is and what it is not
- CSA Z94.2 methodology overview
- Derating formulas with attribution
- Link to 3M Noise Navigator spreadsheet (further reference, not reproduced here)
- Link to WorkSafeBC "How loud is it?" bulletins
- CCOHS noise exposure limits guide
- License: code is MIT, data is CC BY 4.0
- How to contribute noise data (link to CONTRIBUTING.md)
- GitHub repo link

---

## 5. Data Sources

| File | Contents |
|------|---------|
| `data/rules.json` | Regulatory limits, exchange rates, class/grade bands, derating factors, target range, by jurisdiction |
| `data/noise-exposures.json` | Task/occupation noise levels, seeded from WorkSafeBC bulletins |
| `data/hpd-products.json` | Common North American HPDs with make, model, NRR, type |

---

## 6. Calculation Rules (summary — full detail in data/rules.json)

**Lex from tasks:**
```
Lex = 10 · log10( Σ (ti / 8) · 10^(Li/10) )
```
where ti = hours for task i, Li = dBA level for task i.

**Protected level at ear:**
```
Earplug:  Lprot = Lex + 3 − (NRR × 0.50)   [+3 only if dBA-weighted]
Earmuff:  Lprot = Lex + 3 − (NRR × 0.70)
Dual:     Lprot = Lex + 3 − ((NRR_higher + 5) × 0.65)
```

**Adequacy thresholds:**
- Under-protected: Lprot > 85 dBA (exceeds limit)
- Adequate: 75 dBA ≤ Lprot ≤ 85 dBA
- Over-protected: Lprot < 75 dBA

**Dual protection trigger:**
Required when single-device Lprot > 85 dBA (HPD alone is insufficient).

**TODO_NORM:** SLC80 formula — no derating formula confirmed for SLC80 yet. Will be stubbed in `rules.json` until confirmed.

---

## 7. Validation and Error States

| Input | Bad state | User-facing message |
|-------|-----------|-------------------|
| Lex/Leq field | Non-numeric | "Please enter a number, such as 95." |
| Lex/Leq field | < 50 or > 140 | "That value seems outside a typical workplace range. Double-check your entry." |
| Hours per task | Non-numeric | "Enter hours as a number, such as 2.5." |
| Hours per task | < 0 | "Hours can't be negative." |
| Hours total | > 24 | "Total hours exceed 24. Please check your task list." |
| NRR | Non-numeric | "Please enter the NRR as a number, such as 29." |
| NRR | < 0 or > 40 | "That NRR seems unusual. Please check the value on the HPD packaging." |
| No HPD selected | Attempt to advance | "Please select or enter an HPD before calculating." |
| Dual, second HPD missing | Attempt to calculate | "Dual protection requires two devices. Please add the second HPD." |

No technical jargon (no "NaN", no "undefined", no stack traces) ever reaches the user.

---

## 8. Accessibility

- All inputs have visible labels (no placeholder-only labelling)
- Colour is never the only indicator — verdicts use icons + text + colour
- Tap targets ≥ 48 × 48 px
- Step indicator announces current step for screen readers (`aria-current`)
- Print summary works without colour (uses borders and text patterns)

---

## 9. Open Items / TODO_NORM

| # | Item | Where |
|---|------|--------|
| 1 | SLC80 derating formula | `data/rules.json` |
| 2 | Confirm "L-suffix" (AL/BL) — is this purely qualitative, or does it affect the calculation? | `data/rules.json` |
| 3 | Peak noise limit per jurisdiction (140 dBC is the general value — confirm this applies uniformly) | `data/rules.json` |
| 4 | Confirm acceptable HPD types for Grade 5 / Dual (any earplug + earmuff, or specific class requirements for each) | `data/rules.json` |
| 5 | Initial HPD product dataset — need Norm's input on which brands/models are most common in BC/AB/SK workplaces | `data/hpd-products.json` |
