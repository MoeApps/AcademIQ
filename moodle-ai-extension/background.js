// ================================
// academIQ – background.js
// Storage + message broker ONLY
// ================================

const STORAGE_KEY = "academiq_raw_events";

// Listen for messages from popup or future UI
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // ---- Get stored raw events ----
  if (message.type === "GET_RAW_EVENTS") {
    chrome.storage.local.get([STORAGE_KEY], (res) => {
      sendResponse({
        success: true,
        data: res[STORAGE_KEY] || { events: [] }
      });
    });
    return true; // async response
  }

  // ---- Clear stored events (after send) ----
  if (message.type === "CLEAR_RAW_EVENTS") {
    chrome.storage.local.remove([STORAGE_KEY], () => {
      sendResponse({ success: true });
    });
    return true;
  }

  // ---- Health check (debugging) ----
  if (message.type === "PING") {
    sendResponse({ success: true, msg: "background.js alive" });
    return true;
  }
});
