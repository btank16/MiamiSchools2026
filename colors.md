# Color system

Colors only. No images, icons or other assets. Light theme only: a dark theme can be derived from the ramps below later and is not defined here.

Status: proposal, built from the Miami-Dade palette in `quickdesign.md`, but not copied from it. Every number in this file was computed, not eyeballed (see "How this was checked").

## 1. The palette at a glance

| Role | Name | Hex | Used for |
|---|---|---|---|
| Primary | Primary 600 | `#2256BB` | Buttons, links, selected states, the public-school color |
| Primary, pressed | Primary 700 / 800 | `#17439A` / `#113375` | Hover and pressed states |
| Secondary | Bay 900 | `#052739` | Dark surfaces: spotlight cards, footer, map clusters |
| Accent | Marigold 400 | `#F7BE2B` | One job only: "your zoned school", plus the saved-bookmark state |
| Canvas | White | `#FFFFFF` | Page and cards |
| Subtle surface | Neutral 50 | `#F9FAFD` | Header bar, panels, hover backgrounds |
| Text | Neutral 950 | `#060D1A` | Headings and body |
| Muted text | Neutral 600 | `#5E636D` | Captions, helper text |
| Border | Neutral 200 | `#E5E8ED` | Dividers and card outlines |
| Success / Warning / Error | Success 600, Warning 600, Danger 600 | `#05773B` / `#B07008` / `#BE2323` | Status only |

Five more colors identify the kinds of place on the map (section 5), and five soft colors mark state grades.

## 2. Why not use `quickdesign.md` as it is

`quickdesign.md` is a faithful copy of the dadeschools.net site. That is the problem: a website's CSS is a set of accidents, not a set of roles. Measured:

| Finding | Evidence |
|---|---|
| Three blues doing the same job | `#25408F`, `#205493` and `#0069D9` sit within a few degrees of hue (266, 255, 257). The first two are only 0.055 apart in OKLab, so they cannot carry a hierarchy. |
| No secondary color | Everything is blue plus gray. There is nothing to separate "dark surface" from "action". |
| Gray neutrals with no relationship to the brand | `#666666` and `#EEEEEE` have zero chroma, so they look pasted onto the blue instead of belonging to it. |
| Two failing colors | The logo cyan `#2FA4E7` is 2.8:1 on white and the focus yellow `#FFF300` is 1.2:1. Neither can carry text or a control edge. |
| No map or data colors | The brief is a map with five kinds of place and A to D grades. The file has nothing for that. |
| The mood is institutional | Navy on white with a flat blue button reads as a government form. This product speaks to parents choosing where a child spends the day. |

**What I kept from it:** the hue family (blue, about 262 degrees), because it is the color families already associate with the district and it reads as trustworthy, and its dark navy as the starting point for the dark surface.

**What I changed:** collapsed the three blues into one primary with a proper ramp; added a deep blue-green secondary (Bay) for dark surfaces; added a single warm accent; tinted every gray toward the brand hue; and built map, grade and status colors that do not exist in the source.

## 3. Strategy

These principles come from the research (sources at the end) and from the Impeccable and UI UX Pro Max guidance in this repo.

1. **Build roles, not swatches.** Every color has a job: surface, text, action, focus, status, data. A color that has no job is not in the file.
2. **Neutrals first, then color.** About 60% of any screen is canvas and neutrals, about 30% is primary and secondary, and about 10% is accent and status. Treat that as a budget, not a law.
3. **One blue does the work.** Primary 600 is the only action color. If everything is blue, nothing is clickable.
4. **The accent is rare, so it means something.** Marigold marks the one personal fact in the product: the school a family's address is zoned for. It also marks a saved item. It is never used for decoration or for status. Rarity is what gives it force.
5. **Tinted neutrals.** The grays carry a trace of the brand hue (chroma 0.004 to 0.03 at hue 262), so surfaces and text feel part of the same system.
6. **OKLCH.** Ramps are defined by perceptual lightness, with chroma lowered near white and black. Equal lightness steps look like equal steps, so contrast is predictable. Hex values are derived from it.
7. **Data colors are a separate system.** Categories on the map use their own set, kept to five (guidance says seven at most), chosen to stay apart under color blindness, and always paired with a shape.
8. **Color is never the only signal.** Grades show the letter. Map pins show a shape. Errors show an icon and text.
9. **Blue is a convention, not proof.** The research on color psychology is mostly vendor blogs. Blue and teal as trust colors is common practice, not a measured effect, so this choice is justified by contrast, distinctness and fit with the district brand, not by psychology.

