// popup.js — AcademIQ Extension UI
// All backend communication goes through this file. The API base URL is read
// from chrome.storage.local so the user can change it without reloading.

"use strict";

// ─── Constants ──────────────────────────────────────────────────────────────
const STORAGE_KEY      = "moodleData";
const SETTINGS_KEY     = "academiqSettings";
const SYNC_STATUS_KEY  = "academiqSyncStatus";

const DEFAULT_API_URL  = "http://localhost:8000";
const SYNC_ENDPOINT    = "/raw-moodle-payloads";
const ACADEMIQ_URL_KEY = "academiqAppUrl"; // base URL for "Open AcademIQ" button

// ─── DOM refs ────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const dom = {
  statusDot:       $("statusDot"),
  accountBanner:   $("accountBanner"),
  accountIcon:     $("accountIcon"),
  accountLabel:    $("accountLabel"),
  accountEmail:    $("accountEmail"),
  openAcademiqBtn: $("openAcademiqBtn"),
  lastSyncLabel:   $("lastSyncLabel"),
  syncBtn:         $("syncBtn"),
  syncProgress:    $("syncProgress"),
  progressFill:    $("progressFill"),
  progressLabel:   $("progressLabel"),
  syncResult:      $("syncResult"),
  statsCard:       $("statsCard"),
  statCourses:     $("statCourses"),
  statMaterials:   $("statMaterials"),
  statActiveDays:  $("statActiveDays"),
  statClicks:      $("statClicks"),
  courseCard:      $("courseCard"),
  courseSelector:  $("courseSelector"),
  performanceStats:$("performanceStats"),
  materialsCard:   $("materialsCard"),
  downloadMeta:    $("downloadMeta"),
  downloadAllBtn:  $("downloadAllBtn"),
  materialsList:   $("materialsList"),
  apiUrlInput:     $("apiUrlInput"),
  autoSyncToggle:  $("autoSyncToggle"),
  saveSettingsBtn: $("saveSettingsBtn"),
  settingsSaved:   $("settingsSaved"),
  refreshBtn:      $("refreshBtn"),
  scanAllBtn:      $("scanAllBtn"),
  downloadJsonBtn: $("downloadJsonBtn"),
  clearDataBtn:    $("clearDataBtn"),
};

// ─── State ───────────────────────────────────────────────────────────────────
let currentData    = null;
let currentCourseId = null;
let apiBaseUrl     = DEFAULT_API_URL;

// ─── Settings ─────────────────────────────────────────────────────────────────
const loadSettings = () =>
  new Promise((resolve) => {
    chrome.storage.local.get(SETTINGS_KEY, (res) => {
      const s = res[SETTINGS_KEY] || {};
      apiBaseUrl = (s.apiUrl || DEFAULT_API_URL).replace(/\/$/, "");
      dom.apiUrlInput.value = apiBaseUrl;
      dom.autoSyncToggle.checked = Boolean(s.autoSync);
      resolve(s);
    });
  });

const saveSettings = () => {
  const s = {
    apiUrl:    dom.apiUrlInput.value.trim().replace(/\/$/, "") || DEFAULT_API_URL,
    autoSync:  dom.autoSyncToggle.checked,
  };
  apiBaseUrl = s.apiUrl;
  chrome.storage.local.set({ [SETTINGS_KEY]: s });
  dom.settingsSaved.classList.remove("hidden");
  setTimeout(() => dom.settingsSaved.classList.add("hidden"), 1500);
};

// ─── Status helpers ───────────────────────────────────────────────────────────
const setStatus = (state) => {
  dom.statusDot.className = `status-dot ${state}`;
};

const showSyncResult = (ok, message) => {
  dom.syncResult.textContent = message;
  dom.syncResult.className   = `sync-result ${ok ? "ok" : "err"}`;
  dom.syncResult.classList.remove("hidden");
  setTimeout(() => dom.syncResult.classList.add("hidden"), 4000);
};

const setProgress = (pct, label) => {
  dom.progressFill.style.width = `${pct}%`;
  dom.progressLabel.textContent = label;
};

// ─── Storage helpers ──────────────────────────────────────────────────────────
const getStorageData = () =>
  new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (res) => resolve(res[STORAGE_KEY] || null));
  });

const getSyncStatus = () =>
  new Promise((resolve) => {
    chrome.storage.local.get(SYNC_STATUS_KEY, (res) => resolve(res[SYNC_STATUS_KEY] || {}));
  });

const saveSyncStatus = (patch) =>
  new Promise((resolve) => {
    chrome.storage.local.get(SYNC_STATUS_KEY, (res) => {
      const merged = { ...(res[SYNC_STATUS_KEY] || {}), ...patch };
      chrome.storage.local.set({ [SYNC_STATUS_KEY]: merged }, resolve);
    });
  });

