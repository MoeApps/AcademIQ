// popup.js — AcademIQ Extension v3
// All features: ML insight, course/grade derivation from materials+grades,
// streak, sync diff, history, search, backend health, magic-link open.
"use strict";

// ── Constants ─────────────────────────────────────────────────────────────────
const STORAGE_KEY      = "moodleData";
const SETTINGS_KEY     = "academiqSettings";
const SYNC_STATUS_KEY  = "academiqSyncStatus";
const HISTORY_KEY      = "academiqSyncHistory";
const SYNC_ENDPOINT    = "/raw-moodle-payloads";
const ML_ENDPOINT      = "/api/ml/result";
const STATUS_ENDPOINT  = "/api/system/status";
const MAGIC_ENDPOINT   = "/api/auth/magic-link";
const DEFAULT_API_URL  = "http://localhost:8000";
const DEFAULT_APP_URL  = "http://localhost:3000";
const MAX_HISTORY      = 5;

// ── DOM ───────────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const dom = {
  backendDot:       $("backendDot"),
  statusDot:        $("statusDot"),
  statusLabel:      $("statusLabel"),
  accountBanner:    $("accountBanner"),
  accountAvatar:    $("accountAvatar"),
  accountName:      $("accountName"),
  accountEmail:     $("accountEmail"),
  accountMeta:      $("accountMeta"),
  openAcademiqBtn:  $("openAcademiqBtn"),
  openMsg:          $("openMsg"),
  mlCard:           $("mlCard"),
  mlBadge:          $("mlBadge"),
  mlBody:           $("mlBody"),
  lastSyncLabel:    $("lastSyncLabel"),
  syncBtn:          $("syncBtn"),
  syncIcon:         $("syncBtn").querySelector(".sync-icon"),
  syncLabel:        $("syncBtn").querySelector(".sync-label"),
  syncProgress:     $("syncProgress"),
  progressFill:     $("progressFill"),
  progressLabel:    $("progressLabel"),
  syncDiff:         $("syncDiff"),
  syncResult:       $("syncResult"),
  statsCard:        $("statsCard"),
  statCourses:      $("statCourses"),
  statMaterials:    $("statMaterials"),
  statStreak:       $("statStreak"),
  statGrades:       $("statGrades"),
  gradesCard:       $("gradesCard"),
  gradesList:       $("gradesList"),
  courseCard:       $("courseCard"),
  courseSelector:   $("courseSelector"),
  performanceStats: $("performanceStats"),
  materialsCard:    $("materialsCard"),
  materialSearch:   $("materialSearch"),
  downloadMeta:     $("downloadMeta"),
  downloadAllBtn:   $("downloadAllBtn"),
  materialsList:    $("materialsList"),
  historyCard:      $("historyCard"),
  historyList:      $("historyList"),
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
let allMaterials    = []; // current course materials, cached for search

