// content.js - Moodle raw data extraction and interaction tracking
(() => {
    const STORAGE_ID_KEY = "moodle_student_id";

    const isMoodlePage = () => {
        if (!document?.body) return false;
        const metaGenerator = document.querySelector('meta[name="generator"]')?.getAttribute("content") || "";
        const bodyClass = document.body.className || "";
        const url = window.location.href;
        return (
            metaGenerator.toLowerCase().includes("moodle") ||
            bodyClass.includes("path-") ||
            url.includes("/course/view.php") ||
            url.includes("/mod/") ||
            url.includes("/my/") ||
            url.includes("/grade/report")
        );
    };

    if (!isMoodlePage()) {
        return;
    }

    const generateHashedId = () => `stu_${Math.random().toString(36).slice(2, 10)}`;

    const getStudentIdentity = () => {
        const storedId = localStorage.getItem(STORAGE_ID_KEY) || generateHashedId();
        localStorage.setItem(STORAGE_ID_KEY, storedId);

        const profileText = document.querySelector(".page-header-headings")?.textContent || "";
        const programMatch = document.body.textContent?.match(/Program(?:me)?\s*:\s*([A-Za-z0-9\s&-]+)/i);
        const enrollmentMatch = document.body.textContent?.match(/Enrollment\s*Year\s*:\s*(\d{4})/i);

        return {
            student_id: storedId,
            program: programMatch?.[1]?.trim() || (profileText.includes("Program") ? profileText.trim() : null),
            enrollment_year: enrollmentMatch?.[1] || null
        };
    };

    const detectPageType = () => {
        const url = window.location.href;
        if (url.includes("/my/") || url.includes("/my/index.php")) return "dashboard";
        if (url.includes("/course/view.php")) return "course";
        if (url.includes("/mod/assign/")) return "assignment";
        if (url.includes("/mod/quiz/")) return "quiz";
        if (url.includes("/grade/report/user")) return "grades";
        if (url.includes("/mod/resource/") || url.includes("/mod/page/") || url.includes("/mod/url/")) return "resource";
        return "resource";
    };

    const parseCourseId = (url) => {
        const match = url.match(/[?&]id=(\d+)/);
        if (match) return match[1];
        const bodyMatch = document.body.className.match(/course-(\d+)/);
        return bodyMatch?.[1] || null;
    };

    const getCourseContext = () => {
        const url = window.location.href;
        const courseId = parseCourseId(url) || document.querySelector('a[href*="course/view.php?id="]')?.href?.match(/[?&]id=(\d+)/)?.[1];
        const courseName =
            document.querySelector("h1")?.textContent?.trim() ||
            document.querySelector(".page-header-headings h1")?.textContent?.trim() ||
            document.querySelector('a[href*="course/view.php"]')?.textContent?.trim();
        return {
            course_id: courseId,
            course_name: courseName || "Unknown Course"
        };
    };

    const cleanText = (value) => value?.replace(/\s+/g, " ").trim() || null;

    const extractGradesFromTable = (courseId) => {
        const grades = [];
        document.querySelectorAll("table.user-grade tbody tr").forEach((row) => {
            const itemName = cleanText(row.querySelector("th.column-itemname")?.textContent);
            const gradeText = cleanText(row.querySelector("td.column-grade")?.textContent);
            if (!itemName || !gradeText) return;
            grades.push({
                course_id: courseId,
                item_name: itemName,
                item_type: itemName.toLowerCase().includes("quiz") ? "quiz" : "assignment",
                grade: gradeText,
                submission_status: cleanText(row.querySelector("td.column-status")?.textContent)
            });
        });
        return grades;
    };

    const extractAssignmentDetails = (courseId) => {
        const title = cleanText(document.querySelector("h1")?.textContent);
        const status = cleanText(document.querySelector(".submissionstatustable")?.textContent);
        return title ? [{ course_id: courseId, item_name: title, item_type: "assignment", submission_status: status, grade: null }] : [];
    };

    const extractQuizDetails = (courseId) => {
        const title = cleanText(document.querySelector("h1")?.textContent);
        const summary = cleanText(document.querySelector(".quizgradefeedback")?.textContent);
        return title ? [{ course_id: courseId, item_name: title, item_type: "quiz", submission_status: null, grade: summary }] : [];
    };

    const extractVisibleMetricCounts = () => {
        const sourceText = `${document.body?.innerText || ""}`;

        const quizAttemptMatches = sourceText.match(/quiz\s+attempts?/gi) || [];
        const assignmentSubmissionMatches = sourceText.match(/assignment\s+submissions?/gi) || [];

        return {
            // Extracted from currently visible page text, if present.
            quiz_attempts: quizAttemptMatches.length,
            assignment_submissions: assignmentSubmissionMatches.length
        };
    };

    const sendMessage = (type, payload) => {
        chrome.runtime.sendMessage({ type, payload }, () => {});
    };

    const sendPageView = (pageType, course) => {
        sendMessage("page_view", {
            page_type: pageType,
            course_id: course.course_id,
            course_name: course.course_name,
            url: window.location.href,
            timestamp: Date.now()
        });
    };

    const handleScrape = () => {
        const pageType = detectPageType();
        const course = getCourseContext();

        sendMessage("identity", getStudentIdentity());
        sendPageView(pageType, course);

        const visibleCounts = extractVisibleMetricCounts();
        sendMessage("metrics_update", {
            ...visibleCounts,
            course_id: course.course_id,
            course_name: course.course_name,
            timestamp: Date.now()
        });

        if (pageType === "grades") {
            const grades = extractGradesFromTable(course.course_id);
            if (grades.length) {
                sendMessage("grades", grades);
            }
        }

        if (pageType === "assignment") {
            const grades = extractAssignmentDetails(course.course_id);
            if (grades.length) {
                sendMessage("grades", grades);
            }
        }

        if (pageType === "quiz") {
            const grades = extractQuizDetails(course.course_id);
            if (grades.length) {
                sendMessage("grades", grades);
            }
        }
    };

    document.addEventListener("click", (event) => {
        const pageType = detectPageType();
        const course = getCourseContext();
        const target = event.target;
        const clickedLink = target instanceof Element ? target.closest("a[href]") : null;
        const href = clickedLink?.getAttribute("href") || "";
        const activityNode = target instanceof Element ? target.closest(".activity, li.activity, .activity-item") : null;
        const isMaterialClick = Boolean(
            activityNode || /\/mod\/(resource|page|url|folder|book)\//i.test(href) || /pluginfile\.php/i.test(href)
        );

        sendMessage("interaction", {
            page_type: pageType,
            course_id: course.course_id,
            course_name: course.course_name,
            action_type: isMaterialClick ? "material_click" : "click",
            timestamp: Date.now()
        });
    });

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
            sendMessage("page_hidden", { timestamp: Date.now() });
        }
    });

    window.addEventListener("beforeunload", () => {
        sendMessage("page_hidden", { timestamp: Date.now() });
    });

    const observer = new MutationObserver(() => handleScrape());
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("load", () => {
        handleScrape();
        setTimeout(handleScrape, 1200);
    });
})();
