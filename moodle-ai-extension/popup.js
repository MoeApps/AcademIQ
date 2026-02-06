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
let currentCourses = [];

const sanitizePayload = (data) => {
    if (!data) return null;
    const { _meta, events, grades, learning_materials, courses, behavior, student, knowledge_base } = data;
    return {
        student,
        courses,
        behavior,
        knowledge_base,
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
    const base = { lecture: 0, lab: 0, pdf: 0, document: 0, assignment: 0, quiz: 0, link: 0 };
    materials.forEach((item) => {
        const type = inferType(item);
        if (base[type] !== undefined) {
            base[type] += 1;
        }
    });
    return base;
};

const inferFilename = (material, fallbackIndex = 0) => {
    if (material.original_filename) return material.original_filename;
    try {
        const url = new URL(material.url);
        const pathToken = decodeURIComponent(url.pathname.split("/").pop() || "").trim();
        if (pathToken && pathToken.includes(".") && !pathToken.endsWith(".php")) return pathToken;
    } catch (_) {
        // Ignore URL parsing failure and fallback.
    }

    const title = (material.title || `material_${fallbackIndex + 1}`).replace(/[\\/:*?"<>|]+/g, "_").trim();
    const ext = material.file_type && material.file_type !== "link" ? material.file_type : "bin";
    return `${title || `material_${fallbackIndex + 1}`}.${ext}`;
};

const isMaterialDownloadable = (material) => material.downloadable === true && /^https?:/i.test(material.url || "") && material.material_type !== "link";

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
                if (downloadId) {
                    resolve({ ok: true, method: "download" });
                    return;
                }

                // Moodle resources can reject the Downloads API when URL token/session checks fail.
                chrome.tabs.create({ url: material.url }, (tab) => {
                    resolve({ ok: Boolean(tab?.id), method: tab?.id ? "tab" : "failed" });
                });
            }
        );
    });

const getEngagementLevel = (course) => {
    const score = (course.total_visits || 0) + (course.number_of_resources_clicked || 0) + Math.round((course.total_time_spent_seconds || 0) / 120);
    if (score >= 25) return "high";
    if (score >= 10) return "medium";
    return "low";
};

const renderStats = (materials) => {
    refs.materialStats.innerHTML = "";
    const counts = computeTypeCounts(materials);

    refs.materialStats.appendChild(createStatCard("Total Materials", materials.length));
    refs.materialStats.appendChild(createStatCard("Lectures", counts.lecture));
    refs.materialStats.appendChild(createStatCard("Labs / Tutorials", counts.lab));
    refs.materialStats.appendChild(createStatCard("PDFs", counts.pdf));
    refs.materialStats.appendChild(createStatCard("Documents", counts.document));
    refs.materialStats.appendChild(createStatCard("Assignments", counts.assignment));
    refs.materialStats.appendChild(createStatCard("Quizzes", counts.quiz));
};

const renderCourseBreakdown = (materials, courses) => {
    refs.courseBreakdown.innerHTML = "";
    const byCourse = new Map();

    materials.forEach((item) => {
        const courseName = item.course_name || `Course ${item.course_id || "Unknown"}`;
        if (!byCourse.has(courseName)) {
            byCourse.set(courseName, { lecture: 0, lab: 0, pdf: 0, document: 0, assignment: 0, quiz: 0, link: 0, materialCount: 0 });
        }
        const bucket = byCourse.get(courseName);
        const type = inferType(item);
        if (bucket[type] !== undefined) bucket[type] += 1;
        bucket.materialCount += 1;
    });

    if (!byCourse.size) {
        refs.courseBreakdown.textContent = "No course breakdown available.";
        return;
    }

    byCourse.forEach((counts, courseName) => {
        const courseMetrics = (courses || []).find((c) => c.course_name === courseName) || {};
        const engagement = getEngagementLevel(courseMetrics);

        const row = document.createElement("div");
        row.className = `course-row ${engagement}`;
        row.innerHTML = `
            <div class="course-row-header">
                <strong>${courseName}</strong>
                <span class="status-dot ${engagement}" title="${engagement} engagement"></span>
            </div>
            <div class="course-badges">
                <span class="badge">👁️ ${courseMetrics.total_visits || 0}</span>
                <span class="badge">🖱️ ${courseMetrics.number_of_resources_clicked || 0}</span>
                <span class="badge">⏱️ ${Math.round((courseMetrics.total_time_spent_seconds || 0) / 60)}m</span>
                <span class="badge">📚 ${counts.materialCount}</span>
            </div>
            <div class="material-meta">Lectures: ${counts.lecture} · Labs: ${counts.lab} · PDFs: ${counts.pdf} · Docs: ${counts.document} · Assignments: ${counts.assignment} · Quizzes: ${counts.quiz}</div>
        `;
        refs.courseBreakdown.appendChild(row);
    });
};