// ── Ripple ────────────────────────────────────────────────────────────────────
document.querySelectorAll(".ripple").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const r = btn.getBoundingClientRect();
    const s = Math.max(r.width, r.height);
    const w = document.createElement("span");
    w.className = "ripple-wave";
    w.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX-r.left-s/2}px;top:${e.clientY-r.top-s/2}px`;
    btn.appendChild(w);
    w.addEventListener("animationend", () => w.remove());
  });
});

// ── Settings ──────────────────────────────────────────────────────────────────
const loadSettings = () =>
  new Promise((resolve) => {
    chrome.storage.local.get(SETTINGS_KEY, (res) => {
      const s = res[SETTINGS_KEY] || {};
      apiBaseUrl = (s.apiUrl || DEFAULT_API_URL).replace(/\/$/, "");
      appBaseUrl = apiBaseUrl.includes(":8000") ? DEFAULT_APP_URL : apiBaseUrl;
      dom.apiUrlInput.value      = apiBaseUrl;
      dom.autoSyncToggle.checked = Boolean(s.autoSync);
      resolve(s);
    });
  });

const saveSettings = () => {
  const url = dom.apiUrlInput.value.trim().replace(/\/$/, "") || DEFAULT_API_URL;
  apiBaseUrl = url;
  appBaseUrl = url.includes(":8000") ? DEFAULT_APP_URL : url;
  chrome.storage.local.set({ [SETTINGS_KEY]: { apiUrl: url, autoSync: dom.autoSyncToggle.checked } });
  dom.settingsSaved.classList.remove("hidden");
  setTimeout(() => dom.settingsSaved.classList.add("hidden"), 1500);
};

// ── Storage ───────────────────────────────────────────────────────────────────
const getStorageData  = () => new Promise((r) => chrome.storage.local.get(STORAGE_KEY, (res) => r(res[STORAGE_KEY] || null)));
const getSyncStatus   = () => new Promise((r) => chrome.storage.local.get(SYNC_STATUS_KEY, (res) => r(res[SYNC_STATUS_KEY] || {})));
const getHistory      = () => new Promise((r) => chrome.storage.local.get(HISTORY_KEY, (res) => r(res[HISTORY_KEY] || [])));

const saveSyncStatus = (patch) =>
  new Promise((r) => chrome.storage.local.get(SYNC_STATUS_KEY, (res) => {
    chrome.storage.local.set({ [SYNC_STATUS_KEY]: { ...(res[SYNC_STATUS_KEY] || {}), ...patch } }, r);
  }));

const pushHistory = (entry) =>
  new Promise((r) => chrome.storage.local.get(HISTORY_KEY, (res) => {
    const h = [entry, ...(res[HISTORY_KEY] || [])].slice(0, MAX_HISTORY);
    chrome.storage.local.set({ [HISTORY_KEY]: h }, r);
  }));

// ── Status helpers ────────────────────────────────────────────────────────────
const setStatus = (state) => {
  dom.statusDot.className = `status-dot ${state}`;
  dom.statusLabel.textContent = { idle: "Idle", syncing: "Syncing…", success: "Synced", error: "Error" }[state] || state;
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

// ── Count-up ──────────────────────────────────────────────────────────────────
const countUp = (el, target, duration = 280) => {
  const from = parseInt(el.textContent, 10) || 0;
  if (from === target) return;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(from + (target - from) * t);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

// ── Derive courses from materials (works when metricsByCourse is empty) ───────
const getCoursesFromMaterials = (data) => {
  const map = new Map();
  for (const m of (data?.materials || [])) {
    const id   = m.courseId || m.course_id;
    const name = m.course_name || m.courseName || `Course ${id}`;
    if (!id) continue;
    const existing = map.get(id);
    const generic  = /^course\s*\d+$/i.test(name);
    if (!existing || (!generic && /^course\s*\d+$/i.test(existing.name))) {
      map.set(id, { id, name });
    }
  }
  // Also merge metricsByCourse if populated
  for (const [id, m] of Object.entries(data?.metricsByCourse || {})) {
    const name = m?.course_name || `Course ${id}`;
    if (!map.has(id)) map.set(id, { id, name, metrics: m });
    else map.get(id).metrics = m;
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
};

// ── Derive grades per course ───────────────────────────────────────────────────
const getGradesByCourse = (data) => {
  const courseMap = {};
  for (const g of (data?.grades || [])) {
    const cid = g.course_id;
    if (!cid) continue;
    if (!courseMap[cid]) courseMap[cid] = { quiz: [], assignment: [] };
    const pct = g.percentage;
    if (typeof pct === "number") {
      if ((g.item_type || "").toLowerCase().includes("quiz")) courseMap[cid].quiz.push(pct);
      else courseMap[cid].assignment.push(pct);
    }
  }
  return courseMap;
};

const avg = (arr) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;

// ── Study streak ───────────────────────────────────────────────────────────────
const computeStreak = (data) => {
  const days = (data?._meta?.activeDays || []).slice().sort().reverse();
  if (!days.length) return 0;
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (const d of days) {
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    const diff = Math.round((cursor - day) / 86400000);
    if (diff <= 1) { streak++; cursor = day; }
    else break;
  }
  return streak;
};

// ── Overall avg score from grades ─────────────────────────────────────────────
const overallAvgScore = (data) => {
  const pcts = (data?.grades || []).map((g) => g.percentage).filter((p) => typeof p === "number");
  return pcts.length ? Math.round(avg(pcts)) : null;
};

// ── Backend health check ──────────────────────────────────────────────────────
const checkBackendHealth = async () => {
  try {
    const res = await fetch(`${apiBaseUrl}${STATUS_ENDPOINT}`, { signal: AbortSignal.timeout(3000) });
    const ok  = res.ok && (await res.json())?.backend?.connected;
    dom.backendDot.className = `backend-dot ${ok ? "ok" : "err"}`;
    dom.backendDot.title     = ok ? "Backend connected" : "Backend unreachable";
  } catch {
    dom.backendDot.className = "backend-dot err";
    dom.backendDot.title     = "Backend unreachable";
  }
};

// ── ML result ─────────────────────────────────────────────────────────────────
const fetchAndRenderML = async (academiqUserId) => {
  if (!academiqUserId) { dom.mlCard.classList.add("hidden"); return; }
  try {
    const res  = await fetch(`${apiBaseUrl}${ML_ENDPOINT}?academiq_user_id=${academiqUserId}`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error("no result");
    const data = await res.json();
    renderMLCard(data);
  } catch {
    renderMLCard(null);
  }
};

const renderMLCard = (data) => {
  dom.mlCard.classList.remove("hidden");
  if (!data?.available || !data?.prediction) {
    dom.mlBadge.textContent  = "Offline";
    dom.mlBadge.className    = "ml-badge offline";
    dom.mlBody.textContent   = "AI models are not loaded. Sync again when the backend has the ML dependencies installed.";
    return;
  }
  const p    = data.prediction;
  const prob = Math.round((p.probability || 0) * 100);
  const isHP = (p.probability || 0) >= 0.5;

  dom.mlBadge.textContent = p.tier || (isHP ? "High Performer" : "At Risk");
  dom.mlBadge.className   = `ml-badge ${isHP ? "high" : "atrisk"}`;

  const recs    = p.recommendations || [];
  const maxImpact = Math.max(...recs.map((r) => Math.abs(r.shap_impact || 0)), 1);

  dom.mlBody.innerHTML = `
    <div style="display:flex;align-items:baseline;gap:6px">
      <span class="ml-prob">${prob}%</span>
      <span style="font-size:11px;color:var(--subtle)">confidence · ${p.classification || ""}</span>
    </div>
    ${recs.slice(0, 2).map((r) => {
      const w = Math.round((Math.abs(r.shap_impact || 0) / maxImpact) * 100);
      return `
        <div class="ml-driver">
          <span style="font-size:11px;flex-shrink:0">${r.icon || "•"}</span>
          <span style="font-size:11px;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.short || ""}</span>
          <div class="ml-driver-bar-wrap"><div class="ml-driver-bar" style="width:${w}%"></div></div>
        </div>`;
    }).join("")}
    ${recs[0] ? `<div class="ml-rec">💡 ${recs[0].action}</div>` : ""}
  `;
};

// ── Account banner ────────────────────────────────────────────────────────────
const renderAccountBanner = (data, syncStatus) => {
  const student  = data?.student || {};
  const linkedId = syncStatus?.academiq_user_id;
  const name     = student.full_name || student.email || "";
  dom.accountAvatar.textContent = (name.charAt(0) || "?").toUpperCase();
  dom.accountBanner.classList.remove("hidden");

  if (linkedId) {
    dom.accountAvatar.style.background = "var(--success)";
    dom.accountName.textContent  = name || "Linked account";
    dom.accountEmail.textContent = student.email || `Moodle ID: ${student.moodle_user_id}`;
    dom.accountMeta.textContent  = `✓ Linked to AcademIQ`;
  } else if (student.email || student.moodle_user_id) {
    dom.accountAvatar.style.background = "var(--warning)";
    dom.accountName.textContent  = name || "Moodle user";
    dom.accountEmail.textContent = student.email || `Moodle ID: ${student.moodle_user_id}`;
    dom.accountMeta.textContent  = "Sync to link your account";
  } else {
    dom.accountAvatar.style.background = "var(--subtle)";
    dom.accountName.textContent  = "Not detected";
    dom.accountEmail.textContent = "Open a Moodle page first";
    dom.accountMeta.textContent  = "";
  }
};

// ── Stats ─────────────────────────────────────────────────────────────────────
const renderStats = (data, courses) => {
  const materials  = (data?.materials || []).length;
  const streak     = computeStreak(data);
  const scoreVal   = overallAvgScore(data);
  const wasHidden  = dom.statsCard.classList.contains("hidden");
  dom.statsCard.classList.toggle("hidden", courses.length === 0 && materials === 0);

  if (courses.length > 0 || materials > 0) {
    countUp(dom.statCourses,   courses.length, wasHidden ? 280 : 0);
    countUp(dom.statMaterials, materials,      wasHidden ? 280 : 0);
    countUp(dom.statStreak,    streak,         wasHidden ? 280 : 0);
    dom.statGrades.textContent = scoreVal !== null ? `${scoreVal}%` : "–";
  }
};

// ── Grades card ───────────────────────────────────────────────────────────────
const renderGradesCard = (data, courses) => {
  const gradesByCourse = getGradesByCourse(data);
  const rows = courses.map((c) => {
    const g    = gradesByCourse[c.id] || { quiz: [], assignment: [] };
    const all  = [...g.quiz, ...g.assignment];
    const score = all.length ? Math.round(avg(all)) : null;
    return { name: c.name, score };
  }).filter((r) => r.score !== null);

  dom.gradesCard.classList.toggle("hidden", rows.length === 0);
  if (!rows.length) return;

  dom.gradesList.innerHTML = rows.map(({ name, score }) => {
    const cls = score >= 75 ? "good" : score >= 60 ? "warn" : "bad";
    return `
      <div class="grade-row">
        <span class="grade-course" title="${name}">${name}</span>
        <span class="grade-score ${cls}">${score}%</span>
      </div>`;
  }).join("");
};

// ── Course selector ───────────────────────────────────────────────────────────
const renderCourseSelector = (courses) => {
  dom.courseSelector.innerHTML = "";
  courses.forEach(({ id, name }) => {
    const opt = document.createElement("option");
    opt.value = id; opt.textContent = name;
    dom.courseSelector.appendChild(opt);
  });
  if (!currentCourseId || !courses.some((c) => c.id === currentCourseId)) {
    currentCourseId = courses[0]?.id || null;
  }
  dom.courseSelector.value = currentCourseId || "";
};

const renderPerformance = (courseId, data) => {
  const m = data?.metricsByCourse?.[courseId] || {};
  dom.performanceStats.innerHTML = "";
  [
    ["Visits",      m.total_visits               || 0],
    ["Time (min)",  Math.round((m.total_time_spent_seconds || 0) / 60)],
    ["Resources",   m.number_of_resources_clicked || 0],
    ["Assignments", m.number_of_assignments_viewed || 0],
    ["Quizzes",     m.quiz_attempts               || 0],
    ["Submissions", m.assignment_submissions       || 0],
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
  if (t === "pdf")                 return "📄";
  if (["doc","docx"].includes(t)) return "📝";
  if (["ppt","pptx"].includes(t)) return "📊";
  if (["xls","xlsx"].includes(t)) return "📈";
  if (t === "link")               return "🔗";
  if (t === "folder")             return "📁";
  return "📎";
};

const isDownloadable = (m) => {
  const ft = (m.fileType || m.file_type || "").toLowerCase();
  if (["folder","html","link"].includes(ft)) return false;
  if (m.downloadStatus === "No downloadable files") return false;
  return /^https?:/i.test(m.url || "") &&
    (m.downloadable || /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|zip)([\?#]|$)/i.test(m.url));
};

const getCourseMaterials = (courseId) =>
  (currentData?.materials || [])
    .filter((m) => (m.courseId || m.course_id) === courseId)
    .map((m) => ({
      id:          m.id || m.material_id,
      courseId:    m.courseId || m.course_id || courseId,
      title:       m.title || "Untitled",
      type:        m.type  || m.material_type || "unknown",
      fileType:    m.fileType || m.file_type  || "unknown",
      url:         m.url || "",
      downloadable: Boolean(m.downloadable),
      semantic_tags: m.semantic_tags || [],
      due_date:    m.due_date || null,
    }));

const renderMaterialsFiltered = (query) => {
  const q = (query || "").toLowerCase().trim();
  const filtered = q
    ? allMaterials.filter((m) => m.title.toLowerCase().includes(q) || m.type.toLowerCase().includes(q))
    : allMaterials;

  const dlCount = filtered.filter(isDownloadable).length;
  dom.downloadMeta.textContent = `${filtered.length} materials · ${dlCount} downloadable`;
  dom.downloadAllBtn.disabled  = dlCount === 0;
  dom.materialsList.innerHTML  = "";

  const groups = { lecture: [], lab: [], quiz: [], assignment: [], other: [] };
  filtered.forEach((m) => {
    const t = (m.type || "").toLowerCase();
    const tags = m.semantic_tags.map((s) => s.toLowerCase());
    if (t === "lecture" || tags.includes("lecture")) groups.lecture.push(m);
    else if (t === "lab" || tags.includes("practice")) groups.lab.push(m);
    else if (tags.includes("quiz")) groups.quiz.push(m);
    else if (tags.includes("assignment")) groups.assignment.push(m);
    else groups.other.push(m);
  });

  let stagger = 0;
  [["Lecture", groups.lecture], ["Lab / Practice", groups.lab], ["Quiz", groups.quiz], ["Assignment", groups.assignment], ["Other", groups.other]].forEach(
    ([label, items]) => {
      if (!items.length) return;
      const gl = document.createElement("div");
      gl.className = "material-group-label";
      gl.textContent = `${label} (${items.length})`;
      dom.materialsList.appendChild(gl);

      items.forEach((m, idx) => {
        const canDl = isDownloadable(m);
        const el    = document.createElement("div");
        el.className = "material-item";
        el.style.setProperty("--stagger", `${stagger * 25}ms`);
        stagger++;

        const badge = m.due_date
          ? `<span class="material-badge">due</span>`
          : "";

        el.innerHTML = `
          <span class="material-icon">${fileIcon(m.fileType)}</span>
          <div class="material-info">
            <div class="material-title" title="${m.title}">${m.title}</div>
            <div class="material-type">${m.type} · ${(m.fileType || "?").toUpperCase()}</div>
          </div>
          ${badge}`;

        const btn = document.createElement("button");
        btn.type = "button"; btn.className = "btn btn-ghost btn-sm ripple";
        btn.textContent = canDl ? "↓" : "↗";
        btn.title = canDl ? (m.due_date ? `Due: ${m.due_date}` : "Download") : "View on Moodle";
        btn.disabled = !m.url;
        btn.addEventListener("click", () => {
          if (!canDl) { chrome.tabs.create({ url: m.url }); return; }
          const fn = `${(m.title || `file_${idx}`).replace(/[\\/:*?"<>|]+/g, "_")}.${(m.fileType || "bin").replace(/[^a-z0-9]/gi,"") || "bin"}`;
          chrome.downloads.download({ url: m.url, filename: fn, conflictAction: "uniquify", saveAs: false },
            (dlId) => { if (!dlId) chrome.tabs.create({ url: m.url }); });
        });
        el.appendChild(btn);
        dom.materialsList.appendChild(el);
      });
    }
  );

  dom.materialsCard.classList.toggle("hidden", filtered.length === 0 && !q);
};

