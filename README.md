# Device Frame

A tiny Chrome (MV3) extension that wraps the **current tab** in a realistic device bezel - iPhone, iPad, Pixel, Galaxy - so you can see any page as if it were running on a phone or tablet, right on top of the live page.

Click the toolbar icon once to frame the tab, click again to clear it. No new tab, no separate window - a full-screen studio overlay drops over the current page with the site rendered inside the device at its real logical resolution.

## Features

- **Live tab, framed** - the page you are on, shown inside a device body.
- **Photoreal Apple frames** - real high-resolution device PNGs (the same frames from the `frames` app), with the live site composited into the transparent screen area using exact per-frame insets:
  - **iPhone 17 Pro Max** (1470×3000 frame), **iPad Pro 13" (M4)** portrait + landscape, **MacBook**, **iMac 24"**, **Studio Display**.
  - These stay crisp because the frame is a high-res PNG downscaled to fit, and the site renders at its true logical viewport then scales to fill the screen.
- **Drawn (vector) frames** for devices without a photoreal asset: iPhone SE, iPhone 5, Pixel 8, Galaxy S24, Galaxy Z Fold, Apple Watch Ultra.
- **iOS status bar** on the iPhone/iPad frames (9:41, cellular, Wi-Fi, battery) with a legibility scrim behind it and a **dark/light toggle** so it stays readable over any page.
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

## Framing sites that normally block embedding

Most sites send `X-Frame-Options` or a CSP `frame-ancestors` header that stops them being put in an `<iframe>` (e.g. `bunlongheng.com` sends `SAMEORIGIN`, GitHub sends `DENY`). Like Responsive Viewer / Responsively / Sizzy, this extension removes those response headers so the real site loads inside the device.

It does this with a **declarativeNetRequest session rule** scoped tightly:

- only on **`sub_frame`** requests (the device iframe), never the top-level page;
- only on the **single tab** you framed (`condition.tabIds`);
- only **while the overlay is open** - the rule is added on open and removed on close (and if the tab is closed).

So normal browsing keeps its clickjacking protection; the headers are only relaxed for the page you are actively framing. The blocked-page note remains as a fallback for the rare site that busts framing another way.

## License

MIT (c) Bunlong Heng
