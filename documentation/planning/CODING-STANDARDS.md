# Coding Standards

## 1. Project Layout

- Top-level:
  - `index.html` – single-page shell.
  - `src/` – all source code.
    - `src/main.ts` – app entrypoint.
    - `src/main.css` – global styles (including theme).
    - `src/components/` – UI components.
    - `src/lib/` – logic, utilities, helpers (no DOM).
    - `src/types/` – shared TypeScript types.
    - `src/tests/` – tests (mirrors structure of `src/` where possible).
- Keep HTML, CSS, and TS in **separate files**. No large inline `<style>` or `<script>` blocks.

## 2. Tooling & Targets

- Target **modern evergreen browsers only** (current Chrome, Edge, Firefox, Safari).
- TypeScript:
  - Prefer `strict` mode if reasonable; otherwise keep types helpful for linting and refactors.
  - Use **ES modules** with **named exports**.
- Lint/format:
  - **ESLint + Prettier**.
  - Use **double quotes** where possible.
  - Always use **semicolons**.
  - Max line length: **120 characters** (enforced by Prettier/ESLint).
- Testing:
  - Prepare for tests using **Vitest** (or similar). New logic in `src/lib/` should be trivially testable.

## 3. HTML

- Use **vanilla, modern HTML**.
- Keep the HTML structure simple and semantic:
  - Prefer `<main>`, `<section>`, `<header>`, `<footer>`, `<button>`, `<nav>`, etc.
- No framework templates by default (no React/JSX/etc.) unless explicitly introduced for a project.
- DOM nodes may include classes and `data-*` attributes for JS hooks; avoid binding JS by `id` when classes are clearer.

## 4. CSS & Design

- Use **plain modern CSS** with CSS variables.
- Global CSS:
  - `src/main.css` defines:
    - Theme colors.
    - Spacing scale.
    - Border radius scale.
    - Shadow styles.
    - Transition defaults.
- Theme guidelines:
  - Default to a **medium-dark theme**.
  - Use borders and shadows to create a **sense of depth**.
  - Use **smooth transitions** (opacity, small transforms, blur) for hover/focus/enter/exit states.
  - Frosted-glass effects (background blur, semi-transparent layers) are encouraged when appropriate.
- Fonts & typography:
  - **Do not hard-code specific font stacks here.**
  - Expose fonts via CSS custom properties (e.g. `--font-sans`, `--font-mono`).
  - **Project-specific font choices** live in a separate design/theming doc (e.g. `DESIGN.md`).

## 5. TypeScript

- Use TypeScript for all non-trivial JS.
- Organize code:
  - **DOM-related code** (event wiring, UI state) can live in `src/main.ts` or small modules in `src/components/`.
  - **Pure logic** (data transforms, calculations, business rules) must live in `src/lib/` and not touch the DOM.
- Prefer:
  - Small, **single-responsibility functions**.
  - Functions that are **easy to unit-test** (pure where possible).
- Imports:
  - Use **named exports**.
  - Path aliases are allowed (e.g. `@lib/foo` instead of `../../lib/foo`) and preferred for clarity.

## 6. Software Design Practices

- **DRY** (Don’t Repeat Yourself):
  - Factor repeated patterns into functions, helpers, or small components.
- **Separation of Concerns**:
  - Keep view code (DOM/HTML/CSS) separate from logic (TS in `src/lib/`).
  - Keep state & side-effects grouped and explicit.
- Patterns:
  - Use simple, well-known patterns only when they **clearly improve clarity** (e.g. small modules, basic pub/sub, strategy).
  - Avoid over-engineering on PoCs, but keep the structure ready to grow (no giant “god modules”).

## 7. Tests

- For any non-trivial logic in `src/lib/`:
  - Add or at least **prepare for** unit tests in `src/tests/`.
  - Tests should import from the same public interfaces used by the rest of the app.
- Prefer:
  - Focused, fast tests for core logic.
  - Clear naming: `something.spec.ts` or `something.test.ts`.

## 8. Working With LLMs

When asking an LLM to change or add code in this repo:

- Assume the above standards by default.
- Generate:
  - Vanilla HTML (no frameworks) unless the project explicitly uses one.
  - CSS in `src/main.css` or small additional CSS files, not inline.
  - TypeScript with:
    - Named exports.
    - Functions that are testable and single-purpose.
- Respect the 120-character line width and formatting rules (ESLint + Prettier).
- Keep PoC code **simple**, but not throwaway—write it so it can be evolved into production.

For more details on how to prompt LLMs for this project, see `PROMPTING.md`.