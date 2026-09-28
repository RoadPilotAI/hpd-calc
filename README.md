# HPD Adequacy Calculator

A free, open-source tool for screening whether a hearing protection device (HPD) provides adequate protection under **CSA Z94.2** methodology.

**Live app:** https://roadpilotai.github.io/hpd-calc/

---

## What it does

Enter a noise exposure level and an HPD's Noise Reduction Rating (NRR), and the tool calculates the estimated protected level at the ear using CSA Z94.2 derating factors. It then compares that level against the occupational exposure limit for your province or territory and returns a verdict:

- **Adequate** — the HPD provides sufficient protection
- **Over-protected** — attenuation is very high; consider a lower-rated device to preserve situational awareness
- **Caution** — marginally under the limit; consider a higher-rated device
- **Under-protected** — exceeds the limit; this HPD is not adequate

Supported HPD types: earplugs (50% derating), earmuffs (70% derating), and dual protection (65% of higher NRR + 5 dB).

All 14 Canadian jurisdictions are included (BC, AB, SK, MB, ON, QC, NB, NS, PE, NL, YT, NT, NU, and Federal).

---

## Important limitations

This tool provides **screening estimates only**. It is not a substitute for:

- Calibrated noise dosimetry by a qualified occupational hygienist
- A formal hearing conservation program
- Regulatory compliance advice

Occupation noise levels in the search database are drawn from published sources (NIOSH, WorkSafeBC, MSHA) and represent typical or average exposures — actual levels at any specific workplace will differ.

---

## Using the tool

**Option 1 — Search by occupation:** Type a job title (e.g. "roofer", "chainsaw", "drill press") to find a published noise level for that role.

**Option 2 — Enter a measured value:** If you have a dosimetry result (Lex,8h in dBA or dBC), enter it directly.

Then select your HPD type, search for your device or enter its NRR manually, choose your jurisdiction, and the result updates instantly.

---

## Running locally

Prerequisites: [Node.js](https://nodejs.org/) (v18 or later)

```bash
npm install
npm run dev
```

Open http://localhost:3000. The app is pure static HTML/CSS/JavaScript — no build step is required for deployment.

To validate the data files:

```bash
node scripts/validate-data.mjs
```

---

## Data sources

| Dataset | Source | Entries |
|---------|--------|---------|
| Occupation noise levels (measured) | [NIOSH Health Hazard Evaluation Program](https://www.cdc.gov/niosh/hhe/) | 42 |
| Occupation noise levels (estimated) | WorkSafeBC bulletins, NIOSH Pub. 98-126, MSHA guidance | 70 |
| HPD products | Manufacturer published data sheets | 28 |
| Regulatory limits & derating factors | CSA Z94.2-14 / Z94.2:18 | 14 jurisdictions |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add occupation noise levels, HPD products, or report incorrect values.

**Never submit:** client dosimetry data from any employer, values without a verifiable source, or NRR values not from a manufacturer's published data sheet.

---

## Licence

Code: [MIT](LICENSE)
Data (`data/`): [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
