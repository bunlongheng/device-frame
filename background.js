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
