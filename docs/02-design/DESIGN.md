---
name: Sentinel Scam Shield
description: A browser extension that warns people before they send money to a likely scam.
colors:
  void: "#0a0a0a"
  void-soft: "#111111"
  void-lift: "#141414"
  void-hover: "#1a1a1a"
  ink: "#171717"
  ink-light: "#262626"
  ink-lighter: "#404040"
  milk: "#f5f5f5"
  milk-dim: "#d4d4d4"
  milk-muted: "#a3a3a3"
  milk-faint: "#737373"
  flame: "#f97316"
  flame-deep: "#ea580c"
  danger: "#ef4444"
  success: "#22c55e"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3rem, 7vw, 5rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.08em"
rounded:
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.25rem"
  2xl: "1.5rem"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "80px"
components:
  button-primary:
    backgroundColor: "{colors.flame}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "14px 32px"
  button-primary-hover:
    backgroundColor: "{colors.flame-deep}"
  button-secondary:
    backgroundColor: "{colors.void-lift}"
    textColor: "{colors.milk}"
    rounded: "{rounded.full}"
    padding: "14px 32px"
  card:
    backgroundColor: "{colors.void-lift}"
    textColor: "{colors.milk}"
    rounded: "{rounded.2xl}"
    padding: "28px"
  chip:
    backgroundColor: "rgba(249, 115, 22, 0.1)"
    textColor: "{colors.flame}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
---

# Design System: Sentinel Scam Shield

## 1. Overview

**Creative North Star: "The Engine Room Door"**

Sentinel's visual system is a dark, technical surface with the warmth of a human guardrail. The interface feels premium and intentional — like a finely made tool — while the real machinery stays visible through honest data, signal tables, and direct architecture. The design says: *this is built, this is understandable, and you can try it now.*

The atmosphere is **confident and calm**, not alarmist. A near-black void is the default ground, warm off-white text provides clarity, and safety orange appears only where it needs to command attention. Generous vertical space and large editorial type give every section room to breathe. Cards are dark, bordered, and quietly lifted — never white or shadow-heavy.

