console.log("MIU Moodle AI Assistant: background service worker running");

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log("BG message:", msg);
  });
  