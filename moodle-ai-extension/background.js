console.log("MIU Moodle AI Assistant: background service worker running");

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("BG message:", msg);
  // Forward FORCE_SYNC or EXPORT_DATA to content script
  if (sender.tab?.id) {
    chrome.tabs.sendMessage(sender.tab.id, msg);
  }
});
