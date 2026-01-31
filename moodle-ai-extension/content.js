// content.js - Moodle AI Scraper (Working Version)
(() => {
    console.log("[MoodleScraper] Content script started");

    // --- Student ID ---
    const studentId = localStorage.getItem("student_id") || generateHashedId();
    localStorage.setItem("student_id", studentId);

    // --- State ---
    const state = {
        clicks: 0,
        lastActivity: Date.now(),
        sessions: [],
        currentSession: { start: Date.now(), end: null, active_time_ms: 0, idle_time_ms: 0 },
        courses: {}
    };

    let idleStart = Date.now();

    // --- Activity Tracking ---
    document.addEventListener("click", () => {
        state.clicks += 1;
        state.lastActivity = Date.now();
    });

    document.addEventListener("mousemove", () => {
        const now = Date.now();
        if (now - state.lastActivity > 60000) { // idle
            state.currentSession.idle_time_ms += now - idleStart;
            idleStart = now;
        }
        state.lastActivity = now;
    });

    function generateHashedId() {
        return 'stu_' + Math.random().toString(36).substr(2, 9);
    }

    // --- Page detection ---
    function detectPageType() {
        const url = window.location.href;
        if (url.includes("/my/")) return "DASHBOARD";
        if (url.includes("/course/view.php")) return "COURSE";
        if (url.includes("/mod/assign/")) return "ASSIGNMENTS";
        if (url.includes("/grade/report/user")) return "GRADES";
        return "UNKNOWN";
    }

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

    // --- Scrape functions ---
    function scrapeDashboard() {
        const courses = [...document.querySelectorAll('a[href*="course/view.php"]')]
            .map(a => ({ title: a.innerText.trim(), url: a.href }))
            .filter(c => c.title);

        courses.forEach(c => {
            if (!state.courses[c.url]) {
                state.courses[c.url] = {
                    name: c.title,
                    visits: 1,
                    time_spent_ms: 0,
                    assignments: [],
                    quizzes: [],
                    resources: [],
                    finalGrade: null
                };
            } else {
                state.courses[c.url].visits += 1;
            }
        });

        console.log("[MoodleScraper] Dashboard courses:", Object.keys(state.courses));
    }

    function scrapeCoursePage() {
        const name = document.querySelector("h1")?.innerText.trim();
        if (!name) return;
        console.log("[MoodleScraper] On course page:", name);
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
                dueDate: due,
                status: null,
                grade: null
            });

            // Map to course
            const courseUrl = window.location.href.split("?")[0]; // crude course identifier
            if (!state.courses[courseUrl]) {
                state.courses[courseUrl] = { name: "Unknown Course", visits: 1, time_spent_ms: 0, assignments: [], quizzes: [], resources: [], finalGrade: null };
            }
            state.courses[courseUrl].assignments.push(assignments[assignments.length - 1]);
        });

        console.log("[MoodleScraper] Assignments scraped:", assignments);
    }

    function scrapeGradesPage() {
        const grades = [];

        document.querySelectorAll("table.user-grade tbody tr").forEach(row => {
            const item = row.querySelector("th.column-itemname")?.innerText.trim();
            const grade = row.querySelector("td.column-grade")?.innerText.trim();
            const max = row.querySelector("td.column-range")?.innerText.trim();

            if (item && grade) {
                grades.push({ item, grade, max });

                // Map to course
                const courseUrl = window.location.href.split("?")[0];
                if (!state.courses[courseUrl]) {
                    state.courses[courseUrl] = { name: "Unknown Course", visits: 1, time_spent_ms: 0, assignments: [], quizzes: [], resources: [], finalGrade: null };
                }
                state.courses[courseUrl].grades = state.courses[courseUrl].grades || [];
                state.courses[courseUrl].grades.push({ item, grade, max });
            }
        });

        console.log("[MoodleScraper] Grades scraped:", grades);
    }

    // --- Main runner ---
    function runScraper() {
        const page = detectPageType();
        console.log("[MoodleScraper] Detected page:", page);

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

        // Update session
        state.currentSession.end = Date.now();
        state.currentSession.active_time_ms = state.currentSession.end - state.currentSession.start - state.currentSession.idle_time_ms;
        if (state.currentSession.active_time_ms > 0 || state.currentSession.idle_time_ms > 0) {
            state.sessions.push({ ...state.currentSession });
            state.currentSession = { start: Date.now(), end: null, active_time_ms: 0, idle_time_ms: 0 };
        }

        // Persist data to chrome.storage
        const data = {
            student_id: studentId,
            clicks: state.clicks,
            lastActivity: state.lastActivity,
            sessions: state.sessions,
            courses: state.courses
        };

        chrome.storage.local.set({ moodle_data: data }, () => {
            console.log("[MoodleScraper] Data saved:", data);
        });
    }

    // --- Mutation observer for dynamic content ---
    const observer = new MutationObserver(() => runScraper());
    observer.observe(document.body, { childList: true, subtree: true });

    // --- Initial run ---
    window.addEventListener("load", runScraper);

})();
