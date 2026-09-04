// Clipboard writer for pages that cannot do it themselves (plain-http LAN dev servers have no
// navigator.clipboard). background.js opens this focused popup with the PNG parked in session
// storage; we write it, report back, and the worker closes the window.
(async () => {
  let result;
  try {
    const { dfClip } = await chrome.storage.session.get("dfClip");
    if (!dfClip) throw new Error("nothing to copy");
    const blob = await (await fetch(dfClip)).blob();
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    result = { type: "df-clipboard-done", ok: true };
  } catch (e) {
    result = { type: "df-clipboard-done", error: (e && e.message) || "clipboard write failed" };
  }
  chrome.runtime.sendMessage(result);
})();
