document.addEventListener("DOMContentLoaded", () => {

  const statusEl = document.getElementById("status");
  const dataEl = document.getElementById("dataPreview");
  const sendBtn = document.getElementById("sendBtn");
  const clearBtn = document.getElementById("clearBtn");

  // Health check
  chrome.runtime.sendMessage({ type: "PING" }, (res) => {
    if (chrome.runtime.lastError || !res?.success) {
      statusEl.innerText = "❌ Background not reachable";
      return;
    }
    statusEl.innerText = "🟢 Extension active";
  });

  // Load raw stored events
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

  // ---------- Manual Send ----------
  sendBtn.addEventListener("click", async () => {
    statusEl.innerText = "📦 Sending raw data...";

    // 1️⃣ Get stored raw events from background
    chrome.runtime.sendMessage({ type: "GET_RAW_EVENTS" }, async (res) => {
      if (!res?.success) {
        statusEl.innerText = "❌ No raw data";
        return;
      }

      const rawPayload = res.data.payload;
      if (!rawPayload) {
        statusEl.innerText = "❌ No payload found";
        return;
      }

      try {
        // 2️⃣ Send to /ingest
        const ingestRes = await fetch("http://localhost:8000/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rawPayload)
        });
        const ingestData = await ingestRes.json();
        if (!ingestData.features) throw new Error("Ingest failed");

        statusEl.innerText = "✅ Features computed";

        // 3️⃣ Send features to /predict
        const predictRes = await fetch("http://localhost:8000/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ingestData.features)
        });
        const predictData = await predictRes.json();

        // 4️⃣ Show risk + recommendation
        dataEl.innerText = JSON.stringify(predictData, null, 2);

      } catch (err) {
        console.error(err);
        statusEl.innerText = "❌ Error: " + err.message;
      }
    });
  });

  // ---------- Clear local data ----------
  clearBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "CLEAR_RAW_EVENTS" }, () => {
      dataEl.innerText = "";
      statusEl.innerText = "🧹 Local data cleared";
    });
  });
});
