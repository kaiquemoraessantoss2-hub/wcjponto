---
name: Industrial Precision
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#5b403d'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#8f706c'
  outline-variant: '#e4beba'
  surface-tint: '#b91d20'
  primary: '#a20513'
  on-primary: '#ffffff'
  primary-container: '#c62828'
  on-primary-container: '#ffe0dd'
  inverse-primary: '#ffb4ac'
  secondary: '#546067'
  on-secondary: '#ffffff'
  secondary-container: '#d7e4ec'
  on-secondary-container: '#5a666d'
  tertiary: '#39535e'
  on-tertiary: '#ffffff'
  tertiary-container: '#516b77'
  on-tertiary-container: '#cfebf9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb4ac'
  on-primary-fixed: '#410003'
  on-primary-fixed-variant: '#93000e'
  secondary-fixed: '#d7e4ec'
  secondary-fixed-dim: '#bbc8d0'
  on-secondary-fixed: '#111d23'
  on-secondary-fixed-variant: '#3c494f'
  tertiary-fixed: '#cbe7f5'
  tertiary-fixed-dim: '#afcbd8'
  on-tertiary-fixed: '#021f29'
  on-tertiary-fixed-variant: '#304a55'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Work Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Work Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  stack-sm: 4px
  stack-md: 12px
  stack-lg: 24px
---

## Brand & Style
The design system is engineered for high-stakes, heavy-duty environments where clarity, speed of recognition, and structural integrity are paramount. The brand personality is utilitarian, resilient, and authoritative. 

The aesthetic blends **Modern Industrialism** with **Functional Minimalism**. It prioritizes a "built-to-last" feel, utilizing heavy verticality, deliberate visual hierarchy, and a systematic approach to density. The UI should evoke the feeling of a high-end control panel or a precision-engineered tool—omitting decorative fluff in favor of high-contrast legibility and mechanical order.

## Colors
The palette is anchored by a **Strong Industrial Red**, specifically chosen for its association with power, urgency, and high-visibility safety standards. 

- **Primary Red (#C62828):** Used for critical actions, status indicators, and key branding elements.
- **Secondary Steel (#263238):** A deep, cold navy-grey used for structural elements like headers and navigation sidebars to provide a grounded, weighted feel.
- **Neutrals:** A scale of cool grays that mimic machined aluminum and steel. 

The color mode is primarily light for high-glare environments, utilizing high-contrast text to ensure accessibility in industrial settings.

## Typography
The typography system uses a tri-font approach to maximize functional distinction:
- **Hanken Grotesk** for headlines provides a sharp, contemporary, and engineered look.
- **Work Sans** for body copy ensures high legibility and a grounded, professional tone across long-form data.
- **JetBrains Mono** for labels and technical data evokes a terminal-like precision, making alphanumeric strings and sensor readings easier to parse at a glance.

Type scales are generous to accommodate users in active environments who may be viewing screens at an arm's length.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy on desktop (1280px max-width) to maintain a rigid, machine-like structure. 

- **Grid Model:** 12-column system with 24px gutters.
- **Spacing Rhythm:** All spacing is derived from an 8px base unit. 
- **Reflow:** On mobile, the layout collapses to a single column with 16px side margins. Tablets utilize an 8-column grid.

Alignment should always be strict; elements should feel "locked" into the grid to reinforce the sense of stability and reliability.

## Elevation & Depth
Depth in the design system is conveyed through **Tonal Layers** and **Low-Contrast Outlines** rather than soft shadows. This mimics the physical layering of hardware components.

- **Level 0 (Floor):** Neutral background (#F5F5F5).
- **Level 1 (Card/Container):** Pure white surface with a 1px solid border (#E1E2E5).
- **Interactive States:** When hovered or active, elements do not "float" with shadows; instead, they change border-weight or utilize a subtle primary-tinted inner glow to indicate engagement.
- **Overlays:** Modals use a heavy 60% neutral-black scrim to completely isolate the task at hand.

## Shapes
The shape language is **Soft (0.25rem)**. This slight rounding provides just enough modern refinement to prevent the UI from looking dated or hostile, while maintaining the "hard-edged" industrial aesthetic. 

Large containers and cards use the standard `rounded` (0.25rem), while system-critical alerts or high-priority buttons may use `rounded-none` to signify a break in the standard flow and demand immediate attention.

## Components
- **Buttons:** High-priority buttons use the Primary Red background with white text. They should have a "thick" appearance (vertical padding 12px+). Secondary buttons use a heavy 2px outline of the Secondary Steel color.
- **Input Fields:** Use a 1px steel border that thickens to 2px Primary Red on focus. Labels must always use the JetBrains Mono font for a technical feel.
- **Chips:** Rectangular with minimal rounding (2px). Use for status codes or equipment tags. Backgrounds are tonal (e.g., light gray for "Inactive", primary red for "Critical").
- **Cards:** No shadows. Defined by a 1px border and a 4px "accent bar" on the left side using the Primary color to denote category or status.
- **Lists:** High-density rows with subtle dividers. Every third row uses a slight gray tint to improve scanability of dense data tables.
- **Checkboxes:** Squared off (0px radius) to emphasize the industrial, mechanical nature of the system.