## 4. Ramps

**Primary**: brand blue, hue 262. Step 600 is the main action color.

| Step | Hex | OKLCH |
|---|---|---|
| 50 | `#F0F5FF` | `oklch(0.97 0.014 264)` |
| 100 | `#E1ECFF` | `oklch(0.94 0.028 261)` |
| 200 | `#C3D8FF` | `oklch(0.88 0.059 263)` |
| 300 | `#9BBEFF` | `oklch(0.80 0.100 262)` |
| 400 | `#6799F7` | `oklch(0.69 0.149 262)` |
| 500 | `#3A74E3` | `oklch(0.58 0.180 262)` |
| 600 | `#2256BB` | `oklch(0.48 0.169 262)` |
| 700 | `#17439A` | `oklch(0.41 0.150 262)` |
| 800 | `#113375` | `oklch(0.34 0.120 262)` |
| 900 | `#0C2352` | `oklch(0.27 0.091 262)` |
| 950 | `#061431` | `oklch(0.20 0.061 262)` |

**Bay**: deep blue-green, hue 235. The secondary. Steps 800 to 950 are the dark surfaces.

| Step | Hex | OKLCH |
|---|---|---|
| 50 | `#F2F8FB` | `oklch(0.98 0.008 229)` |
| 100 | `#E2EDF4` | `oklch(0.94 0.015 235)` |
| 200 | `#C5DBE9` | `oklch(0.88 0.031 236)` |
| 300 | `#99BDD3` | `oklch(0.78 0.050 235)` |
| 400 | `#6799B7` | `oklch(0.66 0.070 236)` |
| 500 | `#3B7697` | `oklch(0.54 0.080 235)` |
| 600 | `#1B5978` | `oklch(0.44 0.080 235)` |
| 700 | `#0F455F` | `oklch(0.37 0.070 235)` |
| 800 | `#08354A` | `oklch(0.31 0.059 234)` |
| 900 | `#052739` | `oklch(0.26 0.051 237)` |
| 950 | `#011925` | `oklch(0.20 0.039 232)` |

**Marigold**: yellow-orange, hue 85. The accent. Use 400 for fills, 700 or darker for text.

| Step | Hex | OKLCH |
|---|---|---|
| 50 | `#FFF8EA` | `oklch(0.98 0.020 85)` |
| 100 | `#FFEDC8` | `oklch(0.95 0.052 85)` |
| 200 | `#FFDD96` | `oklch(0.91 0.097 85)` |
| 300 | `#FECD5C` | `oklch(0.87 0.140 85)` |
| 400 | `#F7BE2B` | `oklch(0.83 0.160 85)` |
| 500 | `#E5AE0D` | `oklch(0.78 0.158 85)` |
| 600 | `#BF9007` | `oklch(0.68 0.138 85)` |
| 700 | `#8F6B02` | `oklch(0.55 0.112 85)` |
| 800 | `#6C5005` | `oklch(0.45 0.090 85)` |
| 900 | `#513C09` | `oklch(0.37 0.070 84)` |
| 950 | `#342707` | `oklch(0.28 0.050 86)` |

**Neutral**: blue-tinted gray, hue 262. Text, borders and surfaces.

