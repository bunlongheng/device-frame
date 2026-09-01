# Device Frame

A tiny Chrome (MV3) extension that wraps the **current tab** in a realistic device bezel - iPhone, iPad, Pixel, Galaxy - so you can see any page as if it were running on a phone or tablet, right on top of the live page.

Click the toolbar icon once to frame the tab, click again to clear it. No new tab, no separate window - a full-screen studio overlay drops over the current page with the site rendered inside the device at its real logical resolution.

## Features

- **Live tab, framed** - the page you are on, shown inside a device body.
- **8 device presets** - iPhone 15 Pro / Pro Max, iPhone 14, iPhone SE, Pixel 8, Galaxy S24, iPad Pro 11", iPad Mini. Each with the correct logical viewport (e.g. `393 × 852`) and a matching bezel (dynamic island, notch, punch-hole, or home button).
- **Rotate** portrait / landscape.
- **Reload** the framed page without leaving the overlay.
- **Auto fit-to-screen** scaling - the device always fits your window and rescales on resize.
- **Esc** to exit.
- On-demand injection (`activeTab` + `scripting`) - nothing runs on any page until you click the icon.

## Install (unpacked)

1. Open `chrome://extensions`.
2. Toggle **Developer mode** on (top right).
3. Click **Load unpacked** and select this folder.
4. Pin **Device Frame** to the toolbar.
5. Open any page and click the icon.

## How it works

- `background.js` listens for the toolbar-icon click and injects `overlay.css` + `overlay.js` into the active tab on demand.
- `overlay.js` builds a full-screen overlay containing a CSS-drawn device bezel and an `<iframe>` pointed at the current tab's URL, then scales the device to fit the window.
- Re-injection (a second click) toggles the overlay off.

## Limitation

Some sites refuse to be embedded in an iframe (`X-Frame-Options: DENY` or a `frame-ancestors` CSP), so their frame will be blank - the overlay shows a note when that happens. Your own dev sites, `localhost`, and any site that allows embedding will render normally.

## License

MIT (c) Bunlong Heng
