// popup.js — AcademIQ Extension
// Handles UI rendering, sync, magic-link open, settings, and all animations.
"use strict";

// ── Constants ─────────────────────────────────────────────────────────────────
const STORAGE_KEY     = "moodleData";
const SETTINGS_KEY    = "academiqSettings";
const SYNC_STATUS_KEY = "academiqSyncStatus";
const SYNC_ENDPOINT   = "/raw-moodle-payloads";
const DEFAULT_API_URL = "http://localhost:8000";
const DEFAULT_APP_URL = "http://localhost:3000";

// ── DOM helpers ───────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const dom = {
  statusDot:        $("statusDot"),
  statusLabel:      $("statusLabel"),
  accountBanner:    $("accountBanner"),
  accountAvatar:    $("accountAvatar"),
  accountLabel:     $("accountLabel"),
  accountEmail:     $("accountEmail"),
  openAcademiqBtn:  $("openAcademiqBtn"),
  openAcademiqMsg:  $("openAcademiqMsg"),
  lastSyncLabel:    $("lastSyncLabel"),
  syncBtn:          $("syncBtn"),
  syncIcon:         $("syncBtn").querySelector(".sync-icon"),
  syncLabel:        $("syncBtn").querySelector(".sync-label"),
  syncProgress:     $("syncProgress"),
  progressFill:     $("progressFill"),
  progressLabel:    $("progressLabel"),
  syncResult:       $("syncResult"),
  statsCard:        $("statsCard"),
  statCourses:      $("statCourses"),
  statMaterials:    $("statMaterials"),
  statActiveDays:   $("statActiveDays"),
  statClicks:       $("statClicks"),
  courseCard:       $("courseCard"),
  courseSelector:   $("courseSelector"),
  performanceStats: $("performanceStats"),
  materialsCard:    $("materialsCard"),
  downloadMeta:     $("downloadMeta"),
  downloadAllBtn:   $("downloadAllBtn"),
  materialsList:    $("materialsList"),
  apiUrlInput:      $("apiUrlInput"),
  autoSyncToggle:   $("autoSyncToggle"),
  saveSettingsBtn:  $("saveSettingsBtn"),
  settingsSaved:    $("settingsSaved"),
  refreshBtn:       $("refreshBtn"),
  scanAllBtn:       $("scanAllBtn"),
  downloadJsonBtn:  $("downloadJsonBtn"),
  clearDataBtn:     $("clearDataBtn"),
};

// ── State ─────────────────────────────────────────────────────────────────────
let currentData     = null;
let currentCourseId = null;
let apiBaseUrl      = DEFAULT_API_URL;
let appBaseUrl      = DEFAULT_APP_URL;