| Step | Hex | OKLCH |
|---|---|---|
| 50 | `#F9FAFD` | `oklch(0.99 0.004 271)` |
| 100 | `#F1F3F8` | `oklch(0.96 0.007 269)` |
| 200 | `#E5E8ED` | `oklch(0.93 0.007 261)` |
| 300 | `#D4D8DE` | `oklch(0.88 0.009 258)` |
| 400 | `#A7ABB3` | `oklch(0.74 0.012 264)` |
| 500 | `#82868F` | `oklch(0.62 0.014 267)` |
| 600 | `#5E636D` | `oklch(0.50 0.017 264)` |
| 700 | `#424852` | `oklch(0.40 0.019 261)` |
| 800 | `#282E38` | `oklch(0.30 0.020 261)` |
| 900 | `#141B26` | `oklch(0.22 0.024 259)` |
| 950 | `#060D1A` | `oklch(0.16 0.030 261)` |

**Success**: green, hue 152.

| Step | Hex | OKLCH |
|---|---|---|
| 50 | `#E9FAED` | `oklch(0.97 0.025 153)` |
| 100 | `#D3F5DB` | `oklch(0.94 0.050 152)` |
| 200 | `#ABE9BB` | `oklch(0.88 0.089 152)` |
| 300 | `#7FD497` | `oklch(0.80 0.120 152)` |
| 400 | `#4FB772` | `oklch(0.70 0.140 152)` |
| 500 | `#2A9754` | `oklch(0.60 0.140 152)` |
| 600 | `#05773B` | `oklch(0.50 0.130 152)` |
| 700 | `#015D2D` | `oklch(0.42 0.109 152)` |
| 800 | `#034721` | `oklch(0.35 0.090 152)` |
| 900 | `#033216` | `oklch(0.28 0.070 152)` |
| 950 | `#011C0A` | `oklch(0.20 0.050 152)` |

**Warning**: amber, hue 70. Pair with a triangle icon; it sits close to the accent in hue, so never use marigold for a warning.

| Step | Hex | OKLCH |
|---|---|---|
| 50 | `#FFF5EA` | `oklch(0.97 0.018 70)` |
| 100 | `#FFEBD5` | `oklch(0.95 0.036 70)` |
| 200 | `#FED6A9` | `oklch(0.90 0.074 70)` |
| 300 | `#FEC076` | `oklch(0.85 0.116 70)` |
| 400 | `#F4A437` | `oklch(0.78 0.150 70)` |
| 500 | `#D98B09` | `oklch(0.70 0.150 70)` |
| 600 | `#B07008` | `oklch(0.60 0.128 70)` |
| 700 | `#8A5601` | `oklch(0.50 0.108 69)` |
| 800 | `#6C4302` | `oklch(0.42 0.090 70)` |
| 900 | `#513308` | `oklch(0.35 0.070 70)` |
| 950 | `#331F05` | `oklch(0.26 0.050 70)` |

**Danger**: red, hue 27.

| Step | Hex | OKLCH |
|---|---|---|
| 50 | `#FEF2F0` | `oklch(0.97 0.013 29)` |
| 100 | `#FEE4E1` | `oklch(0.94 0.029 26)` |
| 200 | `#FEC9C2` | `oklch(0.88 0.061 27)` |
| 300 | `#FFA196` | `oklch(0.80 0.114 27)` |
| 400 | `#F66D62` | `oklch(0.70 0.171 27)` |
| 500 | `#DE3C37` | `oklch(0.60 0.200 27)` |
| 600 | `#BE2323` | `oklch(0.52 0.190 27)` |
| 700 | `#991618` | `oklch(0.44 0.165 27)` |
| 800 | `#771212` | `oklch(0.37 0.135 27)` |
| 900 | `#55110F` | `oklch(0.30 0.100 27)` |
| 950 | `#340907` | `oklch(0.22 0.069 27)` |

## 5. Map and data colors

**Kinds of place.** One color and one shape per kind. The shape is required, not optional: it is what keeps the map readable when two colors look alike to someone.

