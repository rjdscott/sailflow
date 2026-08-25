# Scope contract

- **Surfaces in scope:** Race screen (`src/ui/screens/Race.svelte`, `src/ui/race/**`), Dock screen (`src/ui/screens/Dock.svelte`, `src/ui/dock/**`), shared primitives (`src/ui/components/**`, `src/ui/tokens.css`, `src/app.css`).
- **Out of scope:** Log, Drills, More screens; physics in `src/core`; PWA shell.
- **Lens:** UX + UI excellence. Two personas judged equally: (1) Yachtmaster moving to J/70 one-design, studying on desktop before regattas; (2) beginner on a phone.
- **Commit:** `0b5a923`.
- **Method:** fan-out, six lenses (advanced-desktop, beginner-phone, visual-design, a11y-interaction, competitor-benchmark, workflow-honesty) on Opus, one adversarial refuter per High/Critical on Opus, synthesis by Fable. Evidence screenshots in `evidence/` taken on a 1440×900 desktop window and a 390 px iframe harness against the dev server at this commit.