// ── Ripple effect ─────────────────────────────────────────────────────────────
document.querySelectorAll(".ripple").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const wave = document.createElement("span");
    wave.className = "ripple-wave";
    wave.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`;
    btn.appendChild(wave);
    wave.addEventListener("animationend", () => wave.remove());
  });
});

// ── Settings ──────────────────────────────────────────────────────────────────
const loadSettings = () =>
  new Promise((resolve) => {
    chrome.storage.local.get(SETTINGS_KEY, (res) => {
      const s = res[SETTINGS_KEY] || {};
      apiBaseUrl = (s.apiUrl || DEFAULT_API_URL).replace(/\/$/, "");
      appBaseUrl = apiBaseUrl.includes(":8000")
        ? DEFAULT_APP_URL
        : apiBaseUrl;
      dom.apiUrlInput.value      = apiBaseUrl;
      dom.autoSyncToggle.checked = Boolean(s.autoSync);
      resolve(s);
    });
  });

const saveSettings = () => {
  const url = dom.apiUrlInput.value.trim().replace(/\/$/, "") || DEFAULT_API_URL;
  apiBaseUrl = url;
  appBaseUrl = url.includes(":8000") ? DEFAULT_APP_URL : url;
  chrome.storage.local.set({
    [SETTINGS_KEY]: { apiUrl: url, autoSync: dom.autoSyncToggle.checked },
  });
  dom.settingsSaved.classList.remove("hidden");
  setTimeout(() => dom.settingsSaved.classList.add("hidden"), 1500);
};

// ── Storage helpers ───────────────────────────────────────────────────────────
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
      chrome.storage.local.set(
        { [SYNC_STATUS_KEY]: { ...(res[SYNC_STATUS_KEY] || {}), ...patch } },
        resolve
      );
    });
  });

// ── Status helpers ────────────────────────────────────────────────────────────
const setStatus = (state, label) => {
  dom.statusDot.className   = `status-dot ${state}`;
  dom.statusLabel.textContent = label || { idle: "Idle", syncing: "Syncing…", success: "Synced", error: "Error" }[state] || state;
};

const showSyncResult = (ok, msg) => {
  dom.syncResult.textContent = msg;
  dom.syncResult.className   = `sync-result ${ok ? "ok" : "err"}`;
  dom.syncResult.classList.remove("hidden");
  setTimeout(() => dom.syncResult.classList.add("hidden"), 4000);
};

const setProgress = (pct, label) => {
  dom.progressFill.style.width  = `${pct}%`;
  dom.progressLabel.textContent = label;
};

// ── Count-up animation ────────────────────────────────────────────────────────
const countUp = (el, target, duration = 300) => {
  const start = performance.now();
  const from  = parseInt(el.textContent, 10) || 0;
  if (from === target) return;
  const step = (now) => {
    const t = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(from + (target - from) * t);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

// ── Dedup courses ─────────────────────────────────────────────────────────────
// source of truth: metricsByCourse keys (already unique by course_id).
// Prefer a real course_name over "Course {id}".
const getDeduplicatedCourses = (data) => {
  const map = new Map();
  const metrics = data?.metricsByCourse || {};
  for (const [id, m] of Object.entries(metrics)) {
    const name = m?.course_name || "";
    const existing = map.get(id);
    const isGeneric = /^course\s+\d+$/i.test(name);
    if (!existing || (!isGeneric && /^course\s+\d+$/i.test(existing.course_name || ""))) {
      map.set(id, { course_id: id, course_name: name || `Course ${id}`, ...m });
    }
  }
  return Array.from(map.values());
};

// ── Account banner ────────────────────────────────────────────────────────────
const renderAccountBanner = (data, syncStatus) => {
  const student  = data?.student || {};
  const linkedId = syncStatus?.academiq_user_id;
  const name     = student.full_name || student.email || "";
  const initial  = (name.charAt(0) || "?").toUpperCase();

  dom.accountAvatar.textContent = initial;
  dom.accountBanner.classList.remove("hidden");

  if (linkedId) {
    dom.accountLabel.textContent = "Linked to AcademIQ ✓";
    dom.accountEmail.textContent = student.email || student.full_name || `ID: ${linkedId.slice(-6)}`;
    dom.accountAvatar.style.background = "var(--success)";
  } else if (student.email || student.moodle_user_id) {
    dom.accountLabel.textContent = "Moodle identity detected";
    dom.accountEmail.textContent = student.email || `Moodle ID: ${student.moodle_user_id}`;
    dom.accountAvatar.style.background = "var(--warning)";
  } else {
    dom.accountLabel.textContent = "Not linked — browse Moodle first";
    dom.accountEmail.textContent = "Open a Moodle course page to detect identity";
    dom.accountAvatar.style.background = "var(--subtle)";
  }
};

// ── Stats ─────────────────────────────────────────────────────────────────────
const renderStats = (data) => {
  const courses   = getDeduplicatedCourses(data);
  const materials = (data?.materials || []).length;
  const activeDays = data?.behavior?.active_days_count || 0;
  const clicks    = courses.reduce((s, c) => s + (c.click_count || 0), 0);

  const wasHidden = dom.statsCard.classList.contains("hidden");
  dom.statsCard.classList.toggle("hidden", courses.length === 0);

  if (courses.length > 0) {
    countUp(dom.statCourses,    courses.length,  wasHidden ? 300 : 0);
    countUp(dom.statMaterials,  materials,       wasHidden ? 300 : 0);
    countUp(dom.statActiveDays, activeDays,      wasHidden ? 300 : 0);
    countUp(dom.statClicks,     clicks,          wasHidden ? 300 : 0);
  }
};

// ── Course selector ───────────────────────────────────────────────────────────
const renderCourseSelector = (courses) => {
  dom.courseSelector.innerHTML = "";
  courses.forEach(({ course_id, course_name }) => {
    const opt = document.createElement("option");
    opt.value       = course_id;
    opt.textContent = course_name;
    dom.courseSelector.appendChild(opt);
  });
  if (!currentCourseId || !courses.some((c) => c.course_id === currentCourseId)) {
    currentCourseId = courses[0]?.course_id || null;
  }
  dom.courseSelector.value = currentCourseId || "";
};

const renderPerformance = (metrics) => {
  dom.performanceStats.innerHTML = "";
  [
    ["Visits",      metrics.total_visits               || 0],
    ["Time (min)",  Math.round((metrics.total_time_spent_seconds || 0) / 60)],
    ["Resources",   metrics.number_of_resources_clicked || 0],
    ["Assignments", metrics.number_of_assignments_viewed || 0],
    ["Quizzes",     metrics.quiz_attempts               || 0],
    ["Submissions", metrics.assignment_submissions       || 0],
  ].forEach(([label, value]) => {
    const el = document.createElement("div");
    el.className = "stat";
    el.innerHTML = `<div class="stat-value">${value}</div><div class="stat-label">${label}</div>`;
    dom.performanceStats.appendChild(el);
  });
};

// ── Materials ─────────────────────────────────────────────────────────────────
const fileIcon = (type) => {
  const t = (type || "").toLowerCase();
  if (t === "pdf")                      return "📄";
  if (["doc", "docx"].includes(t))      return "📝";
  if (["ppt", "pptx"].includes(t))      return "📊";
  if (["xls", "xlsx"].includes(t))      return "📈";
  if (t === "link")                     return "🔗";
  if (t === "folder")                   return "📁";
  return "📎";
};

const isDownloadable = (m) => {
  const ft = (m.fileType || "").toLowerCase();
  if (["folder", "html", "link"].includes(ft)) return false;
  if (m.downloadStatus === "No downloadable files") return false;
  return (
    /^https?:/i.test(m.url || "") &&
    (m.downloadable || /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|zip)([\?#]|$)/i.test(m.url))
  );
};

const getCourseMaterials = (courseId) =>
  (Array.isArray(currentData?.materials) ? currentData.materials : [])
    .filter((m) => (m.courseId || m.course_id) === courseId)
    .map((m) => ({
      id:          m.id || m.material_id,
      courseId:    m.courseId || m.course_id || courseId,
      title:       m.title || "Untitled",
      type:        m.type  || m.material_type || "unknown",
      fileType:    m.fileType || m.file_type  || "unknown",
      url:         m.url || "",
      downloadable: Boolean(m.downloadable),
    }));

const renderMaterials = (courseId) => {
  const materials = getCourseMaterials(courseId);
  const groups    = { lecture: [], lab: [], other: [] };
  materials.forEach((m) => {
    const t = (m.type || "").toLowerCase();
    if (t === "lecture") groups.lecture.push(m);
    else if (t === "lab") groups.lab.push(m);
    else groups.other.push(m);
  });

  dom.materialsList.innerHTML = "";
  const dlCount = materials.filter(isDownloadable).length;
  dom.downloadMeta.textContent = `${materials.length} total · ${dlCount} downloadable`;
  dom.downloadAllBtn.disabled  = dlCount === 0;

  let stagger = 0;
  [["Lecture", groups.lecture], ["Lab", groups.lab], ["Other", groups.other]].forEach(
    ([label, items]) => {
      if (!items.length) return;
      const groupEl = document.createElement("div");
      groupEl.className   = "material-group-label";
      groupEl.textContent = `${label} (${items.length})`;
      dom.materialsList.appendChild(groupEl);

      items.forEach((m, idx) => {
        const canDl = isDownloadable(m);
        const el    = document.createElement("div");
        el.className = "material-item";
        el.style.setProperty("--stagger", `${stagger * 30}ms`);
        stagger++;
        el.innerHTML = `
          <span class="material-icon">${fileIcon(m.fileType)}</span>
          <div class="material-info">
            <div class="material-title" title="${m.title}">${m.title}</div>
            <div class="material-type">${m.type} · ${(m.fileType || "?").toUpperCase()}</div>
          </div>`;
        const btn = document.createElement("button");
        btn.type      = "button";
        btn.className = "btn btn-ghost btn-sm ripple";
        btn.textContent = canDl ? "↓" : "↗";
        btn.title       = canDl ? "Download" : "View on Moodle";
        btn.disabled    = !m.url;
        btn.addEventListener("click", () => {
          if (!canDl) { chrome.tabs.create({ url: m.url }); return; }
          const filename = `${(m.title || `file_${idx + 1}`).replace(/[\\/:*?"<>|]+/g, "_")}.${(m.fileType || "bin").replace(/[^a-z0-9]/gi, "") || "bin"}`;
          chrome.downloads.download({ url: m.url, filename, conflictAction: "uniquify", saveAs: false },
            (dlId) => { if (!dlId) chrome.tabs.create({ url: m.url }); });
        });
        el.appendChild(btn);
        dom.materialsList.appendChild(el);
      });
    }
  );

  dom.materialsCard.classList.toggle("hidden", materials.length === 0);
};