// ─── Account banner ───────────────────────────────────────────────────────────
const renderAccountBanner = (data, syncStatus) => {
  const student = data?.student || {};
  const linkedId = syncStatus?.academiq_user_id;

  dom.accountBanner.classList.remove("hidden");

  if (linkedId) {
    dom.accountIcon.textContent  = "✅";
    dom.accountLabel.textContent = "Linked to AcademIQ";
    dom.accountEmail.textContent = student.email || student.full_name || "";
  } else if (student.email || student.moodle_user_id) {
    dom.accountIcon.textContent  = "🔗";
    dom.accountLabel.textContent = "Moodle identity detected";
    dom.accountEmail.textContent = student.email || `Moodle ID: ${student.moodle_user_id}`;
  } else {
    dom.accountIcon.textContent  = "👤";
    dom.accountLabel.textContent = "No identity detected";
    dom.accountEmail.textContent = "Browse a Moodle page first";
  }
};

// ─── Stats ────────────────────────────────────────────────────────────────────
const renderStats = (data) => {
  const courseCount    = Object.keys(data?.metricsByCourse || {}).length;
  const materialCount  = (data?.materials || []).length;
  const activeDays     = data?.behavior?.active_days_count || 0;
  const totalClicks    = Object.values(data?.metricsByCourse || {})
    .reduce((sum, m) => sum + (m.click_count || 0), 0);

  dom.statCourses.textContent   = courseCount;
  dom.statMaterials.textContent = materialCount;
  dom.statActiveDays.textContent = activeDays;
  dom.statClicks.textContent    = totalClicks;

  dom.statsCard.classList.toggle("hidden", courseCount === 0);
};

// ─── Course selector ──────────────────────────────────────────────────────────
const renderCourseSelector = (courseIds) => {
  dom.courseSelector.innerHTML = "";
  courseIds.forEach((id) => {
    const m    = currentData?.metricsByCourse?.[id] || {};
    const opt  = document.createElement("option");
    opt.value  = id;
    opt.textContent = m.course_name || `Course ${id}`;
    dom.courseSelector.appendChild(opt);
  });
  if (!currentCourseId || !courseIds.includes(currentCourseId)) {
    currentCourseId = courseIds[0] || null;
  }
  dom.courseSelector.value = currentCourseId || "";
};

const renderPerformance = (metrics) => {
  dom.performanceStats.innerHTML = "";
  const fields = [
    ["Visits",        metrics.total_visits               || 0],
    ["Time (min)",    Math.round((metrics.total_time_spent_seconds || 0) / 60)],
    ["Resources",     metrics.number_of_resources_clicked || 0],
    ["Assignments",   metrics.number_of_assignments_viewed || 0],
    ["Quizzes",       metrics.quiz_attempts               || 0],
    ["Submissions",   metrics.assignment_submissions       || 0],
  ];
  fields.forEach(([label, value]) => {
    const el = document.createElement("div");
    el.className = "stat";
    el.innerHTML = `<div class="stat-value">${value}</div><div class="stat-label">${label}</div>`;
    dom.performanceStats.appendChild(el);
  });
};

// ─── Materials ────────────────────────────────────────────────────────────────
const fileIcon = (type) => {
  const t = (type || "").toLowerCase();
  if (t === "pdf")  return "📄";
  if (["doc","docx"].includes(t)) return "📝";
  if (["ppt","pptx"].includes(t)) return "📊";
  if (["xls","xlsx"].includes(t)) return "📈";
  if (t === "link") return "🔗";
  if (t === "folder") return "📁";
  return "📎";
};