**Key Characteristics:**
- Dark void ground (#0a0a0a) with warm neutral text.
- Safety orange as a rare, high-signal accent.
- Large, tight display type for editorial impact.
- Generous whitespace and clear vertical rhythm.
- Honest technical depth surfaced through tables and data.
- No gradient text, no generic SaaS card grids, no tiny uppercase eyebrows.

## 2. Colors

The palette is built around a near-black void with one warm functional accent. Secondary text lives in warm grays so the page never feels cold or sterile.

### Primary
- **Flame** (`#f97316`): The brand's primary action and emphasis color. Used for primary CTAs, highlighted figures, and signal names. Rare by design.
- **Flame Deep** (`#ea580c`): Hover and active state for flame elements.

### Neutral
- **Void** (`#0a0a0a`): The default body background. Deep, neutral, and unobtrusive.
- **Void Soft** (`#111111`): Subtle section alternation background.
- **Void Lift** (`#141414`): Card and elevated surface background.
- **Void Hover** (`#1a1a1a`): Hover state for void-lift surfaces.
- **Ink** (`#171717`): Deep surface for borders and separators.
- **Ink Light** (`#262626`): Border color for cards and tables.
- **Ink Lighter** (`#404040`): Stronger borders and dividers.

### Text
- **Milk** (`#f5f5f5`): Primary headings and body text on dark grounds.
- **Milk Dim** (`#d4d4d4`): Secondary body text and explanations.
- **Milk Muted** (`#a3a3a3`): Captions, metadata, and tertiary content.
- **Milk Faint** (`#737373`): Subtle labels and table headers.

### Functional
- **Danger** (`#ef4444`): Warning states and high-risk indicators.
- **Success** (`#22c55e`): Positive confirmations and checkmarks.

### Named Rules
**The One Accent Rule.** Flame orange should be the only saturated accent on any given screen. Its rarity is the point.

**The Void-First Rule.** Surfaces start at #0a0a0a. Elevated cards sit at #141414. Only use white (#ffffff) for text and small inverse accents, never as a card background.

## 3. Typography

**Display & Body Font:** Plus Jakarta Sans (`var(--font-jakarta)`, `ui-sans-serif`, `system-ui`, sans-serif)

**Character:** A modern geometric sans with enough warmth to feel approachable at large sizes. Tight tracking on display type keeps headlines energetic without becoming cramped.

### Hierarchy
- **Display** (800 weight, `clamp(3rem, 7vw, 5rem)`, line-height 1.05, letter-spacing -0.03em): Hero headlines. One or two lines, max.
- **Headline** (800 weight, `clamp(2rem, 4vw, 3rem)`, line-height 1.1, letter-spacing -0.02em): Section headings. Often split across two lines for rhythm.
- **Title** (600 weight, 1.25rem, line-height 1.3): Card headings and feature titles.
- **Body** (400 weight, 1.125rem, line-height 1.6): Prose and explanations. Max line length 65–75ch.
- **Label** (600 weight, 0.75rem, letter-spacing 0.08em, uppercase): Tags, signal chips, and small metadata.

### Named Rules
**The One Typeface Rule.** Plus Jakarta Sans carries every role. Weight and size provide hierarchy; no second font is needed or used.

**The Readable Prose Rule.** Long body copy is set in milk (#f5f5f5). Muted text (#a3a3a3) is permitted only for captions and metadata, never for paragraphs.

## 4. Elevation

The system is **flat by default, subtly lifted on interaction**. Depth is communicated through tonal layering (#0a0a0a → #111111 → #141414) and thin borders, not drop shadows.

### Shadow Vocabulary
- **Resting lift** (`box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5)`): Used sparingly on prominent cards like the hero warning card and pricing highlight. Always paired with a visible border.
- **Ambient glow** (`box-shadow: 0 0 80px rgba(249, 115, 22, 0.15)`): Decorative flame glow behind hero visuals; not structural.

### Named Rules
**The Border-First Rule.** Prefer a thin ink-light (#262626) border to create separation before adding shadow. Shadow is a secondary accent, not the primary structure.

## 5. Components

### Buttons
- **Shape:** Fully rounded pill (`rounded-full`).
- **Primary:** Flame (#f97316) background, white text, padding 14px 32px, font-weight 600.
- **Hover:** Slight upward translate (-2px), background shifts to flame-deep (#ea580c).
- **Secondary:** Void-lift (#141414) background, milk text, ink-lighter border. Hover brightens border and background.

### Cards / Containers
- **Corner Style:** 1.5rem radius (`rounded-3xl`) for major cards; 1rem for smaller tiles.
- **Background:** Void-lift (#141414).
- **Border:** 1px solid ink-light (#262626).
- **Hover:** Border lightens to milk-faint (#737373) or flame/30 for accent cards.
- **Internal Padding:** 28px for major cards, 24px for smaller tiles.

### Chips
- **Style:** Flame at 10% opacity background, flame text, 1px border at 20% opacity.
- **Shape:** Pill (`rounded-full`), padding 6px 12px, uppercase label text.
- **Use:** Signal names, risk tags, category labels.

### Inputs / Fields
- **Style:** Void-lift background, 1px ink-lighter border, 0.75rem radius, padding 12px 16px.
- **Focus:** Flame ring (2px offset).
- **Typography:** Body size, milk text.

### Navigation
- **Style:** Fixed top bar, void/80 background with backdrop blur, 1px bottom border in ink-light/50.
- **Logo:** Shield icon in a rounded-square flame badge.
- **Links:** Milk-muted by default, milk on hover.
- **CTA:** Flame pill button.

### Hero Warning Card
- **Signature component:** A preview of the extension's warning overlay.
- **Style:** Void-lift card with rounded-3xl corners, thin border, subtle top gradient line, and a soft flame glow behind it. Red danger badge for the risk score, mono flame chips for signals.
- **Purpose:** Lets visitors see the product's core moment without installing anything.

## 6. Do's and Don'ts

### Do:
- **Do** use Void (#0a0a0a) as the default background.
- **Do** use Milk (#f5f5f5) for primary text and Flame (#f97316) as the only saturated accent.
- **Do** use large, tight display type for hero and section headings.
- **Do** use thin ink-light borders to define cards and sections.
- **Do** surface technical depth through honest tables, signal lists, and data.
- **Do** keep the landing page scannable: one clear claim per section, then proof.
- **Do** support `prefers-reduced-motion` by disabling animations.

### Don't:
- **Don't** use white card backgrounds or light gray section backgrounds.
- **Don't** use gradient text or decorative gradient backgrounds.
- **Don't** use tiny uppercase eyebrows above every section.
- **Don't** use identical icon-card grids repeated endlessly.
- **Don't** use alarmist red-black urgency visuals or fear-driven copy.
- **Don't** use generic SaaS landing-page clichés — cream backgrounds, navy-and-gold trust palettes, or floating gradient orbs.
- **Don't** use side-stripe borders greater than 1px as a colored accent.
- **Don't** pair a 1px border with a wide soft shadow on the same element for decorative effect.
- **Don't** use border-radius larger than 1.5rem on major cards.
