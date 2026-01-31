// ================================
// academIQ – popup.js
// Manual control UI
// ================================

document.addEventListener("DOMContentLoaded", () => {

  const statusEl = document.getElementById("status");
  const dataEl = document.getElementById("dataPreview");
  const sendBtn = document.getElementById("sendBtn");
  const clearBtn = document.getElementById("clearBtn");

  // ----------------------------
  // Check background health
  // ----------------------------
  chrome.runtime.sendMessage({ type: "PING" }, (res) => {
    if (chrome.runtime.lastError || !res?.success) {
      statusEl.innerText = "❌ Background not reachable";
      return;
    }
    statusEl.innerText = "🟢 Extension active";
  });

  // ----------------------------
  // Load raw stored events
  // ----------------------------
  function loadData() {
    chrome.runtime.sendMessage({ type: "GET_RAW_EVENTS" }, (res) => {
      if (!res?.success) {
        dataEl.innerText = "No data available";
        return;
      }

      const events = res.data.events || [];
      dataEl.innerText = JSON.stringify(events.slice(-10), null, 2);
    });
  }

  loadData();

  // ----------------------------
  // Manual Send (backend later)
  // ----------------------------
  sendBtn.addEventListener("click", () => {
    statusEl.innerText = "📦 Ready to send (backend not connected)";
    console.log("Send pressed – data stays local for now");
  });

  // ----------------------------
  // Clear local data
  // ----------------------------
  clearBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "CLEAR_RAW_EVENTS" }, () => {
      dataEl.innerText = "";
      statusEl.innerText = "🧹 Local data cleared";
    });
  });
});
