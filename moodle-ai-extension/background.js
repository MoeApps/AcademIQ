const STORAGE_KEY = "moodleData";

const activeTabs = new Map();

const createDefaultCourseMetrics = (courseId, courseName = "Unknown Course") => ({
    course_id: courseId,
    course_name: courseName,
    // Extracted counters used by the popup (raw values only).
    total_time_spent: 0,
    total_visits: 0,
    material_clicks: 0,
    active_days: [],
    quiz_attempts: 0,
    assignment_submissions: 0,
    last_access_time: null
});

const defaultData = () => ({
    student: {
        student_id: null,
        program: null,
        enrollment_year: null
    },
    // Metrics are isolated by course id to prevent cross-course pollution.
    metricsByCourse: {},
    events: []
});

const normalizeData = (data) => {
    const normalized = data && typeof data === "object" ? data : defaultData();
    normalized.student = normalized.student || defaultData().student;
    normalized.metricsByCourse = normalized.metricsByCourse || {};
    normalized.events = Array.isArray(normalized.events) ? normalized.events : [];

    // Lightweight migration from older `courses` format.
    if (Array.isArray(normalized.courses)) {
        normalized.courses.forEach((course) => {
            if (!course?.course_id) return;
            const existing = normalized.metricsByCourse[course.course_id] || createDefaultCourseMetrics(course.course_id, course.course_name);
            normalized.metricsByCourse[course.course_id] = {
                ...existing,
                course_name: course.course_name || existing.course_name,
                total_time_spent: Number(existing.total_time_spent || course.total_time_spent_seconds || 0),
                total_visits: Number(existing.total_visits || course.total_visits || 0),
                material_clicks: Number(existing.material_clicks || course.number_of_resources_clicked || 0),
                active_days: Array.isArray(existing.active_days) ? existing.active_days : [],
                quiz_attempts: Number(existing.quiz_attempts || course.number_of_quizzes_viewed || 0),
                assignment_submissions: Number(existing.assignment_submissions || course.number_of_assignments_viewed || 0),
                last_access_time: existing.last_access_time || course.last_access_time || null
            };
        });
        delete normalized.courses;
    }

    return normalized;
};

const getStoredData = async () => {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return normalizeData(result[STORAGE_KEY]);
};

const saveStoredData = async (data) => {
    await chrome.storage.local.set({ [STORAGE_KEY]: normalizeData(data) });
};

const ensureCourseMetrics = (data, courseId, courseName) => {
    if (!courseId) return null;
    if (!data.metricsByCourse[courseId]) {
        data.metricsByCourse[courseId] = createDefaultCourseMetrics(courseId, courseName);
    }
    if (courseName && data.metricsByCourse[courseId].course_name !== courseName) {
        data.metricsByCourse[courseId].course_name = courseName;
    }
    return data.metricsByCourse[courseId];
};

const markActiveDay = (courseMetrics, timestamp) => {
    const dayKey = new Date(timestamp).toISOString().slice(0, 10);
    if (!courseMetrics.active_days.includes(dayKey)) {
        courseMetrics.active_days.push(dayKey);
    }
};

const addEvent = (data, event) => {
    const eventId = `${event.timestamp}-${event.page_type}-${event.action_type}-${event.course_id || "unknown"}`;
    const exists = data.events.some((item) => item._id === eventId);
    if (!exists) {
        data.events.push({ ...event, _id: eventId });
    }
};

const extractAttemptsFromGrades = (grades = []) => {
    let quizAttempts = 0;
    let assignmentSubmissions = 0;

    grades.forEach((grade) => {
        const type = String(grade.item_type || "").toLowerCase();
        const status = String(grade.submission_status || "").toLowerCase();
        const hasGrade = String(grade.grade || "").trim().length > 0;

        if (type.includes("quiz")) {
            quizAttempts += 1;
        }

        if (type.includes("assignment") && (hasGrade || status.includes("submitted") || status.includes("graded"))) {
            assignmentSubmissions += 1;
        }
    });

    return { quizAttempts, assignmentSubmissions };
};

