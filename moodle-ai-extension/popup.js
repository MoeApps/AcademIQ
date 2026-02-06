const STORAGE_KEY = "moodleData";

const refs = {
    refreshBtn: document.getElementById("refreshBtn"),
    downloadJsonBtn: document.getElementById("downloadJsonBtn"),
    clearDataBtn: document.getElementById("clearDataBtn"),
    courseSelect: document.getElementById("courseSelect"),
    emptyState: document.getElementById("emptyState"),
    dashboard: document.getElementById("dashboard"),
    metricsGrid: document.getElementById("metricsGrid"),
    lastUpdated: document.getElementById("lastUpdated")
};

let metricsByCourse = {};
let selectedCourseId = "";

const getStorageData = () =>
    new Promise((resolve) => {
        chrome.storage.local.get(STORAGE_KEY, (res) => {
            resolve(res[STORAGE_KEY] || null);
        });
    });

const sanitizePayload = (data) => {
    if (!data) return null;
    return {
        student: data.student || null,
        // Raw extracted per-course counters, safe for export.
        metricsByCourse: data.metricsByCourse || {},
        events: (data.events || []).map(({ _id, ...event }) => event)
    };
};

const formatDuration = (seconds) => {
    const total = Number(seconds || 0);
    if (total < 60) return `${total}s`;
    const mins = Math.floor(total / 60);
    const rem = total % 60;
    if (mins < 60) return `${mins}m ${rem}s`;
    const hours = Math.floor(mins / 60);
    const minsRem = mins % 60;
    return `${hours}h ${minsRem}m`;
};

const createMetricCard = ({ icon, label, value, tone }) => {
    const card = document.createElement("article");
    card.className = `metric-card ${tone}`;
    card.innerHTML = `
        <div class="metric-icon">${icon}</div>
        <div>
            <div class="metric-label">${label}</div>
            <div class="metric-value">${value}</div>
        </div>
    `;
    return card;
};

const renderCourseOptions = () => {
    refs.courseSelect.innerHTML = "";
    const courseIds = Object.keys(metricsByCourse);

    if (!courseIds.length) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No courses";
        refs.courseSelect.appendChild(option);
        refs.courseSelect.disabled = true;
        selectedCourseId = "";
        return;
    }

    refs.courseSelect.disabled = false;

    courseIds.forEach((courseId) => {
        const option = document.createElement("option");
        option.value = courseId;
        option.textContent = metricsByCourse[courseId].course_name || `Course ${courseId}`;
        refs.courseSelect.appendChild(option);
    });

    if (!selectedCourseId || !metricsByCourse[selectedCourseId]) {
        selectedCourseId = courseIds[0];
    }
    refs.courseSelect.value = selectedCourseId;
};

const renderMetrics = () => {
    refs.metricsGrid.innerHTML = "";
    const courseMetrics = metricsByCourse[selectedCourseId];

    if (!courseMetrics) {
        refs.emptyState.classList.remove("hidden");
        refs.dashboard.classList.add("hidden");
        refs.clearDataBtn.disabled = true;
        return;
    }

    refs.emptyState.classList.add("hidden");
    refs.dashboard.classList.remove("hidden");
    refs.clearDataBtn.disabled = false;

    const cards = [
        {
            icon: "⏱️",
            label: "Total Time Spent",
            value: formatDuration(courseMetrics.total_time_spent),
            tone: "tone-blue"
        },
        {
            icon: "👁️",
            label: "Total Visits",
            value: Number(courseMetrics.total_visits || 0),
            tone: "tone-indigo"
        },
        {
            icon: "🖱️",
            label: "Material Clicks",
            value: Number(courseMetrics.material_clicks || 0),
            tone: "tone-cyan"
        },
        {
            icon: "📅",
            label: "Active Days",
            value: Array.isArray(courseMetrics.active_days) ? courseMetrics.active_days.length : 0,
            tone: "tone-purple"
        },
        {
            icon: "📝",
            label: "Quiz Attempts",
            value: Number(courseMetrics.quiz_attempts || 0),
            tone: "tone-green"
        },
        {
            icon: "📤",
            label: "Assignment Submissions",
            value: Number(courseMetrics.assignment_submissions || 0),
            tone: "tone-orange"
        }
    ];

    cards.forEach((cardData) => refs.metricsGrid.appendChild(createMetricCard(cardData)));
};

const refreshData = async () => {
    const data = await getStorageData();
    metricsByCourse = data?.metricsByCourse && typeof data.metricsByCourse === "object" ? data.metricsByCourse : {};
    renderCourseOptions();
    renderMetrics();
    refs.lastUpdated.textContent = `Last refreshed: ${new Date().toLocaleString()}`;
};

refs.courseSelect.addEventListener("change", (event) => {
    selectedCourseId = event.target.value;
    renderMetrics();
});

refs.downloadJsonBtn.addEventListener("click", async () => {
    const data = await getStorageData();
    if (!data) return;

    const payload = sanitizePayload(data);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "moodle_extracted_data.json";
    a.click();
    URL.revokeObjectURL(url);
});

refs.clearDataBtn.addEventListener("click", () => {
    if (!selectedCourseId) return;
    chrome.runtime.sendMessage(
        {
            type: "clear_course",
            payload: { course_id: selectedCourseId }
        },
        () => {
            refreshData();
            refs.lastUpdated.textContent = "Selected course data cleared";
        }
    );
});

refs.refreshBtn.addEventListener("click", refreshData);

document.addEventListener("DOMContentLoaded", refreshData);