// ── Dashboard render ──────────────────────────────────────────────────────────
const renderDashboard = async () => {
  const syncStatus = await getSyncStatus();
  const courses    = getDeduplicatedCourses(currentData || {});
  const hasData    = courses.length > 0;

  renderAccountBanner(currentData, syncStatus);
  renderStats(currentData || {});

  if (syncStatus.lastSyncAt) {
    dom.lastSyncLabel.textContent = `Last synced: ${new Date(syncStatus.lastSyncAt).toLocaleString()}`;
  }

  if (!hasData) {
    dom.courseCard.classList.add("hidden");
    dom.materialsCard.classList.add("hidden");
    return;
  }

  dom.courseCard.classList.remove("hidden");
  renderCourseSelector(courses);

  const metrics = { ...(currentData?.metricsByCourse?.[currentCourseId] || {}) };
  metrics.active_days_count = currentData?.behavior?.active_days_count || metrics.active_days_count || 0;
  renderPerformance(metrics);
  renderMaterials(currentCourseId);
};

// ── Sync button state machine ─────────────────────────────────────────────────
const setSyncState = (state) => {
  if (state === "syncing") {
    dom.syncBtn.disabled = true;
    dom.syncBtn.classList.add("syncing");
    dom.syncLabel.textContent = "Syncing…";
  } else if (state === "success") {
    dom.syncBtn.classList.remove("syncing");
    dom.syncBtn.classList.add("sync-btn-success");
    dom.syncLabel.textContent = "✓ Synced";
    setTimeout(() => {
      dom.syncBtn.classList.remove("sync-btn-success");
      dom.syncBtn.disabled      = false;
      dom.syncLabel.textContent = "Sync Now";
    }, 3000);
  } else if (state === "error") {
    dom.syncBtn.classList.remove("syncing");
    dom.syncBtn.classList.add("sync-btn-error");
    dom.syncLabel.textContent = "✗ Failed";
    setTimeout(() => {
      dom.syncBtn.classList.remove("sync-btn-error");
      dom.syncBtn.disabled      = false;
      dom.syncLabel.textContent = "Sync Now";
    }, 3000);
  } else {
    dom.syncBtn.classList.remove("syncing", "sync-btn-success", "sync-btn-error");
    dom.syncBtn.disabled      = false;
    dom.syncLabel.textContent = "Sync Now";
  }
};

