const STORAGE_KEY = "MIU_MOODLE_DATA_V1";
function loadStoredData(callback) {
    chrome.storage.local.get([STORAGE_KEY], result => {
      callback(result[STORAGE_KEY] || null);
    });
  }
  
  function saveStoredData(data) {
    chrome.storage.local.set({
      [STORAGE_KEY]: data
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
    const element = document.querySelector(selector);
    if (element) {
      callback();
      return;
    }
  
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        callback();
      }
    });
  
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  function runScraper() {
    switch (MoodleState.currentPage) {
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
  
      default:
        console.log("No scraper for this page");
    }
  }
  runScraper();
    
  
  function scrapeDashboard() {
    console.log("Scraping Dashboard...");
  
    const courses = [...document.querySelectorAll('a[href*="course/view.php"]')]
      .map(link => ({
        name: link.innerText.trim(),
        url: link.href
      }))
      .filter(c => c.name.length > 0);
  
    loadStoredData(stored => {
      const data = stored || getEmptyDataStructure();
  
      courses.forEach(c =>
        upsertCourse(data, c.name, c.url)
      );
  
      data.last_updated = new Date().toISOString();
      saveStoredData(data);
  
      console.log("Stored dashboard data:", data);
    });
  }
  


  function scrapeCoursePage() {
    console.log("Scraping Course Page...");
  
    const courseName = document.querySelector("h1")?.innerText.trim();
    if (!courseName) return;
  
    loadStoredData(stored => {
      const data = stored || getEmptyDataStructure();
      upsertCourse(data, courseName);
      data.last_updated = new Date().toISOString();
      saveStoredData(data);
  
      console.log("Stored course context:", courseName);
    });
  }
  
   
  function scrapeAssignmentsPage() {
    console.log("Scraping Assignments Page...");
  
    const courseName = document.querySelector("h1")?.innerText.trim();
    if (!courseName) return;
  
    const assignments = [];
  
    document.querySelectorAll('a[href*="/mod/assign/view.php"]').forEach(link => {
      const container = link.closest(".activity.assign");
      const text = container?.innerText || "";
      const dueMatch = text.match(/Due[:\s].*/i);
  
      assignments.push({
        name: link.innerText.trim(),
        url: link.href,
        due_date: dueMatch ? dueMatch[0] : null
      });
    });
  
    loadStoredData(stored => {
      const data = stored || getEmptyDataStructure();
      const course = upsertCourse(data, courseName);
  
      course.assignments = assignments;
  
      data.last_updated = new Date().toISOString();
      saveStoredData(data);
  
      console.log("Stored assignments for:", courseName);
    });
  }
  

  function scrapeGradesPage() {
    console.log("Scraping Grades Page...");
  
    const courseName = document.querySelector("h1")?.innerText.trim();
    if (!courseName) return;
  
    const grades = [];
  
    document.querySelectorAll("table.user-grade tbody tr").forEach(row => {
      const item = row.querySelector("th.column-itemname")?.innerText.trim();
      const grade = row.querySelector("td.column-grade")?.innerText.trim();
      const max = row.querySelector("td.column-range")?.innerText.trim();
  
      if (item && grade) {
        grades.push({
          item,
          grade,
          max_grade: max || null
        });
      }
    });
  
    loadStoredData(stored => {
      const data = stored || getEmptyDataStructure();
      const course = upsertCourse(data, courseName);
  
      course.grades = grades;
  
      data.last_updated = new Date().toISOString();
      saveStoredData(data);
  
      console.log("Stored grades for:", courseName);
    });
  }
  

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "FORCE_SYNC") {
      runScrapers();
    }
  });
  
  
  window.__MOODLE_AI_STATE__ = MoodleState;
  