| Kind | Hex | OKLCH | Shape | Contrast on white | Contrast on light basemap |
|---|---|---|---|---|---|
| Public | `#2256BB` | `oklch(0.48 0.169 262)` | circle | 6.7:1 | 5.9:1 |
| Charter | `#966CD7` | `oklch(0.62 0.160 300)` | square | 3.9:1 | 3.4:1 |
| Private | `#C9690C` | `oklch(0.62 0.150 55)` | diamond | 3.8:1 | 3.3:1 |
| Childcare | `#088F77` | `oklch(0.58 0.108 175)` | triangle | 4.0:1 | 3.5:1 |
| Head Start | `#741E34` | `oklch(0.38 0.120 10)` | hexagon | 10.6:1 | 9.3:1 |

Public schools use the brand blue on purpose: it is the district's own color. A white 2 px outline separates every pin from the basemap.

**Map interface colors**

| Element | Color |
|---|---|
| Cluster bubble | Fill `#08354A`, count in white |
| Selected pin | Marigold ring `#F7BE2B` around the pin, with a `#060D1A` outer line |
| Hovered pin or card | Primary 200 `#C3D8FF` halo |
| Zoned-school boundary | Outline `#2256BB`, fill `#C3D8FF` at about 35% opacity (the one place alpha is acceptable) |
| Basemap | Keep it quiet: light gray land, pale blue-gray water, no saturated roads. Pins must be the loudest thing on the map. |

**State grades (A to F).** Use the soft chip as the default. Always show the letter. The grade colors reuse the success, warning and danger families so status colors stay consistent.

| Grade | Chip background | Chip text | Strong fill (with white text) |
|---|---|---|---|
| A | `#D9F8E0` | `#0E4926` | `#017137` |
| B | `#E7F4D4` | `#334407` | `#4E6801` |
| C | `#FCEDCD` | `#4F3901` | `#775801` |
| D | `#FEEADF` | `#5F2D0C` | `#934302` |
| F | `#FEE9E6` | `#622924` | `#993A33` |

## 6. Roles to tokens

| Role | Token | Value |
|---|---|---|
| Page canvas | `--background` | `#FFFFFF` |
| Panel and header surface | `--surface-subtle` | `#F9FAFD` |
| Card | `--card` | `#FFFFFF` |
| Border, divider | `--border` | `#E5E8ED` |
| Control border | `--input` | `#82868F` |
| Text | `--foreground` | `#060D1A` |
| Secondary text | `--text-secondary` | `#424852` |
| Muted text | `--muted-foreground` | `#5E636D` |
| Primary action | `--primary` | `#2256BB` (hover `#17439A`, pressed `#113375`) |
| Text on primary | `--primary-foreground` | `#FFFFFF` |
| Selected background | `--selected` | `#F0F5FF` with `#17439A` text |
| Focus ring | `--ring` | `#3A74E3`, 2 px, with a 2 px white offset |
| Dark surface | `--surface-dark` | `#052739`, text white, secondary text `#C5DBE9` |
| Accent fill | `--highlight` | `#F7BE2B`, text `#060D1A` |
| Accent text | `--highlight-text` | `#8F6B02` |
| Success / warning / error | `--success`, `--warning`, `--destructive` | `#05773B`, `#B07008`, `#BE2323` |
| Text selection | `::selection` | background `#C3D8FF`, text `#061431` |
| Scrollbar thumb | | `#D4D8DE` |
| Overlay scrim | `--scrim` | `#060D1A` at 50% |

Browser surfaces that ship with defaults (text selection, caret, focus ring, scrollbars) are themed from this palette, per the Impeccable quality floor.

## 7. How this was checked

All checks are computed with a script and every row passes. Text needs 4.5:1, large text and graphics need 3:1 (WCAG 2.2 AA).

