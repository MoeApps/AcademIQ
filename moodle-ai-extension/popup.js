const loadDataBtn = document.getElementById("loadDataBtn");
const downloadJsonBtn = document.getElementById("downloadJsonBtn");
const clearDataBtn = document.getElementById("clearDataBtn");
const outputDiv = document.getElementById("output");

const STORAGE_KEY = "moodleData";

const sanitizePayload = (data) => {
    if (!data) return null;
    const { _meta, events, grades, learning_materials, courses, behavior, student } = data;
    return {
        student,
        courses,
        behavior,
        events: (events || []).map(({ _id, ...event }) => event),
        grades: (grades || []).map(({ _key, ...grade }) => grade),
        learning_materials: (learning_materials || []).map(({ _key, ...material }) => material)
    };
};

// --- Load stored data ---
loadDataBtn.addEventListener("click", () => {
    chrome.storage.local.get(STORAGE_KEY, res => {
        if (!res[STORAGE_KEY]) {
            outputDiv.textContent = "No data found!";
            return;
        }
        const data = sanitizePayload(res[STORAGE_KEY]);
        outputDiv.textContent = JSON.stringify(data, null, 2);
    });
});

// --- Download JSON ---
downloadJsonBtn.addEventListener("click", () => {
    chrome.storage.local.get(STORAGE_KEY, res => {
        if (!res[STORAGE_KEY]) return alert("No data to download.");
        const payload = sanitizePayload(res[STORAGE_KEY]);
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "moodle_student_data.json";
        a.click();
        URL.revokeObjectURL(url);
    });
});

// --- Clear data ---
clearDataBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "clear_data" }, () => {
        outputDiv.textContent = "Data cleared.";
    });
});