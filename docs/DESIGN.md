---
name: Sentinel Scam Shield
description: A browser extension that warns people before they send money to a likely scam.
colors:
  safety-orange: "#ea580c"
  safety-orange-light: "#f97316"
  safety-orange-lighter: "#ffedd5"
  safety-orange-lightest: "#fff7ed"
  neutral-bg: "#f8fafc"
  neutral-surface: "#ffffff"
  neutral-border: "#ffedd5"
  ink-primary: "#0f172a"
  ink-secondary: "#64748b"
  ink-tertiary: "#334155"
  danger: "#dc2626"
  danger-soft: "#fef2f2"
  success: "#10b981"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 4rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.05em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "linear-gradient(135deg, {colors.safety-orange}, #f59e0b)"
    textColor: "{colors.neutral-surface}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "linear-gradient(135deg, {colors.safety-orange}, #f59e0b)"
  button-secondary:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.ink-tertiary}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
  card:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.lg}"
    padding: "24px"
  chip:
    backgroundColor: "{colors.safety-orange-lightest}"
    textColor: "{colors.safety-orange}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
---

# Design System: Sentinel Scam Shield

## 1. Overview

**Creative North Star: "The Engine Room Door"**

Sentinel's visual system is the clean surface of a technical product. The interface feels simple at first glance — clear type, generous space, warm color — but the real machinery is visible through well-organized sections, honest data tables, and direct links to architecture and business-case evidence. The design says: *this is built, this is understandable, and you can try it now.*

The atmosphere is **warm and approachable**, not alarmist. Safety orange is used as a confident accent, not a danger signal. Cards lift gently above a cool neutral background, giving the page a light, breathable structure. Motion is minimal and functional — hover lifts, smooth transitions, nothing choreographed.

**Key Characteristics:**
- Simple explanations before decoration.
- Technical depth surfaced honestly, not hidden behind marketing fluff.
- Safety orange as a rare, confident accent on a cool neutral ground.
- Rounded-full CTAs and softly rounded cards (12px) feel friendly but decisive.
- Light borders and small shadows create quiet layers without visual noise.

## 2. Colors

The palette is built around one vivid safety accent on a cool, near-white ground. Secondary inks are cool slate-grays that stay legible and neutral.

### Primary
- **Safety Orange** (`#ea580c`): The brand's primary action color. Used for primary CTAs, key metric highlights, and the most important links. It signals confidence and attention without danger.
- **Safety Orange Light** (`#f97316`): Used in gradient endpoints and icon accents where the primary needs to feel luminous.
- **Safety Orange Lighter** (`#ffedd5`): Card borders, section background tints, and soft dividers.
- **Safety Orange Lightest** (`#fff7ed`): Subtle background washes for hero sections and chip fills.

### Neutral
- **Cool Paper** (`#f8fafc`): Body background. A true cool off-white, not warm cream.
- **White** (`#ffffff`): Card and section surfaces.
- **Ink Primary** (`#0f172a`): Headings, body text, and primary content.
- **Ink Secondary** (`#64748b`): Muted text, captions, table metadata.
- **Ink Tertiary** (`#334155`): Secondary headings and emphasized body text.

### Functional
- **Danger** (`#dc2626`): Warning states, high-risk scores, and alert icons.
- **Danger Soft** (`#fef2f2`): Danger-state backgrounds.
- **Success** (`#10b981`): Positive signals, checkmarks, low-risk states.

### Named Rules
**The One Accent Rule.** Safety orange should be the only saturated accent on any given screen. Amber appears only inside gradients paired with orange. No competing blues, greens, or purples as accents.

**The Cool Ground Rule.** The body background stays cool and neutral (`#f8fafc`). Warmth is carried by the orange accent and the friendly rounded shapes, not by a cream or beige page background.

## 3. Typography

**Display & Body Font:** Plus Jakarta Sans (`var(--font-jakarta)`, `ui-sans-serif`, `system-ui`, sans-serif)

**Character:** A modern geometric sans with enough warmth to feel approachable at large sizes. Tight but not cramped tracking on display type keeps headlines energetic without shouting.

### Hierarchy
- **Display** (800 weight, `clamp(2.5rem, 6vw, 4rem)`, line-height 1.1, letter-spacing -0.02em): Hero headlines only. One or two lines, max.
- **Headline** (700 weight, `clamp(1.75rem, 4vw, 2.5rem)`, line-height 1.2, letter-spacing -0.01em): Section headings.
- **Title** (600 weight, 1.125rem, line-height 1.3): Card headings, feature titles, table captions.
- **Body** (400 weight, 1rem, line-height 1.625): Prose and explanations. Max line length 65–75ch.
- **Label** (600 weight, 0.875rem, letter-spacing 0.05em, uppercase): Eyebrows, table headers, chip text.

