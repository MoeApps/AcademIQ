const STORAGE_KEY = "moodleData";

const refs = {
    refreshBtn: document.getElementById("refreshBtn"),
    downloadJsonBtn: document.getElementById("downloadJsonBtn"),
    clearDataBtn: document.getElementById("clearDataBtn"),
    downloadAllPdfsBtn: document.getElementById("downloadAllPdfsBtn"),
    emptyState: document.getElementById("emptyState"),
    dashboard: document.getElementById("dashboard"),
    materialStats: document.getElementById("materialStats"),
    courseBreakdown: document.getElementById("courseBreakdown"),
    materialsList: document.getElementById("materialsList"),
    downloadMeta: document.getElementById("downloadMeta"),
    lastUpdated: document.getElementById("lastUpdated")
};

let currentMaterials = [];

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

const getStorageData = () =>
    new Promise((resolve) => {
        chrome.storage.local.get(STORAGE_KEY, (res) => {
            resolve(res[STORAGE_KEY] || null);
        });
    });

const createStatCard = (label, value) => {
    const el = document.createElement("div");
    el.className = "stat";
    el.innerHTML = `<div class="label">${label}</div><div class="value">${value}</div>`;
    return el;
};

const inferType = (material) => material.material_type || "other";

const computeTypeCounts = (materials) => {
    const base = { lecture: 0, lab: 0, pdf: 0, assignment: 0, quiz: 0, link: 0 };
    materials.forEach((item) => {
        const type = inferType(item);
        if (base[type] !== undefined) {
            base[type] += 1;
        }
    });
    return base;
};

const computeCourseBreakdown = (materials) => {
    const byCourse = new Map();

    materials.forEach((item) => {
        const courseName = item.course_name || `Course ${item.course_id || "Unknown"}`;
        if (!byCourse.has(courseName)) {
            byCourse.set(courseName, { lecture: 0, lab: 0, pdf: 0, assignment: 0, quiz: 0, link: 0 });
        }
        const bucket = byCourse.get(courseName);
        const type = inferType(item);
        if (bucket[type] !== undefined) {
            bucket[type] += 1;
        }
    });

    return byCourse;
};

