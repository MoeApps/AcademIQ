const output = document.getElementById("output");
const syncBtn = document.getElementById("syncBtn");

// Load stored data on open
chrome.storage.local.get("moodleData", res => {
  if (res.moodleData) {
    output.textContent = JSON.stringify(res.moodleData, null, 2);
  }
});

// Manual sync trigger
syncBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "FORCE_SYNC" });
});
