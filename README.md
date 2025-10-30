## create-sofast-extension

Scaffold a Sofast extension UI project with Vite, supporting React, Vue, or no framework.

Usage

```bash
npm create sofast-extension
```

What you get

- UI build via `vite.config.ts` (base `./`, single bundle, `outDir: dist`).
- `package.json` with top-level `commands` manifest, and dev/build/preview scripts.

Templates

- File-based templates live under `extensions/create_extension/templates`:
  - `common/`: shared files (e.g., `vite.worker.config.ts.tpl`, with `__EXT__` placeholder).
  - `common-ts/` and `common-js/`: language-specific shared files (e.g., worker sample).
  - `<framework>/<ts|js>/`: React/Vue/Empty UI templates and configs.

Placeholders

- `__EXT__`: replaced with `ts` or `js`.
- `__PKG_NAME__`: replaced with the package/directory name.
- `__DISPLAY_NAME__`: replaced with the human-friendly title (defaults to Title Case of package name, or provided via `--title`).
- `__UI_ENTRY__`: replaced with the UI entry file (defaults to `index.html`).
- `__FRAMEWORK__`: replaced with the chosen framework id.

Tailwind option

- Flags: `--tailwind` or `--no-tailwind` (interactive when omitted).
- Default: Yes.
- When enabled:
  - Adds `@tailwindcss/vite` and `tailwindcss` deps.
  - Populates Vite `plugins` with `tailwindcss()` via template placeholders.

Notes

- The scaffold does not include `@sofast/api` dependency in the template by default (package not yet published). Add it yourself when needed.
