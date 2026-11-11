# Echo

## UI components

Always use shadcn/ui for interface controls and feedback, including buttons, inputs, selects, dialogs and toasts (Sonner). Before adding one, reuse the installed component in `src/components/ui`; if missing, add it with the official `shadcn` CLI using this repository's `components.json`.

Adapt shadcn components to Echo's tokens, accessibility and icon rules. Build application-specific compositions from these components. Do not create a parallel UI primitive or bypass the shadcn wrapper to use a lower-level library in application screens. If shadcn has no suitable component, explain the gap and obtain approval before implementing a custom primitive.

## Agent skills

### Icons

Before creating screens that use icons or adding icons, read and follow the `soft-icons` skill. Create custom editable SVG icons for Echo according to the icon commitment in `PRODUCT.md`, including its validation requirements.

### Issue tracker

Before creating, reading, or updating planning issues, follow the GitHub Issues conventions in `docs/agents/issue-tracker.md`.

### Triage labels

Before triaging implementation issues, use the five default roles in `docs/agents/triage-labels.md`. Wayfinder maps and decision tickets carry only `wayfinder:` labels.

### Domain docs

Before exploring or changing domain behavior, read the single-context glossary and relevant architecture decisions as described in `docs/agents/domain.md`.