const finalizeActiveTab = async (tabId, endTime) => {
    const active = activeTabs.get(tabId);
    if (!active) return;

    const data = await getStoredData();
    const courseMetrics = ensureCourseMetrics(data, active.courseId, active.courseName);
    if (!courseMetrics) {
        activeTabs.delete(tabId);
        return;
    }

    const durationMs = Math.max(0, endTime - active.startTime);
    const elapsedSeconds = Math.round(durationMs / 1000);

    if (elapsedSeconds > 0) {
        courseMetrics.total_time_spent += elapsedSeconds;
        courseMetrics.last_access_time = new Date(endTime).toISOString();
        markActiveDay(courseMetrics, endTime);
        await saveStoredData(data);
    }

    activeTabs.delete(tabId);
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = sender.tab?.id;

    if (message.type === "get_data") {
        chrome.storage.local.get(STORAGE_KEY, (result) => {
            sendResponse({ data: normalizeData(result[STORAGE_KEY]) });
        });
        return true;
    }

    if (message.type === "clear_course") {
        (async () => {
            const courseId = message.payload?.course_id;
            if (!courseId) {
                sendResponse({ status: "ignored" });
                return;
            }
            const data = await getStoredData();
            delete data.metricsByCourse[courseId];
            await saveStoredData(data);
            sendResponse({ status: "cleared", course_id: courseId });
        })();
        return true;
    }

    if (message.type === "clear_data") {
        chrome.storage.local.remove(STORAGE_KEY, () => {
            sendResponse({ status: "cleared" });
        });
        return true;
    }

    if (message.type === "page_view") {
        (async () => {
            const payload = message.payload || {};
            const timestamp = payload.timestamp || Date.now();

            if (typeof tabId === "number") {
                await finalizeActiveTab(tabId, timestamp);
                activeTabs.set(tabId, {
                    startTime: timestamp,
                    courseId: payload.course_id,
                    courseName: payload.course_name,
                    pageType: payload.page_type
                });
            }

            const data = await getStoredData();
            const courseMetrics = ensureCourseMetrics(data, payload.course_id, payload.course_name);

            if (courseMetrics) {
                courseMetrics.total_visits += 1;
                courseMetrics.last_access_time = new Date(timestamp).toISOString();
                markActiveDay(courseMetrics, timestamp);
            }

            addEvent(data, {
                timestamp,
                course_id: payload.course_id,
                page_type: payload.page_type,
                action_type: "view"
            });

            await saveStoredData(data);
            sendResponse({ status: "ok" });
        })();
        return true;
    }

    if (message.type === "page_hidden") {
        (async () => {
            const timestamp = message.payload?.timestamp || Date.now();
            if (typeof tabId === "number") {
                await finalizeActiveTab(tabId, timestamp);
            }
            sendResponse({ status: "ok" });
        })();
        return true;
    }

    if (message.type === "interaction") {
        (async () => {
            const payload = message.payload || {};
            const timestamp = payload.timestamp || Date.now();
            const data = await getStoredData();
            const courseMetrics = ensureCourseMetrics(data, payload.course_id, payload.course_name);

            if (courseMetrics) {
                if (payload.action_type === "material_click") {
                    courseMetrics.material_clicks += 1;
                }
                markActiveDay(courseMetrics, timestamp);
            }

            addEvent(data, {
                timestamp,
                course_id: payload.course_id,
                page_type: payload.page_type,
                action_type: payload.action_type || "interaction"
            });

            await saveStoredData(data);
            sendResponse({ status: "ok" });
        })();
        return true;
    }

    if (message.type === "identity") {
        (async () => {
            const data = await getStoredData();
            data.student = {
                student_id: message.payload.student_id || data.student.student_id,
                program: message.payload.program || data.student.program,
                enrollment_year: message.payload.enrollment_year || data.student.enrollment_year
            };
            await saveStoredData(data);
            sendResponse({ status: "ok" });
        })();
        return true;
    }

    if (message.type === "grades") {
        (async () => {
            const payload = Array.isArray(message.payload) ? message.payload : [];
            const data = await getStoredData();
            const byCourse = {};

            payload.forEach((grade) => {
                if (!grade?.course_id) return;
                byCourse[grade.course_id] = byCourse[grade.course_id] || [];
                byCourse[grade.course_id].push(grade);
            });

            Object.entries(byCourse).forEach(([courseId, items]) => {
                const courseMetrics = ensureCourseMetrics(data, courseId, items[0]?.course_name);
                if (!courseMetrics) return;
                const { quizAttempts, assignmentSubmissions } = extractAttemptsFromGrades(items);
                if (quizAttempts > 0) {
                    courseMetrics.quiz_attempts = Math.max(courseMetrics.quiz_attempts, quizAttempts);
                }
                if (assignmentSubmissions > 0) {
                    courseMetrics.assignment_submissions = Math.max(courseMetrics.assignment_submissions, assignmentSubmissions);
                }
            });

            await saveStoredData(data);
            sendResponse({ status: "ok" });
        })();
        return true;
    }

    if (message.type === "metrics_update") {
        (async () => {
            const payload = message.payload || {};
            const data = await getStoredData();
            const courseMetrics = ensureCourseMetrics(data, payload.course_id, payload.course_name);

            if (courseMetrics) {
                if (Number.isFinite(payload.quiz_attempts)) {
                    courseMetrics.quiz_attempts = Math.max(courseMetrics.quiz_attempts, payload.quiz_attempts);
                }
                if (Number.isFinite(payload.assignment_submissions)) {
                    courseMetrics.assignment_submissions = Math.max(courseMetrics.assignment_submissions, payload.assignment_submissions);
                }
                if (payload.timestamp) {
                    markActiveDay(courseMetrics, payload.timestamp);
                }
            }

            await saveStoredData(data);
            sendResponse({ status: "ok" });
        })();
        return true;
    }

    return false;
});

chrome.tabs.onRemoved.addListener((tabId) => {
    finalizeActiveTab(tabId, Date.now());
});