const isDownloadable = (m) => {
  const ft = (m.fileType || "").toLowerCase();
  if (ft === "folder" || ft === "html" || ft === "link") return false;
  if (m.downloadStatus === "No downloadable files") return false;
  return /^https?:/i.test(m.url || "") && (
    m.downloadable ||
    /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|zip)([\?#]|$)/i.test(m.url)
  );
};

const getCourseMaterials = (courseId) => {
  const all = Array.isArray(currentData?.materials) ? currentData.materials : [];
  return all.filter((m) => (m.courseId || m.course_id) === courseId).map((m) => ({
    id:         m.id || m.material_id,
    courseId:   m.courseId || m.course_id || courseId,
    title:      m.title || "Untitled",
    type:       m.type || m.material_type || "unknown",
    fileType:   m.fileType || m.file_type || "unknown",
    url:        m.url || "",
    downloadable: Boolean(m.downloadable),
  }));
};

const renderMaterials = (courseId) => {
  const materials = getCourseMaterials(courseId);
  const groups = { lecture: [], lab: [], other: [] };
  materials.forEach((m) => {
    const t = (m.type || "").toLowerCase();
    if (t === "lecture") groups.lecture.push(m);
    else if (t === "lab") groups.lab.push(m);
    else groups.other.push(m);
  });

  dom.materialsList.innerHTML = "";
  const downloadableCount = materials.filter(isDownloadable).length;
  dom.downloadMeta.textContent = `${materials.length} materials · ${downloadableCount} downloadable`;
  dom.downloadAllBtn.disabled  = downloadableCount === 0;

  [["Lecture", groups.lecture], ["Lab", groups.lab], ["Other", groups.other]].forEach(
    ([label, items]) => {
      if (!items.length) return;
      const groupLabel = document.createElement("div");
      groupLabel.className = "material-group-label";
      groupLabel.textContent = `${label} (${items.length})`;
      dom.materialsList.appendChild(groupLabel);

      items.forEach((m, idx) => {
        const canDl = isDownloadable(m);
        const el    = document.createElement("div");
        el.className = "material-item";
        el.innerHTML = `
          <span class="material-icon">${fileIcon(m.fileType)}</span>
          <div class="material-info">
            <div class="material-title" title="${m.title}">${m.title}</div>
            <div class="material-meta-row">${m.type} · ${(m.fileType || "?").toUpperCase()}</div>
          </div>
        `;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-ghost btn-sm";
        btn.textContent = canDl ? "↓" : "↗";
        btn.title = canDl ? "Download" : "View on Moodle";
        btn.disabled = !m.url;
        btn.addEventListener("click", async () => {
          if (!canDl) { chrome.tabs.create({ url: m.url }); return; }
          chrome.downloads.download({
            url: m.url,
            filename: `${(m.title || `material_${idx + 1}`).replace(/[\\/:*?"<>|]+/g, "_")}.${(m.fileType || "bin").replace(/[^a-z0-9]/gi, "") || "bin"}`,
            conflictAction: "uniquify",
            saveAs: false,
          }, (dlId) => {
            if (!dlId) chrome.tabs.create({ url: m.url });
          });
        });
        el.appendChild(btn);
        dom.materialsList.appendChild(el);
      });
    }
  );

  dom.materialsCard.classList.toggle("hidden", materials.length === 0);
};

// ─── Dashboard render ─────────────────────────────────────────────────────────
const renderDashboard = async () => {
  const syncStatus = await getSyncStatus();
  const courseIds  = Object.keys(currentData?.metricsByCourse || {});
  const hasData    = courseIds.length > 0;

  renderAccountBanner(currentData, syncStatus);
  renderStats(currentData || {});

  if (!hasData) {
    dom.courseCard.classList.add("hidden");
    dom.materialsCard.classList.add("hidden");
    return;
  }

  dom.courseCard.classList.remove("hidden");
  renderCourseSelector(courseIds);

  const metrics = { ...(currentData?.metricsByCourse?.[currentCourseId] || {}) };
  metrics.active_days_count = currentData?.behavior?.active_days_count || metrics.active_days_count || 0;
  renderPerformance(metrics);
  renderMaterials(currentCourseId);

  // Last sync time
  if (syncStatus.lastSyncAt) {
    const d = new Date(syncStatus.lastSyncAt);
    dom.lastSyncLabel.textContent = `Last synced: ${d.toLocaleString()}`;
  }
};

// ─── Sync to backend ──────────────────────────────────────────────────────────
const sanitizePayload = (data) => {
  if (!data) return null;
  const { events, grades, materials, courses, behavior, student, metricsByCourse } = data;
  return {
    student,
    courses,
    behavior,
    metricsByCourse,
    events:    (events    || []).map(({ _id,   ...e }) => e),
    grades:    (grades    || []).map(({ _key,  ...g }) => g),
    materials: (materials || []).map(({ _key,  ...m }) => m),
  };
};

const syncToBackend = async (data) => {
  const payload = sanitizePayload(data);
  if (!payload) throw new Error("No data to sync.");

  const url = `${apiBaseUrl}${SYNC_ENDPOINT}`;
  const res  = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Server returned ${res.status}${body ? ": " + body.slice(0, 120) : ""}`);
  }

  const result = await res.json();
  // Persist the AcademIQ user id if the backend resolves it
  await saveSyncStatus({
    lastSyncAt:      new Date().toISOString(),
    academiq_user_id: result?.academiq_user_id || result?.user_id || null,
  });
  return result;
};

// ─── Full scan + sync flow ────────────────────────────────────────────────────
const runSync = async () => {
  dom.syncBtn.disabled = true;
  dom.syncProgress.classList.remove("hidden");
  dom.syncResult.classList.add("hidden");
  setStatus("syncing");

  try {
    // Step 1: ask content script to scan all courses
    setProgress(10, "Requesting scan from Moodle tab...");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab?.id) {
      await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id, { type: "scrape_all_courses" }, (response) => {
          if (chrome.runtime.lastError) {
            // Content script may not be injected on non-Moodle tabs — continue anyway
            resolve(null);
            return;
          }
          resolve(response);
        });
      });
    }

    setProgress(50, "Syncing to AcademIQ backend...");

    // Step 2: read stored data and push to backend
    const data = await getStorageData();
    if (!data) throw new Error("No Moodle data found. Open a Moodle course page first.");

    await syncToBackend(data);
    setProgress(100, "Done");

    // Step 3: refresh UI
    currentData = await getStorageData();
    await renderDashboard();

    setStatus("success");
    showSyncResult(true, `✓ Synced successfully at ${new Date().toLocaleTimeString()}`);
  } catch (err) {
    setStatus("error");
    showSyncResult(false, `✗ ${err.message}`);
  } finally {
    dom.syncBtn.disabled = false;
    setTimeout(() => dom.syncProgress.classList.add("hidden"), 1500);
  }
};

// ─── Scan all courses (without pushing to backend) ────────────────────────────
const runScanAll = async () => {
  dom.scanAllBtn.disabled = true;
  dom.scanAllBtn.textContent = "Scanning...";
  setStatus("syncing");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab found.");

    await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { type: "scrape_all_courses" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          reject(new Error("Open a Moodle page first, then try again."));
          return;
        }
        if (response.status === "done") {
          resolve(response);
        } else {
          reject(new Error(response.error || "Scan failed."));
        }
      });
    });

    currentData = await getStorageData();
    await renderDashboard();
    setStatus("success");
    showSyncResult(true, "✓ Courses scanned. Click Sync Now to push data.");
  } catch (err) {
    setStatus("error");
    showSyncResult(false, `✗ ${err.message}`);
  } finally {
    dom.scanAllBtn.disabled = false;
    dom.scanAllBtn.textContent = "Scan All Courses";
  }
};

// ─── Open AcademIQ ────────────────────────────────────────────────────────────
dom.openAcademiqBtn.addEventListener("click", () => {
  const base = apiBaseUrl.includes(":8000") ? "http://localhost:3000" : apiBaseUrl;
  chrome.tabs.create({ url: base });
});

// ─── Download all files ───────────────────────────────────────────────────────
dom.downloadAllBtn.addEventListener("click", async () => {
  const materials = getCourseMaterials(currentCourseId).filter(isDownloadable);
  for (let i = 0; i < materials.length; i++) {
    const m = materials[i];
    chrome.downloads.download({
      url: m.url,
      filename: `${(m.title || `material_${i + 1}`).replace(/[\\/:*?"<>|]+/g, "_")}.${(m.fileType || "bin").replace(/[^a-z0-9]/gi, "") || "bin"}`,
      conflictAction: "uniquify",
      saveAs: false,
    });
  }
});

