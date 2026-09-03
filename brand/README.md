# fomo brand kit

Source assets for the fomo brand, used by `/crewsheet` and the `fomo` entry on the
homepage. These are **source files, not web assets** — they are excluded from
Firebase Hosting deploys via the `brand/**` entry in `firebase.json`. Anything that
needs to be served (for example `crewsheet/favicon.svg`) is derived from these and
committed separately at a served path.

## Naming

The kit arrived as loose files at the repo root with names like
`fomo Logo_Dark (1).svg`. They were renamed to kebab-case and sorted into folders.

**Five files had the wrong extension** on export — the byte contents and the
extension disagreed. They were renamed to match their real format:

| Original name              | Actually was | Now                              |
| -------------------------- | ------------ | -------------------------------- |
| `fomo Logo_Dark (1).svg`   | PNG          | `logo/fomo-logo-dark.png`        |
| `fomo Logo_Dark (1).png`   | SVG          | `logo/fomo-logo-dark.svg`        |
| `fomo Logo_White (1).svg`  | PNG          | `logo/fomo-logo-white.png`       |
| `fomo Wordmark_White.svg`  | PNG          | `wordmark/fomo-wordmark-white.png` |
| `fomo Wordmark_White.png`  | SVG          | `wordmark/fomo-wordmark-white.svg` |

## Contents

### `logo/` — the eyes mark

Square `100 × 100` viewBox. `fomo-logo-blue.svg` is the cleanest version: two flat
paths filled `#EAEDFF`, no masks or gradients — use this one when you need to
recolour or embed the mark inline. The `light` and `dark` variants carry masks and
are much heavier.

Available: `blue` (svg + png), `dark` (svg + png), `light` (svg + png),
`darkblue` (png), `white` (png).

### `wordmark/` — the "fomo" lettering

`352 × …` viewBox. Available: `blue` (svg + png), `dark` (svg), `white` (svg + png).

Note the wordmark inlined in `crewsheet/index.html` is a separate, tighter
`75 × 24` version pulled from fomo.family's own nav, kept inline so the nav needs
no network request.

### `motion/` — animated logo clips

Six `.mov` files, ~49 MB total. Not deployed. Largest is
`fomo-eyes-turn-1-transparent.mov` at 13 MB.

## Palette

Taken from fomo.family's stylesheet:

| Token          | Value     | Use                                  |
| -------------- | --------- | ------------------------------------ |
| bg primary     | `#060510` | page ground                          |
| bg secondary   | `#12111a` | cards                                |
| bg tertiary    | `#161522` | raised surfaces / inputs             |
| text primary   | `#f7f7f7` | headings, body                       |
| text secondary | `#9899a3` | supporting copy                      |
| text tertiary  | `#474b52` | borders, placeholders                |
| accent         | `#516af6` | CTAs, focus rings, links             |
| accent deep    | `#221d4b` | deep indigo fills                    |
| mark fill      | `#EAEDFF` | the eyes mark                        |
| green          | `#21c95e` | success                              |
| yellow         | `#ffbf17` | warning                              |
| red            | `#ff622e` | critical                             |

Typeface is **Aeonik** (Regular 400 / Medium 500 / Bold 700). It is not on Google
Fonts; **Schibsted Grotesk** is the stand-in used on the web pages here.

## House rule

**"fomo" is always lowercase** — in copy, headings, labels, and alt text.
