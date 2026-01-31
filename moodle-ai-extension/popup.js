const loadDataBtn = document.getElementById("loadDataBtn");
const downloadJsonBtn = document.getElementById("downloadJsonBtn");
const sendBackendBtn = document.getElementById("sendBackendBtn");
const outputDiv = document.getElementById("output");

const STORAGE_KEY = "MIU_MOODLE_DATA_V1";

function logOutput(msg) {
    outputDiv.textContent += msg + "\n";
}

// --- Load stored data ---
loadDataBtn.addEventListener("click", () => {
    chrome.storage.local.get("moodleData", res => {
        if (!res.moodleData?.payload) {
            outputDiv.textContent = "No data found!";
            return;
        }
        const data = res.moodleData.payload;
        outputDiv.textContent = JSON.stringify(data, null, 2);
    });
});

// --- Download JSON ---
downloadJsonBtn.addEventListener("click", () => {
    chrome.storage.local.get("moodleData", res => {
        if (!res.moodleData?.payload) return alert("No data to download.");
        const blob = new Blob([JSON.stringify(res.moodleData.payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "moodle_student_data.json";
        a.click();
        URL.revokeObjectURL(url);
    });
});

// --- Send to backend: ingest -> predict ---
sendBackendBtn.addEventListener("click", async () => {
    chrome.storage.local.get("moodleData", async res => {
        if (!res.moodleData?.payload) return alert("No data to send.");
        const rawPayload = res.moodleData.payload;

        outputDiv.textContent = "Sending data to backend (/ingest)...\n";

        try {
            // 1️⃣ Send raw Moodle JSON to /ingest
            const ingestResp = await fetch("http://localhost:8000/ingest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(rawPayload)
            });
            const ingestData = await ingestResp.json();
            logOutput("Ingest complete. Computed features:\n" + JSON.stringify(ingestData.features, null, 2));

            // 2️⃣ Send features to /predict
            const predictResp = await fetch("http://localhost:8000/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(ingestData.features)
            });
            const predictData = await predictResp.json();
            logOutput("\nPrediction complete:\n" + JSON.stringify(predictData, null, 2));

            // Optionally: call /store_result if you have one
            // await fetch("http://localhost:8000/store_result", { ... });

        } catch (err) {
            logOutput("Error sending to backend: " + err);
        }
    });
});