const materialFileLabel = (material) => {
    if (material.material_type === "link" || material.file_type === "link") return "External link";
    if ((material.file_type || "").toLowerCase() === "pdf") return "PDF";
    if (["doc", "docx", "ppt", "pptx", "xlsx"].includes((material.file_type || "").toLowerCase())) return "Document";
    if (material.downloadable) return "Downloadable file";
    return "Resource";
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
        const fileInfo = `${materialFileLabel(material)}${material.file_size ? ` · ${material.file_size}` : ""}`;
        const canDownload = isMaterialDownloadable(material);
        const tags = Array.isArray(material.semantic_tags) ? material.semantic_tags : [];

        item.innerHTML = `
            <div class="row"><strong>${material.title || "Untitled Material"}</strong></div>
            <div class="material-meta">${material.course_name || "Unknown Course"} · ${material.section_name || "General"}</div>
            <div class="material-meta">Type: ${material.material_type || "unknown"} · File: ${fileInfo}</div>
            <div class="material-meta">${dueDate} · Availability: ${availability}</div>
            <div class="tag-row">${tags.map((tag) => `<span class="tag-chip">${tag}</span>`).join("")}</div>
        `;

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = canDownload ? "Download" : "Open";
        button.disabled = !material.url;
        button.addEventListener("click", async () => {
            const result = await startDownload(material, index);
            if (!result.ok) {
                button.textContent = "Open Failed";
                return;
            }
            button.textContent = result.method === "tab" ? "Opened" : "Downloaded";
        });

        item.appendChild(button);
        refs.materialsList.appendChild(item);
    });
};

const renderDashboard = (materials, courses = []) => {
    currentMaterials = materials || [];
    currentCourses = courses || [];
    const downloadableCount = currentMaterials.filter(isMaterialDownloadable).length;

    refs.lastUpdated.textContent = `Last refreshed: ${new Date().toLocaleString()}`;
    refs.downloadMeta.textContent = `Download-ready files: ${downloadableCount}`;

    const isEmpty = currentMaterials.length === 0;
    refs.emptyState.classList.toggle("hidden", !isEmpty);
    refs.dashboard.classList.toggle("hidden", isEmpty);
    refs.downloadAllPdfsBtn.disabled = downloadableCount === 0;

    if (isEmpty) return;

    renderStats(currentMaterials);
    renderCourseBreakdown(currentMaterials, currentCourses);
    renderMaterialsList(currentMaterials);
};

const refreshData = async () => {
    const data = await getStorageData();
    const materials = Array.isArray(data?.learning_materials) ? data.learning_materials : [];
    const courses = Array.isArray(data?.courses) ? data.courses : [];
    renderDashboard(materials, courses);
};

refs.downloadAllPdfsBtn.addEventListener("click", async () => {
    const downloadableMaterials = currentMaterials.filter(isMaterialDownloadable);
    let successCount = 0;

    for (let i = 0; i < downloadableMaterials.length; i += 1) {
        const result = await startDownload(downloadableMaterials[i], i);
        if (result.ok) successCount += 1;
    }

    refs.downloadMeta.textContent = `Download-ready files: ${downloadableMaterials.length} · Started: ${successCount}`;
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
        renderDashboard([], []);
        refs.lastUpdated.textContent = "Data cleared";
    });
});

refs.refreshBtn.addEventListener("click", refreshData);

document.addEventListener("DOMContentLoaded", refreshData);