const renderMaterials = (courseId) => {
  allMaterials = getCourseMaterials(courseId);
  dom.materialSearch.value = "";
  renderMaterialsFiltered("");
};

// ── Sync history ──────────────────────────────────────────────────────────────
const renderHistory = async () => {
  const history = await getHistory();
  dom.historyCard.classList.toggle("hidden", history.length === 0);
  dom.historyList.innerHTML = history.map((h) => `
    <div class="history-item">
      <span class="history-dot ${h.ok ? "ok" : "err"}"></span>
      <span class="history-time">${new Date(h.at).toLocaleString()}</span>
      <span class="history-detail">${h.detail || (h.ok ? "Success" : "Failed")}</span>
    </div>`).join("");
};

// ── Full dashboard render ─────────────────────────────────────────────────────
const renderDashboard = async () => {
  const syncStatus = await getSyncStatus();
  const courses    = getCoursesFromMaterials(currentData || {});
  const hasData    = courses.length > 0 || (currentData?.materials || []).length > 0;

  renderAccountBanner(currentData, syncStatus);
  renderStats(currentData, courses);
  renderGradesCard(currentData, courses);
  await renderHistory();

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
  renderPerformance(currentCourseId, currentData);
  renderMaterials(currentCourseId);

  // Fetch ML result non-blocking
  if (syncStatus.academiq_user_id) {
    fetchAndRenderML(syncStatus.academiq_user_id);
  }
};