// ── Payload sanitizer ─────────────────────────────────────────────────────────
const sanitizePayload = (data) => {
  if (!data) return null;
  const { events, grades, materials, courses, behavior, student, metricsByCourse } = data;
  return {
    student,
    courses,
    behavior,
    metricsByCourse,
    events:    (events    || []).map(({ _id,  ...e }) => e),
    grades:    (grades    || []).map(({ _key, ...g }) => g),
    materials: (materials || []).map(({ _key, ...m }) => m),
  };
};

// ── Sync to backend ───────────────────────────────────────────────────────────
const syncToBackend = async (data) => {
  const payload = sanitizePayload(data);
  if (!payload) throw new Error("No data to sync.");

  const res = await fetch(`${apiBaseUrl}${SYNC_ENDPOINT}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Server returned ${res.status}${body ? ": " + body.slice(0, 120) : ""}`);
  }

  const result = await res.json();
  // Persist user link so "Open AcademIQ" can issue a magic-link.
  await saveSyncStatus({
    lastSyncAt:       new Date().toISOString(),
    academiq_user_id: result?.academiq_user_id || null,
  });
  return result;
};

// ── Full sync flow ────────────────────────────────────────────────────────────
const runSync = async () => {
  setSyncState("syncing");
  dom.syncProgress.classList.remove("hidden");
  dom.syncResult.classList.add("hidden");
  setStatus("syncing");

  try {
    setProgress(10, "Requesting Moodle scan…");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, { type: "scrape_all_courses" }, (res) => {
          if (chrome.runtime.lastError) resolve(null);
          else resolve(res);
        });
      });
    }

    setProgress(55, "Pushing to AcademIQ…");
    const data = await getStorageData();
    if (!data) throw new Error("No Moodle data found. Open a Moodle course page first.");

    await syncToBackend(data);
    setProgress(100, "Done");

    currentData = await getStorageData();
    await renderDashboard();

    setStatus("success");
    setSyncState("success");
    showSyncResult(true, `✓ Synced at ${new Date().toLocaleTimeString()}`);
  } catch (err) {
    setStatus("error");
    setSyncState("error");
    showSyncResult(false, `✗ ${err.message}`);
  } finally {
    setTimeout(() => {
      dom.syncProgress.classList.add("hidden");
      setProgress(0, "");
    }, 1500);
  }
};

