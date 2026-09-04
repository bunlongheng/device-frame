# Contributing to Emulator

Thanks for helping out. This is a small, dependency-light Chrome MV3 extension - keep it that way.

## Setup

```bash
npm install     # Playwright + ESLint (dev only; the extension itself ships zero runtime deps)
```

Load the unpacked extension from `chrome://extensions` (Developer mode -> Load unpacked -> this folder).

## Develop

Iterate on the frames without reloading the extension, using the preview harness:

```bash
python3 -m http.server 8099
# http://localhost:8099/preview/preview.html?d=iphone   (&o=land to rotate, &src=<url> for any page)
```

## Before you open a PR

```bash
npm run lint    # ESLint must pass
npm test        # renders every device bezel in headless Chromium and asserts the bezel loaded
```

Both run in CI on every push and PR (`.github/workflows/ci.yml`); a PR that fails either will not be merged.

## House rules

- **All styling lives in `overlay.css`.** Do not inline styles in `overlay.js` except for values computed at runtime (per-frame geometry).
- **Adding a device?** Add one entry to the `DEVICES` array in `overlay.js`. For a photoreal frame, drop the PNG in `frames/` (transparent screen hole) and give exact insets (`ox, oy, sw, sh`); for a drawn one, use the CSS `type`. Then add it to the list in `tests/verify-frames.mjs` so it is covered.
- **No new runtime dependencies.** The extension is plain JS/CSS on purpose.
- Match the existing code style; plain hyphens only in copy.