// ── Sync button state ─────────────────────────────────────────────────────────
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
      dom.syncBtn.disabled = false;
      dom.syncLabel.textContent = "Sync Now";
    }, 3000);
  } else if (state === "error") {
    dom.syncBtn.classList.remove("syncing");
    dom.syncBtn.classList.add("sync-btn-error");
    dom.syncLabel.textContent = "✗ Failed";
    setTimeout(() => {
      dom.syncBtn.classList.remove("sync-btn-error");
      dom.syncBtn.disabled = false;
      dom.syncLabel.textContent = "Sync Now";
    }, 3000);
  } else {
    dom.syncBtn.classList.remove("syncing","sync-btn-success","sync-btn-error");
    dom.syncBtn.disabled = false;
    dom.syncLabel.textContent = "Sync Now";
  }
};

// ── Payload sanitizer ─────────────────────────────────────────────────────────
const sanitizePayload = (data) => {
  if (!data) return null;
  const { events, grades, materials, courses, behavior, student, metricsByCourse } = data;
  return {
    student, courses, behavior, metricsByCourse,
    events:    (events    || []).map(({ _id,  ...e }) => e),
    grades:    (grades    || []).map(({ _key, ...g }) => g),
    materials: (materials || []).map(({ _key, ...m }) => m),
  };
};

