// ---------- Global State ----------
window.__MOODLE_AI_STATE__ = {
  student_id: null,
  clicks: 0,
  sessions: [],
  courses: {},
  lastActivity: Date.now()
};

const STORAGE_KEY_MOODLE_AI = "MIU_MOODLE_DATA_V1";

// ---------- Helper Functions ----------
function persistData() {
  chrome.storage.local.set({
    [STORAGE_KEY_MOODLE_AI]: {
      lastUpdated: new Date().toISOString(),
      payload: window.__MOODLE_AI_STATE__
    }
  });
}

function hashStudentId() {
  const username = document.querySelector("span.usertext")?.innerText?.trim() || "anonymous";
  return btoa(username);
}

// ---------- Session Tracking ----------
let sessionStart = Date.now();

function updateActivity() {
  window.__MOODLE_AI_STATE__.lastActivity = Date.now();
}

document.addEventListener("mousemove", updateActivity);
document.addEventListener("keydown", updateActivity);
document.addEventListener("click", () => {
  window.__MOODLE_AI_STATE__.clicks++;
  updateActivity();
});

function recordSession() {
  const now = Date.now();
  const idleTime = now - window.__MOODLE_AI_STATE__.lastActivity;
  const sessionDuration = now - sessionStart;

  window.__MOODLE_AI_STATE__.sessions.push({
    start_time: new Date(sessionStart).toISOString(),
    end_time: new Date(now).toISOString(),
    active_time: sessionDuration - idleTime,
    idle_time: idleTime,
    clicks: window.__MOODLE_AI_STATE__.clicks
  });

  sessionStart = now;
  window.__MOODLE_AI_STATE__.clicks = 0;
  window.__MOODLE_AI_STATE__.lastActivity = now;
}

// Record session every 1 minute
setInterval(recordSession, 60 * 1000);
window.addEventListener("beforeunload", recordSession);

// ---------- Scraping Functions ----------
function scrapeCourses() {
  const courseLinks = [...document.querySelectorAll('a[href*="/course/view.php?id="]')];
  courseLinks.forEach(a => {
    const url = a.href.split('#')[0];
    if (!window.__MOODLE_AI_STATE__.courses[url]) {
      window.__MOODLE_AI_STATE__.courses[url] = {
        name: a.innerText.trim(),
        assignments: [],
        quizzes: [],
        finalGrade: null
      };
    }
  });
}

function scrapeAssignments() {
  document.querySelectorAll('table.assignments tbody tr').forEach(row => {
    const title = row.querySelector('td.title a')?.innerText.trim();
    const gradeText = row.querySelector('td.grade')?.innerText.trim();
    const dueText = row.querySelector('td.due')?.innerText.trim();
    const submittedText = row.querySelector('td.status')?.innerText.trim();

    const grade = gradeText ? parseFloat(gradeText) : null;
    const submitted = submittedText?.toLowerCase().includes("submitted");
    let submission_delay = 0;
    if(dueText) {
      const dueDate = new Date(dueText);
      const today = new Date();
      submission_delay = submitted && dueDate ? Math.max(0, Math.floor((today - dueDate)/(1000*60*60*24))) : 0;
    }

    const courseUrl = window.location.href.split('?id=')[0];
    if(courseUrl && window.__MOODLE_AI_STATE__.courses[courseUrl]) {
      window.__MOODLE_AI_STATE__.courses[courseUrl].assignments.push({
        title,
        due_date: dueText || null,
        grade,
        submitted,
        submission_delay
      });
    }
  });
}

function scrapeQuizzes() {
  document.querySelectorAll('table.quizzes tbody tr').forEach(row => {
    const title = row.querySelector('td.quizname a')?.innerText.trim();
    const scoreText = row.querySelector('td.score')?.innerText.trim();
    const attemptsText = row.querySelector('td.attempts')?.innerText.trim();
    const timeText = row.querySelector('td.time_spent')?.innerText.trim();

    const score = scoreText ? parseFloat(scoreText) : null;
    const attempts = attemptsText ? parseInt(attemptsText) : 0;
    const time_spent = timeText ? parseInt(timeText) : 0;

    const courseUrl = window.location.href.split('?id=')[0];
    if(courseUrl && window.__MOODLE_AI_STATE__.courses[courseUrl]) {
      window.__MOODLE_AI_STATE__.courses[courseUrl].quizzes.push({
        title,
        score,
        attempts,
        time_spent
      });
    }
  });
}

