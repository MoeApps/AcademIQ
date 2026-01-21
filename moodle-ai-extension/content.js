window.__MOODLE_AI_STATE__ = {
  dashboard: {},
  courses: [],
  assignments: [],
  grades: []
};


const STORAGE_KEY = "MIU_MOODLE_DATA_V1";
function loadStoredData(callback) {
    chrome.storage.local.get([STORAGE_KEY], result => {
      callback(result[STORAGE_KEY] || null);
    });
  }
  
  function persistData(state) {
    chrome.storage.local.set({
      moodleData: {
        lastUpdated: new Date().toISOString(),
        payload: state
      }
    });
  }
  
  
  function getEmptyDataStructure() {
    return {
      version: "1.0",
      last_updated: new Date().toISOString(),
      student: {
        courses: []
      }
    };
  }
  function upsertCourse(data, courseName, courseUrl = null) {
    let course = data.student.courses.find(c => c.name === courseName);
  
    if (!course) {
      course = {
        name: courseName,
        url: courseUrl,
        assignments: [],
        grades: []
      };
      data.student.courses.push(course);
    }
  
    return course;
  }
      
const MoodleState = {
    currentPage: null,
    courseName: null,
    courses: [],
    assignments: [],
    grades: []
  };


  function detectPageType() {
    const url = window.location.href;
  
    if (url.includes("/my/")) return "DASHBOARD";
    if (url.includes("/course/view.php")) return "COURSE";
    if (url.includes("/mod/assign/")) return "ASSIGNMENTS";
    if (url.includes("/grade/report/user")) return "GRADES";
  
    return "UNKNOWN";
  }

  
MoodleState.currentPage = detectPageType();
console.log("Detected Moodle page:", MoodleState.currentPage);

function waitForElement(selector, callback) {
  const el = document.querySelector(selector);
  if (el) return callback();

  const observer = new MutationObserver(() => {
    const el = document.querySelector(selector);
    if (el) {
      observer.disconnect();
      callback();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}


function runScraper() {
  const page = detectPageType();
  console.log("Detected Moodle page:", page);

  switch (page) {
    case "DASHBOARD":
      waitForElement('a[href*="course/view.php"]', scrapeDashboard);
      break;

    case "COURSE":
      waitForElement("h1", scrapeCoursePage);
      break;

    case "ASSIGNMENTS":
      waitForElement('a[href*="/mod/assign/view.php"]', scrapeAssignmentsPage);
      break;

    case "GRADES":
      waitForElement("table.user-grade", scrapeGradesPage);
      break;
  }

  setTimeout(() => {
    console.log("SAVING STATE:", window.__MOODLE_AI_STATE__);
    persistData(window.__MOODLE_AI_STATE__);
  }, 600);
}

runScraper();

    
  
function scrapeDashboard() {
  const courses = [...document.querySelectorAll('a[href*="course/view.php"]')]
    .map(a => ({
      title: a.innerText.trim(),
      url: a.href
    }))
    .filter(c => c.title);

  window.__MOODLE_AI_STATE__.courses = courses;
}



function scrapeCoursePage() {
  const name = document.querySelector("h1")?.innerText.trim();
  if (!name) return;

  window.__MOODLE_AI_STATE__.currentCourse = name;
}

  
   
function scrapeAssignmentsPage() {
  const assignments = [];

  document.querySelectorAll('a[href*="/mod/assign/view.php"]').forEach(link => {
    const container = link.closest(".activity.assign");
    const text = container?.innerText || "";
    const due = text.match(/Due[:\s].*/i)?.[0] || null;

    assignments.push({
      title: link.innerText.trim(),
      url: link.href,
      dueDate: due
    });
  });

  window.__MOODLE_AI_STATE__.assignments = assignments;
}

  

function scrapeGradesPage() {
  const grades = [];

  document.querySelectorAll("table.user-grade tbody tr").forEach(row => {
    const item = row.querySelector("th.column-itemname")?.innerText.trim();
    const grade = row.querySelector("td.column-grade")?.innerText.trim();
    const max = row.querySelector("td.column-range")?.innerText.trim();

    if (item && grade) {
      grades.push({ item, grade, max });
    }
  });

  window.__MOODLE_AI_STATE__.grades = grades;
}

  

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "FORCE_SYNC") {
      runScrapers();
    }
  });

  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === "EXPORT_DATA") {
      chrome.storage.local.get("moodleData", res => {
        if (!res.moodleData?.payload) return;
  
        const exportData = transformToExportSchema(res.moodleData.payload);
        downloadJSON(exportData);
      });
    }
  });
  
  

  function transformToExportSchema(rawState) {
    const coursesMap = {};
  
    // From dashboard / courses
    rawState.courses?.forEach(course => {
      coursesMap[course.url] = {
        courseId: course.url.split("id=")[1] || "",
        name: course.title || "",
        assignments: [],
        grades: []
      };
    });
  
    // Attach assignments
    rawState.assignments?.forEach(a => {
      const courseKey = a.courseUrl;
      if (coursesMap[courseKey]) {
        coursesMap[courseKey].assignments.push({
          title: a.title,
          dueDate: a.dueDate || null,
          status: a.status || null
        });
      }
    });
  
    // Attach grades
    rawState.grades?.forEach(g => {
      const courseKey = g.courseUrl;
      if (coursesMap[courseKey]) {
        coursesMap[courseKey].grades.push({
          item: g.item,
          grade: g.grade,
          max: g.max
        });
      }
    });
  
    return {
      schemaVersion: "1.0",
      source: "MIU Moodle",
      collectedAt: new Date().toISOString(),
      student: {
        id: "anonymous"
      },
      courses: Object.values(coursesMap)
    };
  }
  
  function downloadJSON(data) {
    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json" }
    );
  
    const url = URL.createObjectURL(blob);
  
    const a = document.createElement("a");
    a.href = url;
    a.download = "moodle_student_data.json";
    a.click();
  
    URL.revokeObjectURL(url);
  }
  

  console.log("SAVING STATE:", window.__MOODLE_AI_STATE__);
  persistData(window.__MOODLE_AI_STATE__);
  