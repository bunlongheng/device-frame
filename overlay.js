// Device Frame overlay controller. Injected on toolbar-icon click.
// Re-injection toggles it off, so one click frames, next click clears.
(() => {
  "use strict";

  if (window.__deviceFrame && document.getElementById("device-frame-root")) {
    window.__deviceFrame.close();
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
    { id: "iphone", label: "iPhone 17 Pro Max", cat: "Apple - real frames", type: "image",
      frame: { file: "iphone.png", fw: 1470, fh: 3000, ox: 75, oy: 217, sw: 1320, sh: 2717 }, wl: 440 },
    { id: "ipadpro", label: 'iPad Pro 13" (M4)', cat: "Apple - real frames", type: "image", rot: true,
      frame: { file: "ipad-portrait.png", fw: 2245, fh: 2930, ox: 96, oy: 102, sw: 2048, sh: 2732 }, wl: 1024,
      frameL: { file: "ipad-landscape.png", fw: 2930, fh: 2245, ox: 102, oy: 101, sw: 2732, sh: 2048 }, wlL: 1366 },
    { id: "macbook", label: "MacBook", cat: "Apple - real frames", type: "image",
      frame: { file: "macbook.png", fw: 3306, fh: 1897, ox: 373, oy: 123, sw: 2560, sh: 1600 }, wl: 1280 },
    { id: "imac", label: 'iMac 24"', cat: "Apple - real frames", type: "image",
      frame: { file: "imac.png", fw: 4880, fh: 5720, ox: 200, oy: 1600, sw: 4480, sh: 2520 }, wl: 1280 },
    { id: "studiodisplay", label: "Studio Display", cat: "Apple - real frames", type: "image",
      frame: { file: "apple-display.png", fw: 5520, fh: 4316, ox: 200, oy: 200, sw: 5120, sh: 2880 }, wl: 1440 },
    // --- Drawn bezels for devices we have no PNG for ---
    { id: "ipse",   label: "iPhone SE",           cat: "Drawn", type: "phone", w: 375, h: 667, cam: "none",  p: [64, 13, 64, 13], out: 44, scr: 6, side: true, home: true, rot: true },
    { id: "ip5",    label: "iPhone 5",            cat: "Drawn", type: "phone", w: 320, h: 568, cam: "none",  p: [70, 12, 70, 12], out: 28, scr: 3, side: true, home: true, rot: true },
    { id: "pixel8", label: "Pixel 8",             cat: "Drawn", type: "phone", w: 412, h: 915, cam: "punch", p: [11, 11, 11, 11], out: 38, scr: 28, side: true, rot: true },
    { id: "galaxy", label: "Galaxy S24",          cat: "Drawn", type: "phone", w: 384, h: 854, cam: "punch", p: [10, 10, 10, 10], out: 34, scr: 26, side: true, rot: true },
    { id: "zfold",  label: "Galaxy Z Fold (open)",cat: "Drawn", type: "fold",  w: 884, h: 800, cam: "punch", p: [10, 10, 10, 10], out: 20, scr: 8, rot: true },
    { id: "watch",  label: "Apple Watch Ultra",   cat: "Drawn", type: "watch", w: 208, h: 248, cam: "none",  p: [12, 12, 12, 12], out: 58, scr: 46 },
    // --- Custom ---
    { id: "custom", label: "Custom size…", cat: "Custom", type: "frame", w: 1280, h: 800, cam: "none", p: [10, 10, 10, 10], out: 14, scr: 6, rot: true },
  ];

  const ICONS = {
    rotate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/></svg>',
    reload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 21v-5h5"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  };

  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };

  const state = { deviceId: DEVICES[0].id, landscape: false, customW: 1280, customH: 800 };

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
  const dlBtn = el("button", "df-btn df-dl", ICONS.download);
  dlBtn.title = "Download PNG (with frame)";
  const reloadBtn = el("button", "df-btn", ICONS.reload);
  reloadBtn.title = "Reload frame";
  const closeBtn = el("button", "df-btn df-close", ICONS.close);
  closeBtn.title = "Close (Esc)";

  bar.append(brand, el("div", "df-sep"), select, dims, custom, el("div", "df-sep"), rotateBtn, dlBtn, reloadBtn, closeBtn);

  // ---- stage + rig ----
  const stage = el("div", "df-stage");
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
  const blocked = el(
    "div",
    "df-blocked",
    "<strong>This page may block embedding</strong><span>Some sites refuse to load inside a frame (X-Frame-Options / CSP). Try one of your own pages or a site that allows it.</span>"
  );
  const iframe = document.createElement("iframe");
  iframe.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
  iframe.allow = "geolocation; microphone; camera; fullscreen; clipboard-read; clipboard-write";

  screen.append(iframe, cam, home, crease, blocked);
  device.append(screen, crown, frameImg);
  bandTop.style.order = "0"; device.style.order = "1"; lapBase.style.order = "2";
  standNeck.style.order = "3"; standFoot.style.order = "4"; bandBot.style.order = "5";
  rig.append(bandTop, device, lapBase, standNeck, standFoot, bandBot);
  scaler.append(rig);
  stage.append(scaler);

  const hint = el("div", "df-hint", 'Framing this tab &middot; <kbd>Esc</kbd> to exit');
  root.append(bar, stage, hint);
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
      const land = d.rot && state.landscape && d.frameL;
      const fr = land ? d.frameL : d.frame;
      const wl = land ? d.wlL : d.wl;
      return { w: wl, h: Math.round((fr.sh * wl) / fr.sw) };
    }
    const land = d.rot && state.landscape;
    return land ? { w: d.h, h: d.w } : { w: d.w, h: d.h };
  }

  let loadTimer = null;

  function renderImage(d) {
    const land = d.rot && state.landscape && d.frameL;
    const fr = land ? d.frameL : d.frame;
    const wl = land ? d.wlL : d.wl;
    const k = fr.sw / wl; // scale the logical iframe up to fill the screen rect
    const hl = Math.round(fr.sh / k);

    rig.setAttribute("data-type", "image");
    // hide every drawn accessory
    [crease, lapBase, standNeck, standFoot, bandTop, bandBot, crown, home, cam].forEach((n) =>
      n.style.setProperty("display", "none", "important")
    );
    // device = the frame canvas, no CSS bezel
    device.style.cssText = `position:relative !important;width:${fr.fw}px !important;height:${fr.fh}px !important;background:none !important;border-radius:0 !important;box-shadow:none !important;padding:0 !important;`;
    // screen wrapper spans the whole frame; the PNG bezel (on top) masks the iframe corners
    screen.style.cssText = `position:absolute !important;left:0 !important;top:0 !important;width:${fr.fw}px !important;height:${fr.fh}px !important;background:transparent !important;border-radius:0 !important;overflow:visible !important;`;
    iframe.style.cssText = `position:absolute !important;left:${fr.ox}px !important;top:${fr.oy}px !important;width:${wl}px !important;height:${hl}px !important;border:0 !important;background:#fff !important;transform-origin:0 0 !important;transform:scale(${k}) !important;`;
    frameImg.style.setProperty("display", "block", "important");
    const url = FRAMES_BASE + fr.file;
    if (frameImg.getAttribute("src") !== url) frameImg.src = url;
  }

  function renderDrawn(d) {
    frameImg.style.setProperty("display", "none", "important");
    device.style.cssText = "";
    screen.style.cssText = "";
    iframe.style.cssText = "";

    const land = d.rot && state.landscape;
    const w = land ? d.h : d.w;
    const h = land ? d.w : d.h;
    const [pt, pr, pb, pl] = d.p;

    iframe.style.width = w + "px";
    iframe.style.height = h + "px";
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
  }

  function render(reloadSrc) {
    const d = current();
    if (d.type === "image") renderImage(d);
    else renderDrawn(d);

    const dim = logicalDims(d);
    rotateBtn.disabled = !d.rot;
    rotateBtn.classList.toggle("df-active", !!(d.rot && state.landscape));
    custom.classList.toggle("df-show", d.id === "custom");
    dims.style.display = d.id === "custom" ? "none" : "inline-flex";
    dims.textContent = `${dim.w} × ${dim.h}`;
    select.value = d.id;

    if (reloadSrc) {
      blocked.classList.remove("df-show");
      iframe.src = window.__DF_SRC || location.href; // __DF_SRC lets preview.html swap the page
      clearTimeout(loadTimer);
      loadTimer = setTimeout(() => blocked.classList.add("df-show"), 6000);
    }
    fit();
  }

  function fit() {
    const rw = rig.offsetWidth || 1;
    const rh = rig.offsetHeight || 1;
    const availW = stage.clientWidth - 24;
    const availH = stage.clientHeight - 24;
    const scale = Math.min(availW / rw, availH / rh, 1);
    scaler.style.transform = `scale(${scale})`;
  }

  // ---- PNG export (captures rendered pixels, so cross-origin frames are included) ----
  let capturing = false;
  async function download() {
    if (capturing) return;
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
    if (!resp || resp.error || !resp.dataUrl) {
      capturing = false;
      console.warn("[Device Frame] capture failed:", resp && resp.error);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const sx = Math.max(0, Math.round((box.left - pad) * dpr));
      const sy = Math.max(0, Math.round((box.top - pad) * dpr));
      const sw = Math.min(img.width - sx, Math.round((box.width + pad * 2) * dpr));
      const sh = Math.min(img.height - sy, Math.round((box.height + pad * 2) * dpr));
      const c = document.createElement("canvas");
      c.width = sw;
      c.height = sh;
      c.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      c.toBlob((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `device-frame-${d.id}-${dim.w}x${dim.h}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        capturing = false;
      }, "image/png");
    };
    img.onerror = () => { capturing = false; };
    img.src = resp.dataUrl;
  }

  // ---- events ----
  iframe.addEventListener("load", () => {
    clearTimeout(loadTimer);
    blocked.classList.remove("df-show");
  });
  select.addEventListener("change", () => { state.deviceId = select.value; render(true); });
  rotateBtn.addEventListener("click", () => { state.landscape = !state.landscape; render(false); });
  dlBtn.addEventListener("click", () => download());
  reloadBtn.addEventListener("click", () => render(true));
  closeBtn.addEventListener("click", () => close());

  const clampCustom = () => {
    state.customW = Math.max(80, Math.min(6000, parseInt(inW.value, 10) || 1280));
    state.customH = Math.max(80, Math.min(6000, parseInt(inH.value, 10) || 800));
    render(false);
  };
  inW.addEventListener("change", clampCustom);
  inH.addEventListener("change", clampCustom);

  const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
  const onResize = () => fit();
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("resize", onResize);

  function close() {
    clearTimeout(loadTimer);
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", onResize);
    root.remove();
    delete window.__deviceFrame;
    try { chrome.runtime.sendMessage({ type: "df-close" }); } catch (_) {} // drop header-strip rule
  }

  window.__deviceFrame = { close, root };
  render(true);
})();
