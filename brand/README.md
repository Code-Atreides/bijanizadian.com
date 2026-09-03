# fomo brand kit

Source assets for the fomo brand, used by `/campus`, `/crewsheet`, and the `fomo` entry on the
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

Note the wordmark inlined in the nav of `crewsheet`, `gameday`, `dinners` and
`campus` is a separate, tighter `75 × 24` version pulled from fomo.family's own
nav, kept inline so the nav needs no network request. The big "fomo/campus" title
in the `/campus` hero is this kit's `fomo-wordmark-white.svg`, inlined with
`fill="currentColor"` so it can take the hero lavender `#CBD0EB`.

### `/campus` hero art

`campus/space-bg.webp`, `campus/astronaut.webp` and `campus/astronaut-mobile.webp`
are fomo.family's own landing-page images, copied so the campus edition of the
landing page opens on the same picture. They live under `campus/` because they
are served, unlike everything in this folder.

### `motion/` — animated logo clips

Six `.mov` files, ~49 MB total. Not deployed. Largest is
`fomo-eyes-turn-1-transparent.mov` at 13 MB.

## Palette

The official kit. These values supersede anything sampled from fomo.family's
stylesheet.

| Name                  | Hex                   | Use                                          |
| --------------------- | --------------------- | -------------------------------------------- |
| fomo blue             | `#516AF6`             | default brand background and primary accent  |
| electric blue         | `#4A36FF`             | small, high-energy accent or gradient depth  |
| light blue            | `#ACB8F9`             | soft glow or highlight only                  |
| fomo ink              | `#0B091F`             | dark title cards, high-contrast compositions |
| white / pale lavender | `#FFFFFF` / `#EAEDFF` | type and light backgrounds                   |

**Pairings.** On `#516AF6` or `#0B091F`, type and logo are white or `#EAEDFF`.
On `#EAEDFF` or white, they are `#516AF6` or `#0B091F`.

The dark UI the web pages are built on uses a supporting set alongside those:
ground `#060510`, cards `#12111a`, raised surfaces `#161522`, text `#f7f7f7` /
`#9899a3`, borders `#33343d`, and semantic green `#21c95e`, yellow `#ffbf17`,
red `#ff622e`. The eyes mark is filled `#EAEDFF`.

## Gradients

The signature treatment is a soft blue spotlight over a solid field. It should
feel atmospheric, never shiny or multicoloured.

- **Brand** — title cards, covers, launch graphics, social backgrounds. Base
  `#516AF6`, with a large diffuse `#ACB8F9` glow in the upper third faded to
  transparent. Type white or `#EAEDFF`. This is what the `/campus` application
  card uses.
- **Technical & premium** — dark title cards, product reveals. Base `#0B091F`,
  with a large diffuse `#221D4B` halo top-centre faded to transparent. Type
  white or `#EAEDFF`. This is what the `/campus` closer uses.

## Usage rules

- Start with one dominant background: fomo blue, fomo ink, pale lavender, or white.
- Use one strong focal point: product UI, a wordmark, or the headline.
- Electric blue is an accent only, never a second competing background. On
  `/campus` it appears exactly once, as the slash in "fomo/campus".
- Avoid rainbow gradients, neon green/orange/yellow, metallic effects, and
  generic crypto gloss.
- For logos, use the approved white or blue marks with clear contrast. Do not
  recolour the eyes or use the full-colour eyes in a lockup.

## Typography

**Aeonik** (Regular 400 / Medium 500 / Bold 700) is fomo's exclusive typeface,
for product UI, motion graphics, videos, and wordmarks. Keep on-screen copy
legible and avoid overly tight line spacing.

It is not on Google Fonts. `/campus` serves fomo.family's own woff2 files from
`campus/fonts/` (`Aeonik-Regular`, `Aeonik-Medium`, `Aeonik-Bold`) and declares
them with `@font-face`, so that page sets type in the real face. Body copy there
runs at **Medium 500**, which is what fomo.family sets on `body` — Regular reads
too light against the same layout. `/crewsheet`, `/gameday`, and `/dinners` still
use **Schibsted Grotesk**, which stays in the stack everywhere as the fallback.

## Buttons

fomo.family's hero pair, which `/campus` reproduces: a translucent fill behind a
12px backdrop blur, a `#CBD0EB` hairline at 10%, a 12px radius, and bold 18px
type in a 200px-wide pill with 12px of vertical padding. No glow — the fill does
the work.

| Button    | Fill                  | Hover                 |
| --------- | --------------------- | --------------------- |
| primary   | `#606AF7` at 50%      | `#606AF7` at 80%      |
| secondary | white at 12%          | white at 20%          |

## Product & UI showcases

App screens change constantly, so always cross-reference the live version of the
fomo app. Price data must be real — old data and old charts are fine, invented
data never is. Focus each frame on one feature, using depth, cropping, zoom, and
device framing to direct attention. Never expose user information or private
balances: use the demo app, or blur that part of the UI.

## House rule

**"fomo" is always lowercase** — in copy, headings, labels, and alt text.