| Use | Pair | Hex | Contrast | Needs | Result |
|---|---|---|---|---|---|
| Body text | neutral-950 on white | `#060D1A` on `#FFFFFF` | 19.4:1 | 4.5:1 | Pass |
| Body text on subtle surface | neutral-950 on neutral-50 | `#060D1A` on `#F9FAFD` | 18.6:1 | 4.5:1 | Pass |
| Secondary text | neutral-700 on white | `#424852` on `#FFFFFF` | 9.2:1 | 4.5:1 | Pass |
| Muted text, placeholders | neutral-600 on white | `#5E636D` on `#FFFFFF` | 6.0:1 | 4.5:1 | Pass |
| Muted text on subtle surface | neutral-600 on neutral-100 | `#5E636D` on `#F1F3F8` | 5.4:1 | 4.5:1 | Pass |
| Input and control border | neutral-500 on white | `#82868F` on `#FFFFFF` | 3.6:1 | 3:1 | Pass |
| Primary button label | white on primary-600 | `#FFFFFF` on `#2256BB` | 6.7:1 | 4.5:1 | Pass |
| Primary button hover | white on primary-700 | `#FFFFFF` on `#17439A` | 9.1:1 | 4.5:1 | Pass |
| Link text | primary-600 on white | `#2256BB` on `#FFFFFF` | 6.7:1 | 4.5:1 | Pass |
| Selected row text | primary-700 on primary-50 | `#17439A` on `#F0F5FF` | 8.3:1 | 4.5:1 | Pass |
| Chip text on tint | primary-600 on primary-100 | `#2256BB` on `#E1ECFF` | 5.7:1 | 4.5:1 | Pass |
| Focus ring | primary-500 on white | `#3A74E3` on `#FFFFFF` | 4.4:1 | 3:1 | Pass |
| Dark card text | white on bay-900 | `#FFFFFF` on `#052739` | 15.5:1 | 4.5:1 | Pass |
| Dark card secondary text | bay-200 on bay-900 | `#C5DBE9` on `#052739` | 10.8:1 | 4.5:1 | Pass |
| Cluster bubble count | white on bay-800 | `#FFFFFF` on `#08354A` | 13.0:1 | 4.5:1 | Pass |
| Accent label text | neutral-950 on marigold-400 | `#060D1A` on `#F7BE2B` | 11.4:1 | 4.5:1 | Pass |
| Accent text on white | marigold-700 on white | `#8F6B02` on `#FFFFFF` | 4.9:1 | 4.5:1 | Pass |
| Accent text on tint | marigold-800 on marigold-100 | `#6C5005` on `#FFEDC8` | 6.5:1 | 4.5:1 | Pass |
| Accent fill on dark card | marigold-400 on bay-900 | `#F7BE2B` on `#052739` | 9.1:1 | 3:1 | Pass |
| Success text | success-700 on success-100 | `#015D2D` on `#D3F5DB` | 6.9:1 | 4.5:1 | Pass |
| Success on white | success-600 on white | `#05773B` on `#FFFFFF` | 5.7:1 | 4.5:1 | Pass |
| Warning text | warning-700 on warning-100 | `#8A5601` on `#FFEBD5` | 5.3:1 | 4.5:1 | Pass |
| Warning icon on white | warning-600 on white | `#B07008` on `#FFFFFF` | 4.1:1 | 3:1 | Pass |
| Error text | danger-700 on danger-100 | `#991618` on `#FEE4E1` | 7.0:1 | 4.5:1 | Pass |
| Error on white | danger-600 on white | `#BE2323` on `#FFFFFF` | 6.1:1 | 4.5:1 | Pass |
| Public pin | public on white halo | `#2256BB` on `#FFFFFF` | 6.7:1 | 3:1 | Pass |
| Public pin | public on light basemap | `#2256BB` on `#EEF0F3` | 5.9:1 | 3:1 | Pass |
| Charter pin | charter on white halo | `#966CD7` on `#FFFFFF` | 3.9:1 | 3:1 | Pass |
| Charter pin | charter on light basemap | `#966CD7` on `#EEF0F3` | 3.4:1 | 3:1 | Pass |
| Private pin | private on white halo | `#C9690C` on `#FFFFFF` | 3.8:1 | 3:1 | Pass |
| Private pin | private on light basemap | `#C9690C` on `#EEF0F3` | 3.3:1 | 3:1 | Pass |
| Childcare pin | childcare on white halo | `#088F77` on `#FFFFFF` | 4.0:1 | 3:1 | Pass |
| Childcare pin | childcare on light basemap | `#088F77` on `#EEF0F3` | 3.5:1 | 3:1 | Pass |
| Headstart pin | headstart on white halo | `#741E34` on `#FFFFFF` | 10.6:1 | 3:1 | Pass |
| Headstart pin | headstart on light basemap | `#741E34` on `#EEF0F3` | 9.3:1 | 3:1 | Pass |
| Grade A chip | grade-A-fg on grade-A-bg | `#0E4926` on `#D9F8E0` | 9.2:1 | 4.5:1 | Pass |
| Grade B chip | grade-B-fg on grade-B-bg | `#334407` on `#E7F4D4` | 9.3:1 | 4.5:1 | Pass |
| Grade C chip | grade-C-fg on grade-C-bg | `#4F3901` on `#FCEDCD` | 9.5:1 | 4.5:1 | Pass |
| Grade D chip | grade-D-fg on grade-D-bg | `#5F2D0C` on `#FEEADF` | 9.7:1 | 4.5:1 | Pass |
| Grade F chip | grade-F-fg on grade-F-bg | `#622924` on `#FEE9E6` | 9.7:1 | 4.5:1 | Pass |

