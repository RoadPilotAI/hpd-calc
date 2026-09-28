# Contributing to HPD Adequacy Calculator

Thank you for helping improve this tool. Contributions that add noise exposure data, fix incorrect values, or add HPD products are especially welcome.

---

## What you can contribute

| Type | File | Notes |
|------|------|-------|
| Occupation noise levels | `data/noise-exposures.json` | Must have a verifiable source |
| HPD products | `data/hpd-products.json` | Must include manufacturer-published NRR |
| Regulatory corrections | `data/rules.json` | Confirm the authoritative source |
| Bug reports | GitHub Issues | Describe what you expected vs. what happened |

---

## Adding a noise exposure entry

Each entry in `data/noise-exposures.json` must include:

```json
{
  "id": "industry-jobtitle",
  "job_title": "Display name workers would recognize",
  "environment": "Work context (e.g., 'Sawmill', 'Underground Mining')",
  "industry": "Broad sector",
  "lex_8h": 97.0,
  "weighting": "dBA",
  "value_type": "measured",
  "source": "Full citation — author, title, year, publisher",
  "source_url": "https://... (if available)",
  "aliases": ["alternate search terms"],
  "notes": null
}
```

**Rules for noise exposure entries:**

1. **Every entry must cite a real source.** Acceptable sources include:
   - Government publications (WorkSafeBC, NIOSH, OSHA, CCOHS, MSHA)
   - Peer-reviewed occupational hygiene research
   - Published occupational health guidance documents
   - Employer-conducted dosimetry studies (must note the workplace context and date)

2. **Never invent values.** If you are estimating from a range in a published document, use the midpoint and set `value_type` to `"estimated"` with a note explaining the range.

3. **`value_type` meanings:**
   - `"measured"` — mean of one or more field measurements reported in the cited source
   - `"estimated"` — derived from published guidance ranges; may differ from site-specific conditions

4. **`lex_8h` is always Lex,8h (dBA)** — the 8-hour equivalent noise level using a 3 dB exchange rate. If your source gives a different metric (e.g., OSHA TWA using 5 dB exchange rate, or OSHA % dose), do not include it without conversion.

5. **Do not include client dosimetry data.** Never add occupational noise measurements obtained from a specific employer's workers. This tool is not a repository for client data.

6. **IDs must be unique kebab-case slugs**, e.g. `"sawmill-planer-operator"`.

---

## Adding an HPD product

Each entry in `data/hpd-products.json` must include:

```json
{
  "id": "brand-model",
  "brand": "Manufacturer name",
  "model": "Exact product model name",
  "type": "earplug",
  "nrr": 29,
  "aliases": ["search terms"],
  "notes": null
}
```

**Rules for HPD products:**

1. **NRR must come from the manufacturer's published data sheet or product labelling.** Do not estimate or round.
2. **`type`** is either `"earplug"` or `"earmuff"`. Dual-protection sets are not listed as products; users select two individual devices.
3. If a product has been discontinued, note it: `"notes": "Discontinued — may still be in use"`.

---

## Regulatory values (`data/rules.json`)

Only the project maintainer (Norm) should change regulatory limits, derating formulas, or CSA class bands. If you believe a value is incorrect, open a GitHub Issue with the authoritative source citation rather than editing the file directly.

---

## How to submit

1. Fork the repository on GitHub
2. Make your changes in a new branch
3. Run `node scripts/validate-data.mjs` — it must pass with zero errors
4. Open a pull request with:
   - What you changed and why
   - The source citation for any new data values
   - Confirmation that you have the right to contribute the data

---

## What we will not accept

- Values without a verifiable source
- Client dosimetry data from any employer
- NRR values not from manufacturer published data
- Regulatory numbers not confirmed against the official standard

---

*This tool is MIT licensed. Data contributed to `data/` is published under CC BY 4.0.*