// ── Scan all courses (without pushing) ───────────────────────────────────────
const runScanAll = async () => {
  dom.scanAllBtn.disabled     = true;
  dom.scanAllBtn.textContent  = "Scanning…";
  setStatus("syncing");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab.");

    await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { type: "scrape_all_courses" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          reject(new Error("Open a Moodle page first, then try again."));
        } else if (response.status === "done") {
          resolve(response);
        } else {
          reject(new Error(response.error || "Scan failed."));
        }
      });
    });

    currentData = await getStorageData();
    await renderDashboard();
    setStatus("success");
    showSyncResult(true, "✓ Courses scanned. Click Sync Now to push to AcademIQ.");
  } catch (err) {
    setStatus("error");
    showSyncResult(false, `✗ ${err.message}`);
  } finally {
    dom.scanAllBtn.disabled    = false;
    dom.scanAllBtn.textContent = "Scan All";
  }
};

// ── Open AcademIQ (magic-link flow) ──────────────────────────────────────────
dom.openAcademiqBtn.addEventListener("click", async () => {
  const syncStatus      = await getSyncStatus();
  const academiqUserId  = syncStatus?.academiq_user_id;

  dom.openAcademiqMsg.classList.add("hidden");

  if (!academiqUserId) {
    dom.openAcademiqMsg.textContent = "Sync first to link your account.";
    dom.openAcademiqMsg.classList.remove("hidden");
    return;
  }

  dom.openAcademiqBtn.disabled    = true;
  dom.openAcademiqBtn.textContent = "Opening…";

  try {
    const res = await fetch(`${apiBaseUrl}/api/auth/magic-link`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ academiq_user_id: academiqUserId }),
    });

    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const { token } = await res.json();
    chrome.tabs.create({ url: `${appBaseUrl}/magic-login?token=${encodeURIComponent(token)}` });
  } catch (err) {
    dom.openAcademiqMsg.textContent = `Could not open AcademIQ: ${err.message}`;
    dom.openAcademiqMsg.classList.remove("hidden");
  } finally {
    setTimeout(() => {
      dom.openAcademiqBtn.disabled    = false;
      dom.openAcademiqBtn.textContent = "Open ↗";
    }, 2000);
  }
});

// ── Course selector change ────────────────────────────────────────────────────
dom.courseSelector.addEventListener("change", () => {
  currentCourseId = dom.courseSelector.value;
  const metrics   = { ...(currentData?.metricsByCourse?.[currentCourseId] || {}) };
  metrics.active_days_count = currentData?.behavior?.active_days_count || 0;
  renderPerformance(metrics);
  renderMaterials(currentCourseId);
});

// ── Download all ──────────────────────────────────────────────────────────────
dom.downloadAllBtn.addEventListener("click", () => {
  getCourseMaterials(currentCourseId)
    .filter(isDownloadable)
    .forEach((m, i) => {
      const filename = `${(m.title || `file_${i + 1}`).replace(/[\\/:*?"<>|]+/g, "_")}.${(m.fileType || "bin").replace(/[^a-z0-9]/gi, "") || "bin"}`;
      chrome.downloads.download({ url: m.url, filename, conflictAction: "uniquify", saveAs: false });
    });
});

// ── Export JSON ───────────────────────────────────────────────────────────────
dom.downloadJsonBtn.addEventListener("click", async () => {
  const data = await getStorageData();
  if (!data) return;
  const blob = new Blob([JSON.stringify(sanitizePayload(data), null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: "moodle_student_data.json" });
  a.click();
  URL.revokeObjectURL(url);
});

// ── Clear data ────────────────────────────────────────────────────────────────
dom.clearDataBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "clear_data" }, () => {
    currentData     = null;
    currentCourseId = null;
    dom.lastSyncLabel.textContent = "Data cleared";
    renderDashboard();
  });
});

// ── Other bindings ────────────────────────────────────────────────────────────
dom.syncBtn.addEventListener("click", runSync);
dom.scanAllBtn.addEventListener("click", runScanAll);
dom.saveSettingsBtn.addEventListener("click", saveSettings);
dom.refreshBtn.addEventListener("click", async () => {
  currentData = await getStorageData();
  await renderDashboard();
});

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  currentData = await getStorageData();
  await renderDashboard();

  const s = await new Promise((r) =>
    chrome.storage.local.get(SETTINGS_KEY, (res) => r(res[SETTINGS_KEY] || {}))
  );
  if (s.autoSync && currentData) {
    await runSync();
  }
});