**Color-blind check.** I simulated the three common color-vision deficiencies (Machado 2009 matrices) and measured the smallest perceptual distance (OKLab) between any two of the five place colors. A distance of about 0.02 is barely noticeable, so 0.1 and up is clearly different.

| Vision type | Closest pair, distance | Which pair |
|---|---|---|
| Normal vision | 0.177 | public and charter |
| Protanopia (no red cones) | 0.105 | public and charter |
| Deuteranopia (no green cones) | 0.139 | private and childcare |
| Tritanopia (no blue cones) | 0.104 | public and childcare |

The weakest pairs are public (blue) against charter (violet) for protanopia, and public against childcare (teal) for tritanopia. Both are still clearly different, but at that margin the shapes do the real work. The grade colors are *not* distinguishable by hue alone under deuteranopia, which is why the letter is always shown.

**Limits.** This has not been tested with real users or on a calibrated display. The simulation is a model. The ΔE thresholds are rules of thumb. The basemap color used for the pin contrast check (`#EEF0F3`) is a typical light basemap, so recheck pins against the style that ships.

## 8. Rules of use

Do:
- Keep primary 600 for the single main action on a screen.
- Put marigold only on "your zoned school" and on saved items.
- Use Bay 900 for dark surfaces and for text on them use white and Bay 200, not gray.
- Pair every status color with an icon and text.
- Take pin colors from section 5 only.

Do not:
- Use a sector color as a button or a link.
- Use marigold or any warm color for warnings or errors.
- Put gradient text or a colored left border thicker than 1 px on cards (Impeccable bans).
- Use pure gray (`#666`, `#EEE`) or pure black.
- Add a new hue without first removing one.

## 9. Drop-in CSS

Colors only. The names follow shadcn so the existing components pick them up. Naming trap: shadcn's `--accent` means "hover background", not a brand accent. The brand accent is `--highlight`. The brand secondary (Bay) is `--surface-dark`, and shadcn's `--secondary` is the light version for secondary buttons.