### Named Rules
**The One Typeface Rule.** Plus Jakarta Sans carries every role. Weight and size provide hierarchy; no second font is needed or used.

**The Readable Prose Rule.** Body copy is set in ink-primary (`#0f172a`) on white or cool-paper backgrounds. Muted body text is permitted in ink-secondary (`#64748b`) only for captions and metadata, never for long passages.

## 4. Elevation

The system is **clean and layered**. Depth is communicated through a combination of light borders, tonal background shifts, and small shadows. Surfaces are not flat for flatness's sake, but they never feel heavy.

### Shadow Vocabulary
- **Resting shadow** (`box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05)`): Default card shadow (`shadow-sm`). Barely perceptible; adds a subtle edge of depth.
- **Hover lift** (`box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)`): Applied on card hover along with a small translateY. Creates responsive depth without dramatic elevation.

### Named Rules
**The Border-First Rule.** Prefer a light `safety-orange-lighter` (`#ffedd5`) border to create separation before adding shadow. Shadow is a secondary layer, not the primary structure.

## 5. Components

### Buttons
- **Shape:** Fully rounded pill (`rounded-full`, 9999px).
- **Primary:** Gradient background (`safety-orange` to amber-500 `#f59e0b`), white text, padding 12px 24px, font-weight 600. Used for the main CTA on every section.
- **Hover / Focus:** `transform: translateY(-2px)`, shadow lift, transition 200ms ease-out. Focus ring uses the primary accent.
- **Secondary:** White background, `safety-orange-lighter` border (`#ffedd5`), ink-tertiary text. Used for lower-priority actions like "Try the live demo".

### Cards / Containers
- **Corner Style:** 12px radius (`rounded-lg`).
- **Background:** White (`#ffffff`).
- **Border:** 1px solid `safety-orange-lighter` (`#ffedd5`).
- **Shadow:** Resting `shadow-sm`; hover lift on interactive cards.
- **Internal Padding:** 24px (`spacing.lg`).

### Chips
- **Style:** `safety-orange-lightest` (`#fff7ed`) background, `safety-orange` (`#ea580c`) text, 1px `safety-orange-lighter` border.
- **Shape:** Pill (`rounded-full`), padding 4px 10px, uppercase label text.
- **Use:** Signal names, risk tags, category labels.

### Inputs / Fields
- **Style:** White background, 1px slate-200 border, 8px radius, padding 12px 16px.
- **Focus:** Ring-2 ring-offset-2 using the safety-orange accent.
- **Typography:** Body size, ink-primary text.

### Navigation
- **Style:** Sticky top bar, white/90% background with backdrop blur, 1px bottom border in slate-200.
- **Logo:** Shield icon in a rounded-square gradient badge.
- **Links:** Ink-secondary by default, safety-orange on hover, 600 weight for CTAs.
- **Mobile:** Collapses to a hamburger or simplified layout on small screens (not yet implemented; keep nav compact and touch-friendly).

### Hero Warning Card
- **Signature component:** A preview of the extension's warning overlay, shown in the hero.
- **Style:** White card with 12px radius, light border, and a subtle 3D perspective tilt. Red danger badge for the risk score, mono signal chips, and a clear explanation paragraph.
- **Purpose:** Lets visitors see the product's core moment without installing anything.

## 6. Do's and Don'ts

### Do:
- **Do** use Safety Orange (`#ea580c`) as the only saturated accent on any screen.
- **Do** keep body text in Ink Primary (`#0f172a`) for readability; use Ink Secondary (`#64748b`) only for captions and metadata.
- **Do** use 12px radius for cards and `rounded-full` for buttons and chips.
- **Do** prefer light `safety-orange-lighter` borders before adding shadow.
- **Do** surface the architecture and business case as readable, evidence-driven sections.
- **Do** keep the landing page scannable: one clear claim per section, then proof.

### Don't:
- **Don't** use enterprise fintech dashboard patterns — dense grids, tiny type, or navy-and-gold "trust" palettes.
- **Don't** use alarmist cybersecurity visuals — red-black urgency, skull icons, or fear-driven copy.
- **Don't** use generic SaaS landing-page clichés — cream backgrounds, identical icon-card grids, gradient-text heroes, or tiny uppercase eyebrows on every section.
- **Don't** over-polish with floating gradients, excessive motion, or copy that promises more than the product delivers.
- **Don't** use side-stripe borders greater than 1px as a colored accent on cards or alerts.
- **Don't** pair a 1px border with a wide soft shadow on the same element for decorative effect.
- **Don't** use border-radius larger than 16px on cards or sections.
