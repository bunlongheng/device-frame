// Device Frame overlay controller. Injected on toolbar-icon click.
// Re-injection toggles it off, so one click frames, next click clears.
(() => {
  "use strict";

  // Already open -> treat this click as "close".
  if (window.__deviceFrame && document.getElementById("device-frame-root")) {
    window.__deviceFrame.close();
    return;
  }

  // Logical (CSS px) viewports, matching what responsive tools report.
  // p = [top, right, bottom, left] bezel; out = outer radius; scr = screen radius.
  const DEVICES = [
    { id: "ip15pro",  label: "iPhone 15 Pro",     w: 393, h: 852, cam: "island", p: [13, 13, 13, 13], out: 54, scr: 42, side: true },
    { id: "ip15max",  label: "iPhone 15 Pro Max", w: 430, h: 932, cam: "island", p: [13, 13, 13, 13], out: 56, scr: 44, side: true },
    { id: "ip14",     label: "iPhone 14",         w: 390, h: 844, cam: "notch",  p: [13, 13, 13, 13], out: 52, scr: 40, side: true },
    { id: "ipse",     label: "iPhone SE",         w: 375, h: 667, cam: "none",   p: [64, 13, 64, 13], out: 44, scr: 4,  side: true, home: true },
    { id: "pixel8",   label: "Pixel 8",           w: 412, h: 915, cam: "punch",  p: [11, 11, 11, 11], out: 38, scr: 28, side: true },
    { id: "galaxy",   label: "Galaxy S24",        w: 384, h: 854, cam: "punch",  p: [10, 10, 10, 10], out: 34, scr: 26, side: true },
    { id: "ipadpro",  label: 'iPad Pro 11"',      w: 834, h: 1194, cam: "none",  p: [17, 17, 17, 17], out: 28, scr: 12 },
    { id: "ipadmini", label: "iPad Mini",         w: 744, h: 1133, cam: "none",  p: [16, 16, 16, 16], out: 26, scr: 11 },
  ];

  const ICONS = {
    rotate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>',
    reload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 21v-5h5"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  };

  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };

  const state = { deviceId: DEVICES[0].id, landscape: false };

  // ---- build DOM ----
  const root = el("div", "");
  root.id = "device-frame-root";

  const bar = el("div", "df-bar");

  const brand = el("div", "df-brand", '<span class="df-dot"></span>DEVICE FRAME');

  const select = el("select", "df-select");
  DEVICES.forEach((d) => {
    const o = document.createElement("option");
    o.value = d.id;
    o.textContent = d.label;
    select.appendChild(o);
  });

  const dims = el("span", "df-dims", "");

  const rotateBtn = el("button", "df-btn", ICONS.rotate);
  rotateBtn.title = "Rotate";
  const reloadBtn = el("button", "df-btn", ICONS.reload);
  reloadBtn.title = "Reload frame";
  const closeBtn = el("button", "df-btn df-close", ICONS.close);
  closeBtn.title = "Close (Esc)";

  bar.append(brand, el("div", "df-sep"), select, dims, el("div", "df-sep"), rotateBtn, reloadBtn, closeBtn);

  const stage = el("div", "df-stage");
  const scaler = el("div", "df-scaler");
  const device = el("div", "df-device");
  const screen = el("div", "df-screen");
  const cam = el("div", "df-cam");
  const home = el("div", "df-home");
  const blocked = el(
    "div",
    "df-blocked",
    "<strong>This page may block embedding</strong><span>Some sites refuse to load inside a frame (X-Frame-Options / CSP). Try one of your own pages or a site that allows it.</span>"
  );

  const iframe = document.createElement("iframe");
  iframe.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
  iframe.allow = "geolocation; microphone; camera; fullscreen; clipboard-read; clipboard-write";

  screen.append(iframe, cam, home, blocked);
  device.append(screen);
  scaler.append(device);
  stage.append(scaler);

  const hint = el("div", "df-hint", 'Framing this tab &middot; <kbd>Esc</kbd> to exit');
  root.append(bar, stage, hint);
  document.documentElement.appendChild(root);

  // ---- rendering ----
  const current = () => DEVICES.find((d) => d.id === state.deviceId) || DEVICES[0];

  let loadTimer = null;

  function render(reloadSrc) {
    const d = current();
    const land = state.landscape;
    const w = land ? d.h : d.w;
    const h = land ? d.w : d.h;
    const [pt, pr, pb, pl] = d.p;

    iframe.style.width = w + "px";
    iframe.style.height = h + "px";

    device.style.padding = land ? `${pl}px ${pt}px ${pl}px ${pt}px` : `${pt}px ${pr}px ${pb}px ${pl}px`;
    device.style.borderRadius = d.out + "px";
    device.setAttribute("data-side", d.side ? "1" : "0");
    device.setAttribute("data-orient", land ? "land" : "port");

    screen.style.borderRadius = d.scr + "px";

    // camera / notch / island
    cam.setAttribute("data-cam", d.cam);
    if (land && d.cam !== "none") {
      cam.style.cssText = "top:50% !important;left:10px !important;transform:translateY(-50%) rotate(90deg) !important;";
    } else {
      cam.style.cssText = "";
    }

    // home button
    home.style.display = d.home ? "block" : "none";
    if (d.home) {
      home.style.cssText = land
        ? "display:block !important;top:50% !important;right:8px !important;left:auto !important;bottom:auto !important;transform:translateY(-50%) !important;"
        : "display:block !important;";
    }

    dims.textContent = `${w} × ${h}`;
    select.value = d.id;

    if (reloadSrc) {
      blocked.classList.remove("df-show");
      iframe.src = location.href;
      clearTimeout(loadTimer);
      loadTimer = setTimeout(() => blocked.classList.add("df-show"), 5000);
    }
    fit();
  }

  function fit() {
    const d = current();
    const land = state.landscape;
    const w = land ? d.h : d.w;
    const h = land ? d.w : d.h;
    const [pt, pr, pb, pl] = d.p;
    const outerW = w + (land ? pt + pb : pl + pr);
    const outerH = h + (land ? pl + pr : pt + pb);
    const availW = stage.clientWidth - 24;
    const availH = stage.clientHeight - 24;
    const scale = Math.min(availW / outerW, availH / outerH, 1);
    scaler.style.transform = `scale(${scale})`;
  }

  // ---- events ----
  iframe.addEventListener("load", () => {
    clearTimeout(loadTimer);
    blocked.classList.remove("df-show");
  });

  select.addEventListener("change", () => {
    state.deviceId = select.value;
    render(false);
  });
  rotateBtn.addEventListener("click", () => {
    state.landscape = !state.landscape;
    rotateBtn.classList.toggle("df-active", state.landscape);
    render(false);
  });
  reloadBtn.addEventListener("click", () => render(true));
  closeBtn.addEventListener("click", () => close());

  const onKey = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    }
  };
  const onResize = () => fit();
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("resize", onResize);

  function close() {
    clearTimeout(loadTimer);
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", onResize);
    root.remove();
    delete window.__deviceFrame;
  }

  window.__deviceFrame = { close, root };

  render(true);
})();
