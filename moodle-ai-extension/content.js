// =======================================
// AcademIQ – content.js (FINAL VERSION)
// Raw Moodle Data Collector
// =======================================

(() => {
  // ---------- CONSTANTS ----------
  const STORAGE_KEY = "ACADEMIQ_RAW_EVENTS_V1";

  // ---------- STATE ----------
  const state = {
    student_id: null,
    sessions: [],
    clicks: 0,
    courses: {},
    lastActivity: Date.now()
  };

  let currentSession = null;
  let sessionStart = Date.now();

  // ---------- HELPERS ----------
  function now() {
    return Date.now();
  }

  function getCourseIdFromUrl(url) {
    const match = url.match(/course\/view\.php\?id=(\d+)/);
    return match ? match[1] : null;
  }

  function getCurrentCourse() {
    const id = getCourseIdFromUrl(location.href);
    if (!id) return null;

    if (!state.courses[id]) {
      state.courses[id] = {
        course_id: id,
        name: document.querySelector("h1")?.innerText || "Unknown Course",
        visits: 0,
        time_spent_ms: 0,
        assignments: [],
        quizzes: [],
        final_grade: null
      };
    }
    return state.courses[id];
  }

  // ---------- SESSION TRACKING ----------
  function startSession() {
    currentSession = {
      start: now(),
      end: null,
      duration_ms: 0
    };
    sessionStart = now();
  }

  function endSession() {
    if (!currentSession) return;
    currentSession.end = now();
    currentSession.duration_ms = currentSession.end - currentSession.start;
    state.sessions.push(currentSession);
    currentSession = null;
  }

  startSession();

  // ---------- ACTIVITY TRACKING ----------
  function markActivity() {
    const t = now();
    if (currentSession) {
      currentSession.duration_ms += t - state.lastActivity;
    }
    state.lastActivity = t;

    const course = getCurrentCourse();
    if (course) {
      course.time_spent_ms += t - state.lastActivity;
    }
  }

  ["mousemove", "keydown", "scroll", "click"].forEach(evt => {
    document.addEventListener(evt, () => {
      if (evt === "click") state.clicks++;
      markActivity();
    }, true);
  });

  // ---------- VISIBILITY / IDLE ----------
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      endSession();
    } else {
      startSession();
    }
  });

  window.addEventListener("beforeunload", () => {
    endSession();
    persist();
  });

  // ---------- PAGE VISITS ----------
  const course = getCurrentCourse();
  if (course) course.visits++;

  // ---------- SCRAPERS ----------
  function scrapeAssignments() {
    document.querySelectorAll(".activity.assign").forEach(el => {
      const title = el.querySelector(".instancename")?.innerText;
      if (!title) return;

      state.courses[getCurrentCourse().course_id].assignments.push({
        title,
        due_date: el.innerText.match(/Due\s*(.*)/i)?.[1] || null,
        submitted: el.innerText.includes("Submitted"),
        grade: null
      });
    });
  }

  function scrapeQuizzes() {
    document.querySelectorAll(".activity.quiz").forEach(el => {
      const title = el.querySelector(".instancename")?.innerText;
      if (!title) return;

      state.courses[getCurrentCourse().course_id].quizzes.push({
        title,
        attempts: null,
        score: null,
        time_spent_ms: 0
      });
    });
  }

  function scrapeGrades() {
    document.querySelectorAll("table.user-grade tbody tr").forEach(row => {
      const item = row.querySelector(".column-itemname")?.innerText;
      const grade = row.querySelector(".column-grade")?.innerText;
      if (!item || !grade) return;

      if (item.toLowerCase().includes("total")) {
        getCurrentCourse().final_grade = grade;
      }
    });
  }

  // ---------- PAGE DETECTION ----------
  const url = location.href;
  if (url.includes("/mod/assign/")) scrapeAssignments();
  if (url.includes("/mod/quiz/")) scrapeQuizzes();
  if (url.includes("/grade/report/user")) scrapeGrades();

  // ---------- STORAGE ----------
  function persist() {
    chrome.storage.local.set({
      [STORAGE_KEY]: {
        collected_at: new Date().toISOString(),
        payload: state
      }
    });
  }

  setInterval(persist, 5000);

  console.log("AcademIQ content.js running", state);
})();
