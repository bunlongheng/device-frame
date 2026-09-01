// Toggle the device-frame overlay on the active tab when the toolbar icon is clicked.
// Uses on-demand injection (activeTab + scripting) so nothing runs on pages until asked.

// Most sites refuse to be embedded (X-Frame-Options / CSP frame-ancestors). Like
// Responsive Viewer / Responsively, we strip those response headers so the real site
// renders inside the device iframe. Scoped to sub_frame requests on the ONE framed tab
// via a session rule (rule id = tabId), and only while the overlay is open - so normal
// browsing keeps its clickjacking protection.
function stripRuleFor(tabId) {
  return {
    id: tabId,
    priority: 1,
    action: {
      type: "modifyHeaders",
      responseHeaders: [
        { header: "x-frame-options", operation: "remove" },
        { header: "frame-options", operation: "remove" },
        { header: "content-security-policy", operation: "remove" },
        { header: "content-security-policy-report-only", operation: "remove" },
      ],
    },
    condition: { resourceTypes: ["sub_frame"], tabIds: [tabId] },
  };
}

async function enableStrip(tabId) {
  try {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [tabId],
      addRules: [stripRuleFor(tabId)],
    });
  } catch (err) {
    console.warn("[Device Frame] could not enable header strip:", err?.message || err);
  }
}

async function disableStrip(tabId) {
  try {
    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [tabId] });
  } catch (_) {}
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url || !/^https?:/.test(tab.url)) return;
  try {
    // Put the header-strip rule in place BEFORE the overlay's iframe fires its request.
    await enableStrip(tab.id);
    await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["overlay.css"] });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["overlay.js"] });
  } catch (err) {
    // Chrome Web Store, chrome:// pages, PDF viewer etc. cannot be scripted.
    await disableStrip(tab.id);
    console.warn("[Device Frame] cannot run on this page:", err?.message || err);
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!sender.tab) return;

  // Overlay closed -> drop the per-tab header-strip rule, restoring normal protection.
  if (msg && msg.type === "df-close") {
    disableStrip(sender.tab.id);
    return;
  }

  // The overlay asks the worker to screenshot the visible tab. captureVisibleTab grabs
  // rendered pixels, so the framed (cross-origin) page comes through - a DOM/canvas read
  // never could. The content script then crops to the device bounds.
  if (msg && msg.type === "df-capture") {
    chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: "png" }, (dataUrl) => {
      const err = chrome.runtime.lastError;
      sendResponse(err ? { error: err.message } : { dataUrl });
    });
    return true; // keep the message channel open for the async response
  }
});

// Clean up the rule if the tab is closed while framed.
chrome.tabs.onRemoved.addListener((tabId) => disableStrip(tabId));
