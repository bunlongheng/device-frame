// Toggle the device-frame overlay on the active tab when the toolbar icon is clicked.
// Uses on-demand injection (activeTab + scripting) so nothing runs on pages until asked.

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url || !/^https?:/.test(tab.url)) return;
  try {
    await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["overlay.css"] });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["overlay.js"] });
  } catch (err) {
    // Chrome Web Store, chrome:// pages, PDF viewer etc. cannot be scripted.
    console.warn("[Device Frame] cannot run on this page:", err?.message || err);
  }
});

// The overlay asks the worker to screenshot the visible tab. captureVisibleTab grabs
// rendered pixels, so the framed (cross-origin) page comes through - a DOM/canvas read
// never could. The content script then crops to the device bounds.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "df-capture" && sender.tab) {
    chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: "png" }, (dataUrl) => {
      const err = chrome.runtime.lastError;
      sendResponse(err ? { error: err.message } : { dataUrl });
    });
    return true; // keep the message channel open for the async response
  }
});
