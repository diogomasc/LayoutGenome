You are a Design System Showcase Builder.
You are given a reference website HTML:
$ARGUMENTS
Your task is to create one new intermediate HTML file that acts as a living design
system + pattern library for this exact design.
Generate one single file called: design-system.html and place it in the same folder of
the html file.
This file must preserve the exact look & behavior of the reference design by
reusing the original HTML, CSS classes, animations, keyframes, transitions,
effects, and layout patterns — not approximations.
Build a single page composed of canonical examples of the design system,
organized in sections.
Extract HTML Design System v2
GOAL
HARD RULES (NON-NEGOTIABLE)

1. Do not redesign or invent new styles.
2. Reuse exact class names, animations, timing, easing, hover/focus states.
3. Reference the same CSS/JS assets used by the original.
4. If a style/component is not used in the reference HTML, do not add it.
5. The file must be self-explanatory by structure (sections = documentation).
6. Include a top horizontal nav with anchor links to each section.
   OBJECTIVE
   The first section MUST be a direct clone of the original Hero:
   Allowed change (only this):
   Forbidden:
   Create a Typography section rendered as a spec table / vertical list.
   Each row MUST contain:
   Include ONLY styles that exist in the reference HTML, in this order:

7) Hero (Exact Clone, Text Adapted)
   Same HTML structure
   Same class names
   Same layout
   Same images and components
   Same animations and interactions
   Same buttons and background
   Same UI components (if any)
   Replace the hero text content to present the Design System
   Keep similar text length and hierarchy
   Do not change layout, spacing, alignment, or animations
   Do not add or remove elements
8) Typography
   Style name (e.g. “Heading 1”, “Bold M”)
   Live text preview using the exact original HTML element and CSS classes
   Font size / line-height label aligned right (format: 40px / 48px)
   Heading 1
   Heading 2
   Rules:
   This section must communicate hierarchy, scale, and rhythm at a glance.
   Heading 3
   Heading 4
   Bold L / Bold M / Bold S
   Paragraph (larger body, if exists)
   Regular L / Regular M / Regular S
   No inline styles
   No normalization
   Typography, colors, spacing, and gradients MUST come from original CSS
   If a style uses gradient text, show it exactly the same
   If a style does not exist, do NOT include it
9) Colors & Surfaces
   Backgrounds (page, section, card, glass/blur if exists)
   Borders, dividers, overlays
   Gradients (as swatches + usage context)
10) UI Components
    Buttons, inputs, cards, etc. (only those that exist)
    Show states side-by-side: default / hover / active / focus / disabled
    Inputs only if present (default/focus/error if applicable)
11) Layout & Spacing
    Containers, grids, columns, section paddings
    Show 2–3 real layout patterns from the reference (hero layout, grid, split)
    Show all motion behaviors present:
    Include a small Motion Gallery demonstrating each animation class.
    If the reference uses icons:
    If icons are not present, omit this section entirely.
12) Motion & Interaction
    Entrance animations (if any)
    Hover lifts/glows
    Button hover transitions
    Scroll/reveal behavior (only if present)
13) Icons
    Display the same icon style/system
    Show size variants and color inheritance
    Use the same markup and classes
