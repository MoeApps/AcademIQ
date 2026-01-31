chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "get_data") {
        chrome.storage.local.get("moodle_data", (result) => {
            sendResponse({ data: result.moodle_data || null });
        });
        return true; // async
    }

    if (message.type === "clear_data") {
        chrome.storage.local.remove("moodle_data", () => {
            sendResponse({ status: "cleared" });
        });
        return true;
    }

    if (message.type === "send_to_backend") {
        chrome.storage.local.get("moodle_data", async (result) => {
            const data = result.moodle_data;
            if (!data) return sendResponse({ status: "no_data" });

            try {
                await fetch("http://localhost:8000/ingest", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data)
                });

                const predictRes = await fetch("http://localhost:8000/predict", { method: "POST" });
                const storeRes = await fetch("http://localhost:8000/store_result", { method: "POST" });

                sendResponse({ status: "success", predictRes, storeRes });
            } catch (err) {
                sendResponse({ status: "error", error: err.message });
            }
        });
        return true;
    }
});