const inferFilename = (material, fallbackIndex = 0) => {
    try {
        const url = new URL(material.url);
        const pathToken = decodeURIComponent(url.pathname.split("/").pop() || "").trim();
        if (pathToken && pathToken.includes(".")) return pathToken;
    } catch (_) {
        // Ignore URL parsing failure and fallback.
    }

    const title = (material.title || `material_${fallbackIndex + 1}`).replace(/[\\/:*?"<>|]+/g, "_").trim();
    const ext = material.file_type === "pdf" ? "pdf" : "bin";
    return `${title || `material_${fallbackIndex + 1}`}.${ext}`;
};

const isPdfDownloadable = (material) => material.downloadable === true && material.file_type === "pdf";

const startDownload = (material, index = 0) =>
    new Promise((resolve) => {
        chrome.downloads.download(
            {
                url: material.url,
                filename: inferFilename(material, index),
                conflictAction: "uniquify",
                saveAs: false
            },
            (downloadId) => {
                resolve(Boolean(downloadId));
            }
        );
    });

const renderStats = (materials) => {
    refs.materialStats.innerHTML = "";
    const counts = computeTypeCounts(materials);

    refs.materialStats.appendChild(createStatCard("Total Materials", materials.length));
    refs.materialStats.appendChild(createStatCard("Lectures", counts.lecture));
    refs.materialStats.appendChild(createStatCard("Labs / Tutorials", counts.lab));
    refs.materialStats.appendChild(createStatCard("PDFs", counts.pdf));
    refs.materialStats.appendChild(createStatCard("Assignments", counts.assignment));
    refs.materialStats.appendChild(createStatCard("Quizzes", counts.quiz));
};

const renderCourseBreakdown = (materials) => {
    refs.courseBreakdown.innerHTML = "";
    const courseMap = computeCourseBreakdown(materials);

    if (!courseMap.size) {
        refs.courseBreakdown.textContent = "No course breakdown available.";
        return;
    }

    courseMap.forEach((counts, courseName) => {
        const row = document.createElement("div");
        row.className = "course-row";
        row.innerHTML = `
            <strong>${courseName}</strong>
            <div class="material-meta">Lectures: ${counts.lecture} · Labs: ${counts.lab} · PDFs: ${counts.pdf} · Assignments: ${counts.assignment} · Quizzes: ${counts.quiz}</div>
        `;
        refs.courseBreakdown.appendChild(row);
    });
};

const renderMaterialsList = (materials) => {
    refs.materialsList.innerHTML = "";
    if (!materials.length) {
        refs.materialsList.textContent = "No materials available.";
        return;
    }

    materials.forEach((material, index) => {
        const item = document.createElement("article");
        item.className = "material-item";

        const dueDate = material.due_date ? `Due: ${material.due_date}` : "Due: N/A";
        const availability = material.availability_status || "Unknown";
        const fileInfo = `${(material.file_type || "unknown").toUpperCase()}${material.file_size ? ` · ${material.file_size}` : ""}`;
        const canDownload = isPdfDownloadable(material);

        item.innerHTML = `
            <div class="row"><strong>${material.title || "Untitled Material"}</strong></div>
            <div class="material-meta">${material.course_name || "Unknown Course"} · ${material.section_name || "General"}</div>
            <div class="material-meta">Type: ${material.material_type || "unknown"} · File: ${fileInfo}</div>
            <div class="material-meta">${dueDate} · Availability: ${availability}</div>
        `;

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = canDownload ? "Download PDF" : "Download Unavailable";
        button.disabled = !canDownload;
        button.addEventListener("click", async () => {
            const ok = await startDownload(material, index);
            if (!ok) {
                button.textContent = "Download Failed";
                return;
            }
            button.textContent = "Downloaded";
        });

        item.appendChild(button);
        refs.materialsList.appendChild(item);
    });
};

const renderDashboard = (materials) => {
    currentMaterials = materials || [];
    const pdfCount = currentMaterials.filter(isPdfDownloadable).length;

    refs.lastUpdated.textContent = `Last refreshed: ${new Date().toLocaleString()}`;
    refs.downloadMeta.textContent = `PDFs available: ${pdfCount}`;

    const isEmpty = currentMaterials.length === 0;
    refs.emptyState.classList.toggle("hidden", !isEmpty);
    refs.dashboard.classList.toggle("hidden", isEmpty);
    refs.downloadAllPdfsBtn.disabled = pdfCount === 0;

    if (isEmpty) return;

    renderStats(currentMaterials);
    renderCourseBreakdown(currentMaterials);
    renderMaterialsList(currentMaterials);
};

const refreshData = async () => {
    const data = await getStorageData();
    const materials = Array.isArray(data?.learning_materials) ? data.learning_materials : [];
    renderDashboard(materials);
};

refs.downloadAllPdfsBtn.addEventListener("click", async () => {
    const pdfMaterials = currentMaterials.filter(isPdfDownloadable);
    let successCount = 0;

    for (let i = 0; i < pdfMaterials.length; i += 1) {
        const ok = await startDownload(pdfMaterials[i], i);
        if (ok) successCount += 1;
    }

    refs.downloadMeta.textContent = `PDFs available: ${pdfMaterials.length} · Downloads started: ${successCount}`;
});

refs.downloadJsonBtn.addEventListener("click", async () => {
    const data = await getStorageData();
    if (!data) {
        return;
    }

    const payload = sanitizePayload(data);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "moodle_student_data.json";
    a.click();
    URL.revokeObjectURL(url);
});

refs.clearDataBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "clear_data" }, () => {
        renderDashboard([]);
        refs.lastUpdated.textContent = "Data cleared";
    });
});

refs.refreshBtn.addEventListener("click", refreshData);

document.addEventListener("DOMContentLoaded", refreshData);
