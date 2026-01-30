const riskDisplay = document.getElementById("riskDisplay");
const status = document.getElementById("status");
const syncBtn = document.getElementById("syncBtn");
const exportBtn = document.getElementById("exportBtn");

const STORAGE_KEY = "MIU_MOODLE_DATA_V1";

// Update risk display
function updateRiskUI(result) {
  if (!result || !result.risk_level) {
    riskDisplay.innerText = "No prediction yet";
    riskDisplay.className = "risk";
    return;
  }

  riskDisplay.innerText = `Risk: ${result.risk_level}\n${result.recommendation}`;
  riskDisplay.className = `risk ${result.risk_level.toLowerCase()}`;
}

// Fetch latest stored prediction
function fetchLatestPrediction(callback) {
  chrome.storage.local.get(STORAGE_KEY, res => {
    const payload = res[STORAGE_KEY]?.payload;
    if (!payload) {
      status.innerText = "No data collected yet.";
      updateRiskUI(null);
      if (callback) callback(null);
      return;
    }

    // Use prediction if exists
    updateRiskUI(payload.prediction || null);
    status.innerText = "Data loaded from storage.";
    if (callback) callback(payload);
  });
}

// ---------- Sync Button ----------
syncBtn.addEventListener("click", () => {
  status.innerText = "Syncing data...";

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs || !tabs.length) {
      status.innerText = "No active tab found.";
      return;
    }

    const tabId = tabs[0].id;

    // Inject content script if not present
    chrome.scripting.executeScript(
      { target: { tabId }, files: ["content.js"] },
      () => {
        // Send FORCE_SYNC message
        chrome.tabs.sendMessage(tabId, { type: "FORCE_SYNC" }, response => {
          if (chrome.runtime.lastError) {
            status.innerText = "Content script not ready on this page.";
            return;
          }
          status.innerText = "Data synced successfully.";
          fetchLatestPrediction(); // refresh popup UI
        });
      }
    );
  });
});

// ---------- Export Button ----------
exportBtn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs || !tabs.length) return;

    const tabId = tabs[0].id;

    chrome.tabs.sendMessage(tabId, { type: "EXPORT_DATA" }, response => {
      if (chrome.runtime.lastError) {
        status.innerText = "Content script not ready on this page.";
        return;
      }
      status.innerText = "Exporting JSON...";
    });
  });
});

// ---------- On Popup Load ----------
fetchLatestPrediction();
