// Device Frame overlay controller. Injected on toolbar-icon click.
// Re-injection toggles it off, so one click frames, next click clears.
(() => {
  "use strict";

  // Re-injection means "close the frame". Always tear down any existing overlay - even an
  // ORPHAN left after an extension reload, where window.__deviceFrame may be gone but the DOM
  // node remains. Without this, a reload leaves a frame that the X/icon can no longer close.
  const _existing = document.getElementById("device-frame-root");
  if (_existing) {
    try {
      if (window.__deviceFrame && typeof window.__deviceFrame.close === "function") {
        window.__deviceFrame.close();
      } else {
        _existing.remove();
      }
    } catch (_) {
      _existing.remove();
    }
    try { delete window.__deviceFrame; } catch (_) {}
    return;
  }

  // Where the photoreal frame PNGs live. In the real extension that's an extension URL;
  // the preview harness overrides it with __DF_FRAMES.
  const FRAMES_BASE =
    window.__DF_FRAMES ||
    (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL
      ? chrome.runtime.getURL("frames/")
      : "frames/");

  // Two kinds of device:
  //  type:"image"  -> a real high-res PNG frame (fw x fh) with a transparent screen hole.
  //                   The live site renders into the screen rect (ox,oy,sw,sh) and the PNG
  //                   sits on top. `wl` is the logical viewport width the site sees.
  //  type:phone/fold/watch/frame -> a vector (CSS) bezel, for devices we have no PNG for.
  const DEVICES = [
    // --- Apple, real photoreal frames ---
    { id: "iphone", label: "iPhone 17 Pro Max", cat: "Apple - real frames", type: "image", rot: true,
      frame: { file: "iphone.png", fw: 1470, fh: 3000, ox: 75, oy: 217, ot: 67, sw: 1320, sh: 2717, sr: 150,
               sb: { top: 40, h: 108, padX: 108, font: 46, glyph: 40 },
               sf: { h: 300, u: 42 } }, wl: 440 },
    { id: "ipadpro", label: 'iPad Pro 13" (M4)', cat: "Apple - real frames", type: "image", rot: true,
      frame: { file: "ipad-portrait.png", fw: 2245, fh: 2930, ox: 96, oy: 102, sw: 2048, sh: 2732, sr: 44,
               sb: { top: 20, h: 64, padX: 60, font: 30, glyph: 27 } }, wl: 1024,
      frameL: { file: "ipad-landscape.png", fw: 2930, fh: 2245, ox: 102, oy: 101, sw: 2732, sh: 2048, sr: 44,
                sb: { top: 18, h: 60, padX: 60, font: 28, glyph: 25 } }, wlL: 1366 },
    { id: "ipada16", label: "iPad (A16)", cat: "Apple - real frames", type: "image", rot: true,
      frame: { file: "ipad-a16.png", fw: 900, fh: 1019, ox: 202, oy: 41, sw: 656, sh: 938, sr: 28 }, wl: 820 },
    { id: "macbook", label: "MacBook", cat: "Apple - real frames", type: "image", desk: true,
      frame: { file: "macbook.png", fw: 3306, fh: 1897, ox: 373, oy: 123, sw: 2560, sh: 1600, sr: 6 }, wl: 1280 },
    { id: "imac", label: 'iMac 24"', cat: "Apple - real frames", type: "image", desk: true,
      frame: { file: "imac.png", fw: 4880, fh: 5720, ox: 200, oy: 1600, sw: 4480, sh: 2520, sr: 6 }, wl: 1280 },
    { id: "studiodisplay", label: "Studio Display", cat: "Apple - real frames", type: "image", desk: true,
      frame: { file: "apple-display.png", fw: 5520, fh: 4316, ox: 200, oy: 200, sw: 5120, sh: 2880, sr: 6 }, wl: 1440 },
    // --- Drawn bezels for devices we have no PNG for ---
    { id: "zfold",  label: "Galaxy Z Fold (open)",cat: "Drawn", type: "fold",  w: 884, h: 800, cam: "punch", p: [10, 10, 10, 10], out: 20, scr: 8, rot: true, sb: { top: 9, h: 32, padX: 34, font: 17, glyph: 15 } },
    { id: "watch",  label: "Apple Watch Ultra",   cat: "Drawn", type: "watch", w: 184, h: 224, cam: "none",  p: [30, 26, 30, 26], out: 62, scr: 44 },
    // --- Custom ---
    { id: "custom", label: "Custom size…", cat: "Custom", type: "frame", w: 1280, h: 800, cam: "none", p: [10, 10, 10, 10], out: 14, scr: 6, rot: true },
  ];

  const ICONS = {
    rotate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/></svg>',
    reload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 21v-5h5"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    contrast: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none"/></svg>',
    github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.7.5.5 5.8.5 12.3c0 5.2 3.4 9.6 8 11.1.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7 0-.7 0-.7 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.4-5.5-6 0-1.3.5-2.4 1.3-3.2-.2-.3-.6-1.6 0-3.3 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 3 .1 3.3.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 8-5.9 8-11.1C23.5 5.8 18.3.5 12 .5z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2.2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.6l7.4-4.2M8.3 13.4l7.4 4.2"/></svg>',
  };

  const REPO_URL = "https://github.com/bunlongheng/device-frame";

  // iOS status-bar glyphs (cellular, wifi, battery) - inherit color via currentColor.
  const SB_ICONS =
    '<svg class="df-sb-g" viewBox="0 0 20 14" fill="currentColor"><rect x="0" y="9" width="3.2" height="5" rx="1"/><rect x="5.6" y="6.4" width="3.2" height="7.6" rx="1"/><rect x="11.2" y="3.4" width="3.2" height="10.6" rx="1"/><rect x="16.8" y="0.4" width="3.2" height="13.6" rx="1"/></svg>' +
    '<svg class="df-sb-g" viewBox="0 0 18 14" fill="currentColor"><path d="M9 3.2c3 0 5.8 1.2 7.8 3.2l-1.8 1.8C13.4 6.7 11.3 5.8 9 5.8S4.6 6.7 3 8.2L1.2 6.4C3.2 4.4 6 3.2 9 3.2z"/><path d="M9 7.7c1.7 0 3.2.7 4.3 1.7l-1.9 1.9c-.6-.6-1.5-1-2.4-1s-1.8.4-2.4 1L4.7 9.4C5.8 8.4 7.3 7.7 9 7.7z"/><circle cx="9" cy="12.4" r="1.6"/></svg>' +
    '<svg class="df-sb-g df-sb-batt" viewBox="0 0 39 18" fill="none"><rect x="1" y="1.5" width="33" height="15" rx="4.3" stroke="currentColor" stroke-width="1.4" opacity="0.42"/><rect x="3" y="3.5" width="29" height="11" rx="2.6" fill="currentColor"/><path d="M36.4 6.2c1.2.35 1.2 5.25 0 5.6z" fill="currentColor" opacity="0.55"/><text class="df-sb-pct" x="17.5" y="13" text-anchor="middle" font-size="10.5" font-weight="700">100</text></svg>';

  // Safari bottom-chrome glyphs (inherit color via currentColor).
  const SF_ICONS = {
    lock: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a4.2 4.2 0 0 0-4.2 4.2V9H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-.8V6.2A4.2 4.2 0 0 0 12 2zm-2.4 7V6.2a2.4 2.4 0 0 1 4.8 0V9H9.6z"/></svg>',
    reload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2 5.3"/><path d="M20 4v6h-6"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4l-8 8 8 8"/></svg>',
    forward: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4l8 8-8 8"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3.5"/><path d="M8 7l4-4 4 4"/><path d="M6 11.5v7A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5v-7"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.2C10.2 4.7 7.6 4.4 5 5V18.2c2.6-.6 5.2-.3 7 1.3 1.8-1.6 4.4-1.9 7-1.3V5c-2.6-.6-5.2-.3-7 1.2z"/><path d="M12 6.2V19.5"/></svg>',
    tabs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"><rect x="7.5" y="7.5" width="12" height="12" rx="2.8"/><path d="M4.5 16V6.5A2.5 2.5 0 0 1 7 4h9.5"/></svg>',
  };

  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };

  // sbLight = light glyphs on a dark band -> the black iOS status bar (default, matches Safari sim)
  const state = { deviceId: DEVICES[0].id, landscape: false, customW: 1280, customH: 800, sbLight: true };

  // ---- toolbar ----
  const root = el("div", "");
  root.id = "device-frame-root";

  const bar = el("div", "df-bar");
  const brand = el("div", "df-brand", '<span class="df-dot"></span>DEVICE FRAME');

  const select = el("select", "df-select");
  const groups = {};
  DEVICES.forEach((d) => {
    if (!groups[d.cat]) {
      const g = document.createElement("optgroup");
      g.label = d.cat;
      groups[d.cat] = g;
      select.appendChild(g);
    }
    const o = document.createElement("option");
    o.value = d.id;
    o.textContent = d.label;
    groups[d.cat].appendChild(o);
  });

  const dims = el("span", "df-dims", "");

  const custom = el("div", "df-custom");
  const inW = document.createElement("input");
  const inH = document.createElement("input");
  inW.type = inH.type = "number";
  inW.value = state.customW;
  inH.value = state.customH;
  inW.min = inH.min = "80";
  custom.append(inW, el("span", "", "×"), inH);

  const rotateBtn = el("button", "df-btn", ICONS.rotate);
  rotateBtn.title = "Rotate portrait / landscape";
  const sbBtn = el("button", "df-btn", ICONS.contrast);
  sbBtn.title = "Status bar: dark / light";
  const dlBtn = el("button", "df-btn df-dl", ICONS.download);
  dlBtn.title = "Download - PNG (transparent) or WebP";
  const copyBtn = el("button", "df-btn", ICONS.copy);
  copyBtn.title = "Copy image (transparent PNG)";
  const reloadBtn = el("button", "df-btn", ICONS.reload);
  reloadBtn.title = "Reload frame";
  const ghBtn = el("button", "df-btn", ICONS.github);
  ghBtn.title = "View Device Frame on GitHub";
  const shareBtn = el("button", "df-btn", ICONS.share);
  shareBtn.title = "Share - upload and get a public link";
  const closeBtn = el("button", "df-btn df-close", ICONS.close);
  closeBtn.title = "Close (Esc)";

  // reload lives in the Safari bar now (for iPhone); keep it in the toolbar for every other device
  bar.append(brand, el("div", "df-sep"), select, dims, custom, el("div", "df-sep"), rotateBtn, sbBtn, copyBtn, dlBtn, reloadBtn, el("div", "df-sep"), ghBtn, shareBtn, closeBtn);

  // download menu (PNG / WebP) + toast, both docked under the HUD
  const menu = el("div", "df-menu");
  const miPng = el("button", "df-mi", "<b>PNG</b><span>transparent background</span>");
  const miWebp = el("button", "df-mi", "<b>WebP</b><span>HD, small file</span>");
  menu.append(miPng, miWebp);
  const toastEl = el("div", "df-toast");

  // ---- stage + rig ----
  const stage = el("div", "df-stage");
  // Studio backdrop (pure CSS) - only shown for Mac display frames (see .df-desk).
  const backdrop = el("div", "df-backdrop");
  const scaler = el("div", "df-scaler");
  const rig = el("div", "df-rig");

  const bandTop = el("div", "df-band df-band-top");
  const device = el("div", "df-device");
  const lapBase = el("div", "df-lap-base");
  const standNeck = el("div", "df-stand-neck");
  const standFoot = el("div", "df-stand-foot");
  const bandBot = el("div", "df-band df-band-bot");

  const screen = el("div", "df-screen");
  const cam = el("div", "df-cam");
  const home = el("div", "df-home");
  const crown = el("div", "df-crown");
  const crease = el("div", "df-crease");
  const frameImg = document.createElement("img"); // photoreal PNG frame (image devices)
  frameImg.className = "df-frameimg";
  const sbScrim = el("div", "df-sb-scrim"); // legibility scrim behind the status bar
  const statusbar = el("div", "df-statusbar"); // iOS-style status bar for image phones/tablets
  const sbTime = el("span", "df-sb-time", "9:41");
  const sbInd = el("span", "df-sb-ind", SB_ICONS);
  statusbar.append(sbTime, sbInd);

  // ---- Safari bottom chrome (URL pill + toolbar), for image phones with a `sf` config ----
  const safariBar = el("div", "df-safari");
  const sfPill = el("div", "df-sf-pill");
  const sfAa = el("span", "df-sf-aa", 'A<span class="df-sf-aa2">A</span>');
  const sfLock = el("span", "df-sf-lock", SF_ICONS.lock);
  const sfHost = el("span", "df-sf-host", "");
  const sfMid = el("span", "df-sf-mid");
  sfMid.append(sfLock, sfHost);
  const sfReload = el("span", "df-sf-reload", SF_ICONS.reload);
  const sfProg = el("div", "df-sf-prog"); // Safari's blue page-load line under the URL
  sfPill.append(sfAa, sfMid, sfReload, sfProg);
  const sfTools = el("div", "df-sf-tools");
  ["back", "forward", "share", "book", "tabs"].forEach((k) =>
    sfTools.append(el("span", "df-sf-tool", SF_ICONS[k]))
  );
  const sfHome = el("div", "df-sf-home");
  safariBar.append(sfPill, sfTools, sfHome);
  const blocked = el(
    "div",
    "df-blocked",
    "<strong>This page may block embedding</strong><span>Some sites refuse to load inside a frame (X-Frame-Options / CSP). Try one of your own pages or a site that allows it.</span>"
  );
  const iframe = document.createElement("iframe");
  iframe.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
  iframe.allow = "geolocation; microphone; camera; fullscreen; clipboard-read; clipboard-write";

  screen.append(iframe, cam, home, crease, blocked);
  device.append(screen, sbScrim, statusbar, safariBar, crown, frameImg);
  bandTop.style.order = "0"; device.style.order = "1"; lapBase.style.order = "2";
  standNeck.style.order = "3"; standFoot.style.order = "4"; bandBot.style.order = "5";
  rig.append(bandTop, device, lapBase, standNeck, standFoot, bandBot);
  const spinner = el("div", "df-spinner"); // shown behind/over the device while the page loads
  scaler.append(rig);
  stage.append(backdrop, scaler, spinner);

  root.append(bar, menu, stage, toastEl);
  document.documentElement.appendChild(root);

  // ---- rendering ----
  const current = () => {
    const d = DEVICES.find((x) => x.id === state.deviceId) || DEVICES[0];
    if (d.id === "custom") return { ...d, w: state.customW, h: state.customH };
    return d;
  };

  // The logical viewport (what the site "sees") for either device kind.
  function logicalDims(d) {
    if (d.type === "image") {
      // synthesized landscape (rotated portrait frame) -> swap the portrait logical dims
      if (d.rot && state.landscape && !d.frameL) {
        const fr = d.frame;
        return { w: Math.round((fr.sh * d.wl) / fr.sw), h: d.wl };
      }
      const land = d.rot && state.landscape && d.frameL;
      const fr = land ? d.frameL : d.frame;
      const wl = land ? d.wlL : d.wl;
      return { w: wl, h: Math.round((fr.sh * wl) / fr.sw) };
    }
    const land = d.rot && state.landscape;
    return land ? { w: d.h, h: d.w } : { w: d.w, h: d.h };
  }

  let loadTimer = null;

  // Position the status bar + scrim over a screen rect, in whatever coordinate space the
  // caller uses (frame-native px for image devices, logical px for drawn devices).
  function placeStatusBar(ox, oy, sw, sb) {
    if (!sb) {
      statusbar.style.setProperty("display", "none", "important");
      sbScrim.style.setProperty("display", "none", "important");
      return;
    }
    const light = state.sbLight;
    statusbar.style.cssText =
      `display:flex !important;position:absolute !important;box-sizing:border-box !important;` +
      `left:${ox + sb.padX}px !important;top:${oy + sb.top}px !important;` +
      `width:${sw - sb.padX * 2}px !important;height:${sb.h}px !important;` +
      `align-items:center !important;justify-content:space-between !important;` +
      `z-index:5 !important;color:${light ? "#fff" : "#000"} !important;`;
    sbTime.style.setProperty("font-size", sb.font + "px", "important");
    sbInd.style.setProperty("font-size", sb.glyph + "px", "important");
    // battery % number sits inside the battery fill, so it needs the opposite color
    statusbar.style.setProperty("--sb-num", light ? "#000" : "#fff");
    const scrimH = Math.round((sb.top + sb.h) * 1.7);
    const grad = light
      ? "linear-gradient(180deg, rgba(0,0,0,0.42), rgba(0,0,0,0))"
      : "linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0))";
    sbScrim.style.cssText =
      `display:block !important;position:absolute !important;` +
      `left:${ox}px !important;top:${oy}px !important;` +
      `width:${sw}px !important;height:${scrimH}px !important;` +
      `z-index:4 !important;pointer-events:none !important;background:${grad} !important;`;
  }

  // Safari bottom chrome, docked at the screen bottom in frame-native px. Theme follows the
  // status-bar toggle (dark by default) so it reads like the iOS Safari simulator.
  function placeSafariBar(ox, oy, sw, sh, sf, host, secure, r) {
    if (!sf) {
      safariBar.style.setProperty("display", "none", "important");
      return;
    }
    const dark = state.sbLight;
    const top = oy + sh - sf.h;
    const rad = r || 0;
    safariBar.style.cssText =
      `display:flex !important;position:absolute !important;box-sizing:border-box !important;` +
      `left:${ox}px !important;top:${top}px !important;width:${sw}px !important;height:${sf.h}px !important;` +
      `border-radius:0 0 ${rad}px ${rad}px !important;overflow:hidden !important;` +
      `font-size:${sf.u}px !important;z-index:5 !important;`;
    safariBar.style.setProperty("--sf-bg", dark ? "#000000" : "#f6f6f8");
    safariBar.style.setProperty("--sf-pill", dark ? "#2c2c2e" : "#ffffff");
    safariBar.style.setProperty("--sf-text", dark ? "#f5f5f7" : "#1c1c1e");
    safariBar.style.setProperty("--sf-icon", dark ? "#cfcfd4" : "#48484a");
    safariBar.style.setProperty("--sf-dim", dark ? "#8e8e93" : "#8a8a8e");
    safariBar.style.setProperty("--sf-home", dark ? "#ffffff" : "#1c1c1e");
    sfHost.textContent = host || "";
    sfLock.style.setProperty("display", secure ? "inline-flex" : "none", "important");
  }

  function renderImage(d) {
    // Landscape requested but no dedicated landscape frame -> synthesize by rotating the portrait PNG.
    if (d.rot && state.landscape && !d.frameL) return renderImageRotated(d);

    const land = d.rot && state.landscape && d.frameL;
    const fr = land ? d.frameL : d.frame;
    const wl = land ? d.wlL : d.wl;
    const k = fr.sw / wl; // scale the logical iframe up to fill the screen rect
    const sb = fr.sb;
    const zone = sb ? Math.round(sb.top + sb.h) : 0; // status-bar band reserved at top (frame px)
    const sfH = fr.sf ? Math.round(fr.sf.h) : 0; // Safari chrome reserved at bottom (frame px)
    const hl = Math.round((fr.sh - zone - sfH) / k); // logical page height between the two

    rig.setAttribute("data-type", "image");
    // hide every drawn accessory
    [crease, lapBase, standNeck, standFoot, bandTop, bandBot, crown, home, cam].forEach((n) =>
      n.style.setProperty("display", "none", "important")
    );
    // device = the frame canvas, no CSS bezel
    device.style.cssText = `position:relative !important;width:${fr.fw}px !important;height:${fr.fh}px !important;background:none !important;border-radius:0 !important;box-shadow:none !important;padding:0 !important;`;
    // screen = the exact screen rect, clipped to rounded corners so nothing pokes past the bezel.
    // Its background fills the status-bar band (like a native app bar); the iframe sits below it.
    const bandColor = sb ? (state.sbLight ? "#0b0b0c" : "#ffffff") : "transparent";
    // round the BOTTOM corners only (where content used to poke out); the top fills square
    // up under the bezel so there's no black gap / ugly curve behind the status bar.
    const r = fr.sr || 0;
    // Make the iframe a scrollbar-width wider than the screen so the desktop scrollbar lands
    // just past the clipped edge and stays hidden - real devices use space-less overlay bars.
    const SBW = 17;
    // ot = top of the PNG's real screen opening when it sits above oy (iPhone: oy is 150px below
    // the bezel so the status bar clears the island). The screen must cover that cap too, or the
    // island floats on the stage charcoal instead of on the screen. Cap > 0 rounds the top corners.
    const cap = fr.ot != null ? fr.oy - fr.ot : 0;
    const radius = cap ? `${r}px` : `0 0 ${r}px ${r}px`;
    screen.style.cssText = `position:absolute !important;left:${fr.ox}px !important;top:${fr.oy - cap}px !important;width:${fr.sw}px !important;height:${fr.sh + cap}px !important;background:${bandColor} !important;border-radius:${radius} !important;overflow:hidden !important;`;
    iframe.style.cssText = `position:absolute !important;left:0 !important;top:${zone + cap}px !important;width:${wl + SBW}px !important;height:${hl}px !important;border:0 !important;background:${pageBg()} !important;transform-origin:0 0 !important;transform:scale(${k}) !important;`;
    frameImg.style.cssText = ""; // clear any landscape-rotation transform
    frameImg.style.setProperty("display", "block", "important");
    const url = FRAMES_BASE + fr.file;
    if (frameImg.getAttribute("src") !== url) frameImg.src = url;

    if (statusbar.parentNode !== device) device.appendChild(statusbar);
    placeStatusBar(fr.ox, fr.oy, fr.sw, fr.sb);
    // the screen background is the status-bar band now, so the legibility scrim is redundant
    sbScrim.style.setProperty("display", "none", "important");

    // Safari bottom chrome with the framed page's real domain
    const { host, secure } = framedHost();
    placeSafariBar(fr.ox, fr.oy, fr.sw, fr.sh, fr.sf, host, secure, fr.sr);
  }

  // Screen fill behind the framed page. Where the page paints nothing (short body, no html
  // background) this shows through, so it follows the status-bar theme: dark by default.
  const pageBg = () => (state.sbLight ? "#0b0b0c" : "#ffffff");

  // The framed page's URL as Safari shows it (host:port + path + query, minus protocol/www);
  // the pill ellipsis-truncates it when it runs past the available width.
  function framedHost() {
    try {
      const u = new URL(window.__DF_SRC || location.href, location.href);
      const host = (u.host.replace(/^www\./, "") + u.pathname + u.search).replace(/\/$/, "") || u.host;
      return { host, secure: u.protocol === "https:" };
    } catch (_) {
      return { host: "", secure: true };
    }
  }

  // Landscape for an image device that has no dedicated landscape PNG: rotate the portrait
  // frame 90deg CW and lay the page out landscape in the rotated screen rect, with the same
  // status bar on top and Safari chrome at the bottom as portrait.
  function renderImageRotated(d) {
    const fr = d.frame;
    const kP = fr.sw / d.wl; // portrait scale
    const wl = Math.round(fr.sh / kP); // landscape logical width  (= portrait logical height)
    const k = fr.sh / wl; // scale to fill the (rotated) screen width
    const sb = fr.sb;
    const zone = sb ? Math.round(sb.top + sb.h) : 0; // status-bar band reserved at top (frame px)
    const sfH = fr.sf ? Math.round(fr.sf.h) : 0; // Safari chrome reserved at bottom (frame px)
    const hl = Math.round((fr.sw - zone - sfH) / k); // logical page height between the two
    const SBW = 17;

    rig.setAttribute("data-type", "image");
    [crease, lapBase, standNeck, standFoot, bandTop, bandBot, crown, home, cam].forEach((n) =>
      n.style.setProperty("display", "none", "important")
    );

    // device box is the rotated frame: fh wide x fw tall
    device.style.cssText = `position:relative !important;width:${fr.fh}px !important;height:${fr.fw}px !important;background:none !important;border-radius:0 !important;box-shadow:none !important;padding:0 !important;`;

    // screen rect mapped through a 90deg CW rotation of the portrait frame. The cap above oy
    // (island zone) lands on the RIGHT: the screen covers it too, so the band color runs as one
    // straight strip holding the island and the corners round only at the bezel.
    const cap = fr.ot != null ? fr.oy - fr.ot : 0;
    const sLeft = fr.fh - fr.oy - fr.sh;
    const sTop = fr.ox;
    const sW = fr.sh + cap;
    const sH = fr.sw;
    const r = fr.sr || 0;
    const bandColor = sb ? (state.sbLight ? "#0b0b0c" : "#ffffff") : "#000";
    screen.style.cssText = `position:absolute !important;left:${sLeft}px !important;top:${sTop}px !important;width:${sW}px !important;height:${sH}px !important;background:${bandColor} !important;border-radius:${r}px !important;overflow:hidden !important;`;
    iframe.style.cssText = `position:absolute !important;left:0 !important;top:${zone}px !important;width:${wl + SBW}px !important;height:${hl}px !important;border:0 !important;background:${pageBg()} !important;transform-origin:0 0 !important;transform:scale(${k}) !important;`;

    // the portrait PNG rotated 90deg CW, translated back into the device box
    frameImg.style.cssText = `position:absolute !important;left:0 !important;top:0 !important;width:${fr.fw}px !important;height:${fr.fh}px !important;transform-origin:0 0 !important;transform:translate(${fr.fh}px,0) rotate(90deg) !important;pointer-events:none !important;z-index:6 !important;display:block !important;`;
    const url = FRAMES_BASE + fr.file;
    if (frameImg.getAttribute("src") !== url) frameImg.src = url;

    if (statusbar.parentNode !== device) device.appendChild(statusbar);
    placeStatusBar(sLeft, sTop, sW, sb);
    sbScrim.style.setProperty("display", "none", "important");
    const { host, secure } = framedHost();
    placeSafariBar(sLeft, sTop, sW, sH, fr.sf, host, secure, r);
  }

  function renderDrawn(d) {
    frameImg.style.setProperty("display", "none", "important");
    safariBar.style.setProperty("display", "none", "important");
    device.style.cssText = "";
    screen.style.cssText = "";
    iframe.style.cssText = "";

    const land = d.rot && state.landscape;
    const w = land ? d.h : d.w;
    const h = land ? d.w : d.h;
    const [pt, pr, pb, pl] = d.p;

    // The screen gets EXPLICIT dimensions and the iframe is absolutely positioned inside it.
    // (A margin-top inset silently fails here - it collapses / loses to sticky page navs.)
    // zone = status-bar band the page sits below; SBW widens the iframe so the desktop
    // scrollbar lands just past the clipped edge and stays hidden (like a real device).
    const zone = d.sb && !land ? d.sb.top + d.sb.h : 0;
    const SBW = 17;
    screen.style.position = "relative";
    screen.style.width = w + "px";
    screen.style.height = h + "px";
    iframe.style.position = "absolute";
    iframe.style.left = "0";
    iframe.style.top = zone + "px";
    iframe.style.width = w + SBW + "px";
    iframe.style.height = h - zone + "px";
    iframe.style.border = "0";
    iframe.style.setProperty("background", pageBg(), "important"); // the stylesheet's #fff is !important
    device.style.padding = land ? `${pl}px ${pt}px ${pl}px ${pt}px` : `${pt}px ${pr}px ${pb}px ${pl}px`;
    device.style.borderRadius = d.out + "px";
    device.setAttribute("data-side", d.side ? "1" : "0");
    screen.style.borderRadius = d.scr + "px";
    rig.setAttribute("data-type", d.type);

    cam.setAttribute("data-cam", d.cam);
    cam.style.cssText = land && d.cam !== "none" && d.cam !== "lapnotch"
      ? "top:50% !important;left:10px !important;transform:translateY(-50%) rotate(90deg) !important;"
      : "";

    if (d.home) {
      home.style.cssText = land
        ? "display:block !important;top:50% !important;right:8px !important;left:auto !important;bottom:auto !important;transform:translateY(-50%) !important;"
        : "display:block !important;";
    } else {
      home.style.display = "none";
    }

    const ow = w + (land ? pt + pb : pl + pr);
    const showEl = (node, on) => node.style.setProperty("display", on ? "block" : "none", "important");
    showEl(crease, d.type === "fold");
    showEl(lapBase, d.type === "laptop");
    if (d.type === "laptop") lapBase.style.width = Math.round(ow * 1.16) + "px";
    showEl(standNeck, d.type === "display");
    showEl(standFoot, d.type === "display");
    const isWatch = d.type === "watch";
    showEl(bandTop, isWatch);
    showEl(bandBot, isWatch);
    showEl(crown, isWatch);

    // Status bar lives INSIDE the screen for drawn phones so it's always at the screen's top,
    // above the inset page - positioning it in device coords misaligns on thick-forehead phones
    // (iPhone 5/SE). Parent it to the screen and use screen-relative origin (0,0).
    if (statusbar.parentNode !== screen) screen.appendChild(statusbar);
    placeStatusBar(0, 0, w, !land ? d.sb : null);
    sbScrim.style.setProperty("display", "none", "important");
  }

  function render(reloadSrc) {
    const d = current();
    if (d.type === "image") renderImage(d);
    else renderDrawn(d);

    const dim = logicalDims(d);
    const hasSb =
      d.type === "image"
        ? !!(state.landscape && d.frameL ? d.frameL.sb : d.frame && d.frame.sb)
        : !!(d.sb && !state.landscape);
    rotateBtn.disabled = !d.rot;
    rotateBtn.classList.toggle("df-active", !!(d.rot && state.landscape));
    sbBtn.disabled = !hasSb;
    sbBtn.classList.toggle("df-active", hasSb && state.sbLight);
    custom.classList.toggle("df-show", d.id === "custom");
    // hide the toolbar reload when the device has its own working reload in the Safari bar
    const hasSafari = d.type === "image" && !!(state.landscape && d.frameL ? d.frameL.sf : d.frame && d.frame.sf);
    reloadBtn.style.setProperty("display", hasSafari ? "none" : "inline-flex", "important");
    root.classList.toggle("df-desk", !!d.desk); // wallpaper backdrop for Mac displays only
    dims.style.display = d.id === "custom" ? "none" : "inline-flex";
    dims.textContent = `${dim.w} × ${dim.h}`;
    select.value = d.id;

    if (reloadSrc) {
      blocked.classList.remove("df-show");
      spinner.classList.add("df-show"); // spin while the page loads
      sfProg.classList.remove("df-done");
      void sfProg.offsetWidth; // restart the line from 0 on every reload
      sfProg.classList.add("df-go");
      iframe.src = window.__DF_SRC || location.href; // __DF_SRC lets preview.html swap the page
      clearTimeout(loadTimer);
      loadTimer = setTimeout(() => {
        spinner.classList.remove("df-show");
        blocked.classList.add("df-show");
      }, 6000);
    }
    fit();
  }

  // Rotate portrait <-> landscape with a real spin: the current render turns 90deg (CW into
  // landscape, back CCW) while scaling to the other orientation's fit, then the true layout is
  // swapped in underneath with transitions off. Both fill the same on-screen box, so no jump.
  let rotating = false;
  function rotate() {
    const d = current();
    if (!d.rot || rotating) return;
    rotating = true;
    const toLand = !state.landscape;
    const rw = rig.offsetWidth || 1;
    const rh = rig.offsetHeight || 1;
    const next = Math.min(Math.min((stage.clientWidth - 24) / rh, (stage.clientHeight - 24) / rw), 1) * 0.8;
    scaler.style.setProperty("transition", "transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)", "important");
    scaler.style.transform = `scale(${next}) rotate(${toLand ? 90 : -90}deg)`;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      scaler.removeEventListener("transitionend", finish);
      scaler.style.setProperty("transition", "none", "important");
      state.landscape = toLand;
      render(false); // fit() lands on scale(next) with no rotation
      void scaler.offsetWidth; // flush before the transition comes back
      scaler.style.removeProperty("transition");
      rotating = false;
    };
    scaler.addEventListener("transitionend", finish);
    setTimeout(finish, 650); // transitionend can be swallowed (tab hidden) - never get stuck
  }

  function fit() {
    const rw = rig.offsetWidth || 1;
    const rh = rig.offsetHeight || 1;
    const availW = stage.clientWidth - 24;
    const availH = stage.clientHeight - 24;
    // Fit the rig's CURRENT box (portrait or landscape) to the stage. Scaling rotatable devices
    // off their long side kept the size constant across rotation but left landscape tiny
    // (~38% of the stage), so each orientation now fills the stage on its own.
    const base = Math.min(availW / rw, availH / rh);
    // 0.8 = sit the device at 80% so it's smaller with breathing room, centered in the stage
    const scale = Math.min(base, 1) * 0.8;
    scaler.style.transform = `scale(${scale})`;
  }

  // ---- export: PNG (transparent) / WebP / copy / share ----
  // Grabs the rendered pixels (the framed page is cross-origin, so only a tab capture can see
  // it) and crops to the rig with a little padding for the shadow.
  let capturing = false;
  const loadImage = (src) =>
    new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const toBlob = (c, type, q) => new Promise((r) => c.toBlob(r, type, q));
  async function capture() {
    if (capturing) return null;
    capturing = true;
    const d = current();
    const dim = logicalDims(d);
    root.classList.add("df-capturing");
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const dpr = window.devicePixelRatio || 1;
    const box = rig.getBoundingClientRect();
    const pad = 26;
    let resp;
    try {
      resp = await chrome.runtime.sendMessage({ type: "df-capture" });
    } catch (e) {
      resp = { error: e && e.message };
    }
    root.classList.remove("df-capturing");
    let img = null;
    if (resp && resp.dataUrl) img = await loadImage(resp.dataUrl).catch(() => null);
    capturing = false;
    if (!img) {
      console.warn("[Device Frame] capture failed:", resp && resp.error);
      toast("Capture failed");
      return null;
    }
    const sx = Math.max(0, Math.round((box.left - pad) * dpr));
    const sy = Math.max(0, Math.round((box.top - pad) * dpr));
    const sw = Math.min(img.width - sx, Math.round((box.width + pad * 2) * dpr));
    const sh = Math.min(img.height - sy, Math.round((box.height + pad * 2) * dpr));
    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    canvas.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    return { canvas, ox: sx, oy: sy, dpr, d, dim };
  }

  // Knock the stage out so only the device is left: keep the frame PNG's opaque pixels (or the
  // drawn bezel's rounded boxes) plus the screen rect; everything else goes transparent.
  async function transparent(cap) {
    const { canvas, ox, oy, dpr, d } = cap;
    const mask = document.createElement("canvas");
    mask.width = canvas.width;
    mask.height = canvas.height;
    const g = mask.getContext("2d");
    g.fillStyle = "#000";
    const k = rig.getBoundingClientRect().width / (rig.offsetWidth || 1); // on-screen px per layout px
    const rect = (n, grow = 0) => {
      const r = n.getBoundingClientRect();
      const e = grow * k * dpr;
      return { x: r.left * dpr - ox - e, y: r.top * dpr - oy - e, w: r.width * dpr + e * 2, h: r.height * dpr + e * 2 };
    };
    const rrect = (b, rad) => { g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, Math.max(0, rad)); g.fill(); };
    if (d.type === "image") {
      const fr = d.rot && state.landscape && d.frameL ? d.frameL : d.frame;
      const rotated = d.rot && state.landscape && !d.frameL;
      const b = rect(device);
      try {
        const bmp = await createImageBitmap(await (await fetch(FRAMES_BASE + fr.file)).blob());
        g.save();
        if (rotated) { g.translate(b.x + b.w, b.y); g.rotate(Math.PI / 2); g.drawImage(bmp, 0, 0, b.h, b.w); }
        else g.drawImage(bmp, b.x, b.y, b.w, b.h);
        g.restore();
      } catch (_) {
        rrect(b, 0);
      }
      rrect(rect(screen), (fr.sr || 0) * k * dpr);
    } else {
      const rim = !["watch", "display", "laptop"].includes(d.type) ? 9 : 0; // metal rim sits 9px outside the body
      [device, lapBase, standNeck, standFoot, bandTop, bandBot].forEach((n) => {
        if (getComputedStyle(n).display === "none") return;
        const grow = n === device ? rim : 0;
        rrect(rect(n, grow), (parseFloat(getComputedStyle(n).borderRadius) || 0) * k * dpr + grow * k * dpr);
      });
    }
    const out = document.createElement("canvas");
    out.width = canvas.width;
    out.height = canvas.height;
    const o = out.getContext("2d");
    o.drawImage(canvas, 0, 0);
    o.globalCompositeOperation = "destination-in";
    o.drawImage(mask, 0, 0);
    return out;
  }

  const fileName = (cap, ext) => `device-frame-${cap.d.id}-${cap.dim.w}x${cap.dim.h}.${ext}`;
  function save(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  async function exportPng() {
    const cap = await capture();
    if (!cap) return;
    save(await toBlob(await transparent(cap), "image/png"), fileName(cap, "png"));
    toast("PNG saved - transparent background");
  }
  async function exportWebp() {
    const cap = await capture();
    if (!cap) return;
    save(await toBlob(cap.canvas, "image/webp", 0.92), fileName(cap, "webp"));
    toast("WebP saved");
  }
  async function copyPng() {
    const cap = await capture();
    if (!cap) return;
    const png = await transparent(cap);
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error("insecure context");
      const blob = await toBlob(png, "image/png");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    } catch (first) {
      // plain-http pages (LAN dev servers) have no clipboard API at all, and a page that lost
      // focus refuses writes - the extension's own page (secure, clipboardWrite) does it instead
      let resp = null;
      try { resp = await chrome.runtime.sendMessage({ type: "df-clipboard", dataUrl: png.toDataURL("image/png") }); } catch (_) {}
      if (!resp || !resp.ok) {
        console.warn("[Device Frame] copy failed:", first && first.message, resp && resp.error);
        toast("Copy failed - " + ((resp && resp.error) || (first && first.message) || "unknown error"), 4000);
        return;
      }
    }
    flash(copyBtn);
    toast("Image copied - transparent PNG");
  }

  // Share: upload a WebP of the device to bunlongheng.com and hand back a public link.
  // The upload goes through the service worker (extension origin, no CORS dance).
  const blobToBase64 = (blob) =>
    new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result).split(",")[1] || "");
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
  async function share() {
    const cap = await capture();
    if (!cap) return;
    shareBtn.disabled = true;
    toast("Uploading…", 8000);
    try {
      const blob = await toBlob(cap.canvas, "image/webp", 0.9);
      const data = await blobToBase64(blob);
      let page = "";
      try { const u = new URL(window.__DF_SRC || location.href, location.href); page = u.host + u.pathname; } catch (_) {}
      const body = { device: cap.d.label, url: page, width: cap.canvas.width, height: cap.canvas.height, mime: "image/webp", data };
      const resp = await chrome.runtime.sendMessage({ type: "df-share", body });
      if (!resp || !resp.ok || !resp.url) throw new Error((resp && resp.error) || "upload failed");
      try { await navigator.clipboard.writeText(resp.url); } catch (_) {}
      toast("Link copied - ", 6000, resp.url);
      flash(shareBtn);
    } catch (e) {
      toast("Share failed - " + ((e && e.message) || "unknown error"), 4000);
    }
    shareBtn.disabled = false;
  }

  let toastTimer = null;
  function toast(msg, ms = 2200, href) {
    toastEl.textContent = msg;
    if (href) {
      const a = document.createElement("a");
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = href.replace(/^https?:\/\//, "");
      toastEl.append(a);
    }
    toastEl.classList.add("df-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("df-show"), ms);
  }
  const flash = (btn) => { btn.classList.add("df-active"); setTimeout(() => btn.classList.remove("df-active"), 1200); };

  // ---- events ----
  iframe.addEventListener("load", () => {
    clearTimeout(loadTimer);
    blocked.classList.remove("df-show");
    spinner.classList.remove("df-show"); // page arrived - stop the spinner
    sfProg.classList.remove("df-go");
    sfProg.classList.add("df-done"); // run the blue line to the end, then fade it
  });
  select.addEventListener("change", () => { state.deviceId = select.value; render(true); });
  rotateBtn.addEventListener("click", rotate);
  sbBtn.addEventListener("click", () => { state.sbLight = !state.sbLight; render(false); });
  dlBtn.addEventListener("click", (e) => { e.stopPropagation(); menu.classList.toggle("df-show"); });
  miPng.addEventListener("click", () => { menu.classList.remove("df-show"); exportPng(); });
  miWebp.addEventListener("click", () => { menu.classList.remove("df-show"); exportWebp(); });
  copyBtn.addEventListener("click", () => copyPng());
  menu.addEventListener("click", (e) => e.stopPropagation());
  const onDocClick = () => {
    if (!root.isConnected) { document.removeEventListener("click", onDocClick, true); return; }
    menu.classList.remove("df-show");
  };
  document.addEventListener("click", onDocClick, true);
  reloadBtn.addEventListener("click", () => render(true));
  sfReload.addEventListener("click", () => render(true)); // Safari-bar reload (iPhone)
  ghBtn.addEventListener("click", () => window.open(REPO_URL, "_blank", "noopener,noreferrer"));
  shareBtn.addEventListener("click", () => share());
  closeBtn.addEventListener("click", () => close());

  const clampCustom = () => {
    state.customW = Math.max(80, Math.min(6000, parseInt(inW.value, 10) || 1280));
    state.customH = Math.max(80, Math.min(6000, parseInt(inH.value, 10) || 800));
    render(false);
  };
  inW.addEventListener("change", clampCustom);
  inH.addEventListener("change", clampCustom);

  // Both window listeners self-detach the moment THEIR overlay leaves the DOM (normal close,
  // or an orphan hard-removed after an extension reload). Without this, an orphaned overlay's
  // keydown/resize handlers stay bound to window forever, pinning its dead DOM in memory.
  const onKey = (e) => {
    if (!root.isConnected) { window.removeEventListener("keydown", onKey, true); return; }
    if (e.key === "Escape") {
      e.stopPropagation();
      if (menu.classList.contains("df-show")) { menu.classList.remove("df-show"); return; }
      close();
      return;
    }
    // Cmd/Ctrl+R reloads the framed page (not the whole tab, which would kill the overlay)
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && (e.key === "r" || e.key === "R")) {
      e.preventDefault();
      e.stopPropagation();
      render(true);
    }
  };
  const onResize = () => {
    if (!root.isConnected) { window.removeEventListener("resize", onResize); return; }
    fit();
  };
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("resize", onResize);

  function close() {
    clearTimeout(loadTimer);
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("click", onDocClick, true);
    root.remove();
    delete window.__deviceFrame;
    try { chrome.runtime.sendMessage({ type: "df-close" }); } catch (_) {} // drop header-strip rule
  }

  window.__deviceFrame = { close, root };
  try { chrome.runtime.sendMessage({ type: "df-open" }); } catch (_) {} // green "ON" badge
  render(true);
})();