function scrapeFinalGrades() {
  const courseUrl = window.location.href.split('?id=')[0];
  const gradeText = document.querySelector("td.final-grade")?.innerText?.trim();
  const grade = gradeText ? parseFloat(gradeText) : null;
  if(courseUrl && window.__MOODLE_AI_STATE__.courses[courseUrl]) {
    window.__MOODLE_AI_STATE__.courses[courseUrl].finalGrade = grade;
  }
}

// ---------- Transform to AI Features ----------
function computeAIFeatures() {
  const state = window.__MOODLE_AI_STATE__;
  state.student_id = hashStudentId();

  let totalTime = 0;
  let activeDaysSet = new Set();
  let allQuizScores = [];
  let allAssignmentScores = [];
  let lateSubmissions = 0;
  let totalAssignments = 0;
  let totalFinalGrades = 0;
  let coursesWithGrades = 0;

  state.sessions.forEach(s => {
    totalTime += s.active_time;
    activeDaysSet.add(new Date(s.start_time).toDateString());
  });

  Object.values(state.courses).forEach(course => {
    course.assignments.forEach(a => {
      if(a.grade != null) allAssignmentScores.push(a.grade);
      if(a.submission_delay > 0) lateSubmissions++;
      totalAssignments++;
    });
    course.quizzes.forEach(q => {
      if(q.score != null) allQuizScores.push(q.score);
    });
    if(course.finalGrade != null) {
      totalFinalGrades += course.finalGrade;
      coursesWithGrades++;
    }
  });

  const avgQuizScore = allQuizScores.length ? allQuizScores.reduce((a,b)=>a+b,0)/allQuizScores.length : 0;
  const quizScoreStd = allQuizScores.length ? Math.sqrt(allQuizScores.map(x=>Math.pow(x-avgQuizScore,2)).reduce((a,b)=>a+b,0)/allQuizScores.length) : 0;
  const avgAssignmentScore = allAssignmentScores.length ? allAssignmentScores.reduce((a,b)=>a+b,0)/allAssignmentScores.length : 0;
  const lateSubmissionRatio = totalAssignments ? lateSubmissions/totalAssignments : 0;
  const avgFinalGrade = coursesWithGrades ? totalFinalGrades / coursesWithGrades : 0;

  return {
    student_id: state.student_id,
    total_time_spent: totalTime,
    active_days: activeDaysSet.size,
    access_frequency: state.sessions.length,
    avg_quiz_score: avgQuizScore,
    quiz_score_std: quizScoreStd,
    avg_assignment_score: avgAssignmentScore,
    late_submission_ratio: lateSubmissionRatio,
    avg_final_grade: avgFinalGrade
  };
}

// ---------- Send to FastAPI ----------
async function sendToBackend() {
  const payload = computeAIFeatures();
  try {
    await fetch("http://localhost:8000/predict", {
      method:"POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
    console.log("Data sent to backend:", payload);
  } catch(err) {
    console.error("Error sending data:", err);
  }
}

// ---------- Run Scraper ----------
function runScraper() {
  scrapeCourses();
  scrapeAssignments();
  scrapeQuizzes();
  scrapeFinalGrades();
  persistData();
  console.log("Scraped state:", window.__MOODLE_AI_STATE__);
  console.log("AI-ready features:", computeAIFeatures());
  // Optional: sendToBackend();
}

// ---------- Initial Run ----------
window.addEventListener("load", () => runScraper());

// ---------- Popup Messaging ----------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if(msg.type === "FORCE_SYNC") runScraper();
  if(msg.type === "EXPORT_DATA") {
    chrome.storage.local.get(STORAGE_KEY_MOODLE_AI, res => {
      const data = res[STORAGE_KEY_MOODLE_AI]?.payload;
      if(!data) return;
      const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "moodle_student_data.json";
      a.click();
      URL.revokeObjectURL(url);
    });
  }
});