// ── Sync to backend ───────────────────────────────────────────────────────────
const syncToBackend = async (data, academiqUserId) => {
  const payload = sanitizePayload(data);
  if (!payload) throw new Error("No data to sync.");
  // Include the linked AcademIQ account id (set after magic-link login) so the
  // backend matches this sync to the existing account directly, instead of
  // falling back to moodle_user_id matching and risking a ghost account.
  if (academiqUserId) {
    payload.academiq_user_id = academiqUserId;
  }
  const res = await fetch(`${apiBaseUrl}${SYNC_ENDPOINT}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Server ${res.status}${body ? ": " + body.slice(0, 100) : ""}`);
  }
  return await res.json();
};

// ── Sync diff ─────────────────────────────────────────────────────────────────
const showSyncDiff = (prevStatus, result) => {
  const parts = [];
  if (result?.normalized?.materials_new > 0) parts.push(`+${result.normalized.materials_new} materials`);
  if (result?.account_created) parts.push("account created");
  if (parts.length) {
    dom.syncDiff.textContent = parts.join(" · ");
    dom.syncDiff.classList.remove("hidden");
    setTimeout(() => dom.syncDiff.classList.add("hidden"), 5000);
  }
};

// ── Full sync flow ────────────────────────────────────────────────────────────
const runSync = async () => {
  const prevStatus = await getSyncStatus();
  setSyncState("syncing");
  dom.syncProgress.classList.remove("hidden");
  dom.syncResult.classList.add("hidden");
  dom.syncDiff.classList.add("hidden");
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
    if (!data) throw new Error("No Moodle data. Open a Moodle course page first.");

    // Send the previously-linked AcademIQ account id (set after magic-link
    // login / a prior successful sync) so the backend matches the existing
    // account directly instead of risking a ghost account on moodle_user_id
    // mismatch.
    const result = await syncToBackend(data, prevStatus.academiq_user_id);
    setProgress(90, "Fetching insights…");

    await saveSyncStatus({
      lastSyncAt:       new Date().toISOString(),
      academiq_user_id: result?.academiq_user_id || prevStatus.academiq_user_id || null,
    });

    await pushHistory({ ok: true, at: new Date().toISOString(), detail: `${(data.materials || []).length} materials` });

    setProgress(100, "Done");
    currentData = await getStorageData();
    await renderDashboard();
    showSyncDiff(prevStatus, result);

    setStatus("success");
    setSyncState("success");
    showSyncResult(true, `✓ Synced at ${new Date().toLocaleTimeString()}`);

    if (result?.account_created) {
      dom.openMsg.textContent = "New account created — link it to your AcademIQ account in Settings";
      dom.openMsg.classList.remove("hidden");
    }
  } catch (err) {
    setStatus("error");
    setSyncState("error");
    showSyncResult(false, `✗ ${err.message}`);
    await pushHistory({ ok: false, at: new Date().toISOString(), detail: err.message.slice(0, 40) });
  } finally {
    setTimeout(() => { dom.syncProgress.classList.add("hidden"); setProgress(0, ""); }, 1500);
  }
};

