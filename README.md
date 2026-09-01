# Device Frame

A tiny Chrome (MV3) extension that wraps the **current tab** in a realistic device bezel - iPhone, iPad, Pixel, Galaxy - so you can see any page as if it were running on a phone or tablet, right on top of the live page.

Click the toolbar icon once to frame the tab, click again to clear it. No new tab, no separate window - a full-screen studio overlay drops over the current page with the site rendered inside the device at its real logical resolution.

## Features

- **Live tab, framed** - the page you are on, shown inside a device body.
- **15 device frames**, each with the correct logical viewport and its own drawn bezel:
  - **iPhone** - 17 Pro Max, 15 Pro Max, 15 Pro, 14, SE, and the classic iPhone 5 (dynamic island / notch / home button as appropriate).
  - **iPad** - Pro 13" (M4), Pro 11", Mini.
  - **Android** - Galaxy Z Fold (open, with hinge crease), Pixel 8, Galaxy S24.
  - **Mac** - MacBook Pro 14" (M4) with keyboard deck + notch, Studio Display with aluminium stand.
  - **Watch** - Apple Watch Ultra with bands + digital crown.
- **Custom size** - pick "Custom size…" and type any width × height.
- **Download PNG (with the frame baked in)** - exports the framed device as a transparent-cornered PNG. Uses `captureVisibleTab`, so it captures rendered pixels and works even on cross-origin pages, then crops to the device.
- **Rotate** portrait / landscape (phones, tablets, fold, and custom).
- **Reload** the framed page without leaving the overlay.
- **Auto fit-to-screen** scaling - the device always fits your window and rescales on resize.
- **Esc** to exit.
- Every bezel is **vector-drawn** (CSS), so it stays pristine at any export size - no bitmap frames to pixelate.
- On-demand injection (`activeTab` + `scripting`) - nothing runs on any page until you click the icon.

> Desktop-class frames (MacBook, Studio Display) are larger than most screens, so on-screen they fill the window with a thin bezel. Their frame reads best in the **Download PNG** export, which crops to the device regardless of screen size.

## Install (unpacked)

1. Open `chrome://extensions`.
2. Toggle **Developer mode** on (top right).
3. Click **Load unpacked** and select this folder.
4. Pin **Device Frame** to the toolbar.
5. Open any page and click the icon.

## How it works

- `background.js` listens for the toolbar-icon click and injects `overlay.css` + `overlay.js` into the active tab on demand. It also answers the overlay's `df-capture` message with a `captureVisibleTab` screenshot for the PNG export.
- `overlay.js` builds a full-screen overlay containing a CSS-drawn device bezel and an `<iframe>` pointed at the current tab's URL, then scales the device to fit the window.
- Re-injection (a second click) toggles the overlay off.

## Develop without reloading the extension

`preview/preview.html` runs the real overlay against `preview/sample.html`, so you can iterate on the frames from a plain server:

```
python3 -m http.server 8099   # from the repo root
# open http://localhost:8099/preview/preview.html?d=ip17max&o=land
```

`?d=<device-id>` picks the frame and `?o=land` rotates it. (The PNG export is a no-op here - it needs the real extension's background worker.)

## Limitation

Some sites refuse to be embedded in an iframe (`X-Frame-Options: DENY` or a `frame-ancestors` CSP), so their frame will be blank - the overlay shows a note when that happens. Your own dev sites, `localhost`, and any site that allows embedding will render normally.

## License

MIT (c) Bunlong Heng