```css
:root {
  /* surfaces and text */
  --background: #FFFFFF;
  --foreground: #060D1A;
  --card: #FFFFFF;
  --card-foreground: #060D1A;
  --popover: #FFFFFF;
  --popover-foreground: #060D1A;
  --surface-subtle: #F9FAFD;
  --text-secondary: #424852;
  --muted: #F1F3F8;
  --muted-foreground: #5E636D;
  --border: #E5E8ED;
  --input: #82868F;
  --ring: #3A74E3;

  /* primary and secondary */
  --primary: #2256BB;
  --primary-hover: #17439A;
  --primary-pressed: #113375;
  --primary-foreground: #FFFFFF;
  --selected: #F0F5FF;
  --secondary: #E2EDF4;
  --secondary-foreground: #052739;
  --accent: #F1F3F8;            /* shadcn hover background, not the brand accent */
  --accent-foreground: #060D1A;
  --surface-dark: #052739;
  --on-dark: #FFFFFF;
  --on-dark-muted: #C5DBE9;

  /* brand accent */
  --highlight: #F7BE2B;
  --highlight-foreground: #060D1A;
  --highlight-text: #8F6B02;
  --highlight-tint: #FFEDC8;

  /* status */
  --success: #05773B;
  --success-tint: #D3F5DB;
  --success-text: #015D2D;
  --warning: #B07008;
  --warning-tint: #FFEBD5;
  --warning-text: #8A5601;
  --destructive: #BE2323;
  --destructive-tint: #FEE4E1;
  --destructive-text: #991618;

  /* map: kinds of place (chart-1 to chart-5 reuse these) */
  --sector-public: #2256BB;
  --sector-charter: #966CD7;
  --sector-private: #C9690C;
  --sector-childcare: #088F77;
  --sector-headstart: #741E34;
  --chart-1: var(--sector-public);
  --chart-2: var(--sector-charter);
  --chart-3: var(--sector-private);
  --chart-4: var(--sector-childcare);
  --chart-5: var(--sector-headstart);

  /* map: interface */
  --map-cluster: #08354A;
  --map-zone-outline: #2256BB;
  --map-zone-fill: #C3D8FF;
  --map-hover: #C3D8FF;

  /* grades, soft chips */
  --grade-a-bg: #D9F8E0; --grade-a-fg: #0E4926;
--grade-b-bg: #E7F4D4; --grade-b-fg: #334407;
--grade-c-bg: #FCEDCD; --grade-c-fg: #4F3901;
--grade-d-bg: #FEEADF; --grade-d-fg: #5F2D0C;
--grade-f-bg: #FEE9E6; --grade-f-fg: #622924;

  --scrim: #060D1A;
}

::selection { background: #C3D8FF; color: #061431; }
```

## 10. Sources and method

- Skills in this repo: the UI UX Pro Max `color`, `chart` and `ux` data and its design-system generator (its generated "Claymorphism, indigo" suggestion was rejected as too playful for a family-trust tool; its role structure and the government and directory palettes informed the role list), and Impeccable's `colorize` and quality-floor references (roles over swatches, OKLCH, contrast tiers, themed browser surfaces, bans on gradient text and thick colored borders).
- Palette roles, the 60-30-10 budget and "test every pair": [UXPin](https://www.uxpin.com/studio/blog/choose-color-pallete/), [Rometheme](https://rometheme.net/blog/uncategorized/the-60-30-10-color-rule-in-ui-design/), [UX4Sight on accent colors](https://ux4sight.com/blog/ux-training-how-to-optimize-the-use-of-accent-colors). The sources disagree about what fills the 60%, so it is used as a rough budget.
- OKLCH for predictable lightness: [LogRocket](https://blog.logrocket.com/oklch-css-consistent-accessible-color-palettes), [Evil Martians](https://evilmartians.com/chronicles/exploring-the-oklch-ecosystem-and-its-tools). Both caution that a good-looking palette is not automatically accessible, hence the contrast table.
- Categorical colors for data (keep categories few, use palettes built for color-vision deficiency, add shape): [EU data visualisation guide](https://data.europa.eu/apps/data-visualisation-guide/colour-for-categories).
- Blue and orange in education: [Verpex](https://verpex.com/blog/website-tips/best-color-combinations-for-educational-websites), [GreenGeeks](https://www.greengeeks.com/blog/color-psychology-web-design/). Vendor blogs, so used only as supporting convention.