// ── Scan all ──────────────────────────────────────────────────────────────────
const runScanAll = async () => {
  dom.scanAllBtn.disabled    = true;
  dom.scanAllBtn.textContent = "Scanning…";
  setStatus("syncing");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab.");
    await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { type: "scrape_all_courses" }, (res) => {
        if (chrome.runtime.lastError || !res) reject(new Error("Open a Moodle page first."));
        else if (res.status === "done") resolve(res);
        else reject(new Error(res.error || "Scan failed."));
      });
    });
    currentData = await getStorageData();
    await renderDashboard();
    setStatus("success");
    showSyncResult(true, "✓ Scan complete. Click Sync Now to push to AcademIQ.");
  } catch (err) {
    setStatus("error");
    showSyncResult(false, `✗ ${err.message}`);
  } finally {
    dom.scanAllBtn.disabled    = false;
    dom.scanAllBtn.textContent = "Scan All";
  }
};

// ── Open AcademIQ ─────────────────────────────────────────────────────────────
dom.openAcademiqBtn.addEventListener("click", async () => {
  const syncStatus     = await getSyncStatus();
  const academiqUserId = syncStatus?.academiq_user_id;
  dom.openMsg.classList.add("hidden");

  if (!academiqUserId) {
    dom.openMsg.textContent = "Sync first to link your account.";
    dom.openMsg.classList.remove("hidden");
    return;
  }

  dom.openAcademiqBtn.disabled    = true;
  dom.openAcademiqBtn.textContent = "Opening…";

  try {
    const res = await fetch(`${apiBaseUrl}${MAGIC_ENDPOINT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ academiq_user_id: academiqUserId }),
    });
    if (!res.ok) throw new Error(`Server ${res.status}`);
    const { token } = await res.json();
    chrome.tabs.create({ url: `${appBaseUrl}/magic-login?token=${encodeURIComponent(token)}` });
  } catch (err) {
    dom.openMsg.textContent = `Could not open AcademIQ: ${err.message}`;
    dom.openMsg.classList.remove("hidden");
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
  renderPerformance(currentCourseId, currentData);
  renderMaterials(currentCourseId);
});

// ── Material search ───────────────────────────────────────────────────────────
dom.materialSearch.addEventListener("input", (e) => {
  renderMaterialsFiltered(e.target.value);
});

// ── Download all ──────────────────────────────────────────────────────────────
dom.downloadAllBtn.addEventListener("click", () => {
  allMaterials.filter(isDownloadable).forEach((m, i) => {
    const fn = `${(m.title || `file_${i}`).replace(/[\\/:*?"<>|]+/g, "_")}.${(m.fileType || "bin").replace(/[^a-z0-9]/gi,"") || "bin"}`;
    chrome.downloads.download({ url: m.url, filename: fn, conflictAction: "uniquify", saveAs: false });
  });
});

// ── Export JSON ───────────────────────────────────────────────────────────────
dom.downloadJsonBtn.addEventListener("click", async () => {
  const data = await getStorageData();
  if (!data) return;
  const blob = new Blob([JSON.stringify(sanitizePayload(data), null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  Object.assign(document.createElement("a"), { href: url, download: "moodle_student_data.json" }).click();
  URL.revokeObjectURL(url);
});

// ── Clear ─────────────────────────────────────────────────────────────────────
dom.clearDataBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "clear_data" }, () => {
    currentData = null; currentCourseId = null;
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
  checkBackendHealth(); // non-blocking
  currentData = await getStorageData();
  await renderDashboard();

  const s = await new Promise((r) => chrome.storage.local.get(SETTINGS_KEY, (res) => r(res[SETTINGS_KEY] || {})));
  if (s.autoSync && currentData) await runSync();
});