// ─── Export JSON ──────────────────────────────────────────────────────────────
dom.downloadJsonBtn.addEventListener("click", async () => {
  const data = await getStorageData();
  if (!data) return;
  const blob = new Blob([JSON.stringify(sanitizePayload(data), null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "moodle_student_data.json";
  a.click();
  URL.revokeObjectURL(url);
});

// ─── Clear data ───────────────────────────────────────────────────────────────
dom.clearDataBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "clear_data" }, () => {
    currentData     = null;
    currentCourseId = null;
    renderDashboard();
    dom.lastSyncLabel.textContent = "Data cleared";
  });
});

// ─── Course selector change ───────────────────────────────────────────────────
dom.courseSelector.addEventListener("change", () => {
  currentCourseId = dom.courseSelector.value;
  const metrics = { ...(currentData?.metricsByCourse?.[currentCourseId] || {}) };
  metrics.active_days_count = currentData?.behavior?.active_days_count || 0;
  renderPerformance(metrics);
  renderMaterials(currentCourseId);
});

// ─── Event bindings ───────────────────────────────────────────────────────────
dom.syncBtn.addEventListener("click", runSync);
dom.scanAllBtn.addEventListener("click", runScanAll);
dom.saveSettingsBtn.addEventListener("click", saveSettings);
dom.refreshBtn.addEventListener("click", async () => {
  currentData = await getStorageData();
  await renderDashboard();
});

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  currentData = await getStorageData();
  await renderDashboard();

  // Auto-sync if enabled and data exists
  const settings = await new Promise((r) => chrome.storage.local.get(SETTINGS_KEY, (res) => r(res[SETTINGS_KEY] || {})));
  if (settings.autoSync && currentData) {
    await runSync();
  }
});
