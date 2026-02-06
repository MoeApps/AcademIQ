const STORAGE_KEY = "moodleData";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

const activeTabs = new Map();

const defaultData = () => ({
    student: {
        student_id: null,
        program: null,
        enrollment_year: null
    },
    courses: [],
    behavior: {
        total_time_spent_on_moodle: 0,
        active_days_count: 0,
        session_count: 0,
        average_session_duration: 0,
        clicks_per_session: 0,
        peak_activity_hours: []
    },
    events: [],
    grades: [],
    learning_materials: [],
    knowledge_base: {},
    _meta: {
        activeDays: [],
        hourCounts: {},
        lastActivity: null,
        sessionStart: null,
        sessionClicks: 0
    }
});

const getStoredData = async () => {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || defaultData();
};

const saveStoredData = async (data) => {
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
};

const toCourseMap = (courses) => {
    const map = new Map();
    courses.forEach((course) => {
        if (course.course_id) {
            map.set(course.course_id, { ...course });
        }
    });
    return map;
};

const mergeCourse = (coursesMap, course) => {
    if (!course?.course_id) return;
    const existing = coursesMap.get(course.course_id);
    if (!existing) {
        coursesMap.set(course.course_id, {
            course_id: course.course_id,
            course_name: course.course_name || "Unknown Course",
            total_visits: 0,
            last_access_time: null,
            total_time_spent_seconds: 0,
            number_of_resources_clicked: 0,
            number_of_assignments_viewed: 0,
            number_of_quizzes_viewed: 0
        });
    } else if (course.course_name && existing.course_name !== course.course_name) {
        existing.course_name = course.course_name;
        coursesMap.set(course.course_id, existing);
    }
};

const updateSessionMetrics = (data, timestamp, isClick) => {
    const meta = data._meta || defaultData()._meta;
    const behavior = data.behavior;
    const lastActivity = meta.lastActivity;

    const startNewSession = () => {
        meta.sessionStart = timestamp;
        meta.sessionClicks = 0;
        behavior.session_count += 1;
    };

    if (!meta.sessionStart) {
        startNewSession();
    } else if (lastActivity && timestamp - lastActivity > SESSION_TIMEOUT_MS) {
        const duration = Math.max(0, lastActivity - meta.sessionStart);
        if (duration > 0) {
            behavior.average_session_duration =
                (behavior.average_session_duration * (behavior.session_count - 1) + duration / 1000) /
                behavior.session_count;
            behavior.clicks_per_session =
                (behavior.clicks_per_session * (behavior.session_count - 1) + meta.sessionClicks) /
                behavior.session_count;
        }
        startNewSession();
    }

    if (isClick) {
        meta.sessionClicks += 1;
    }

    meta.lastActivity = timestamp;
    data._meta = meta;
};

const updateActiveDayAndHours = (data, timestamp) => {
    const meta = data._meta || defaultData()._meta;
    const dayKey = new Date(timestamp).toISOString().slice(0, 10);
    if (!meta.activeDays.includes(dayKey)) {
        meta.activeDays.push(dayKey);
    }
    data.behavior.active_days_count = meta.activeDays.length;

    const hour = new Date(timestamp).getHours();
    meta.hourCounts[hour] = (meta.hourCounts[hour] || 0) + 1;
    const sortedHours = Object.entries(meta.hourCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([hourKey]) => Number(hourKey));
    data.behavior.peak_activity_hours = sortedHours;
    data._meta = meta;
};

const addEvent = (data, event) => {
    const eventId = `${event.timestamp}-${event.page_type}-${event.action_type}-${event.course_id || "unknown"}`;
    const exists = data.events.some((item) => item._id === eventId);
    if (!exists) {
        data.events.push({ ...event, _id: eventId });
    }
};

const mergeGrades = (data, grades) => {
    grades.forEach((grade) => {
        const key = `${grade.course_id}-${grade.item_name}-${grade.item_type}-${grade.submission_time || ""}`;
        if (!data.grades.some((existing) => existing._key === key)) {
            data.grades.push({ ...grade, _key: key });
        }
    });
};


const buildKnowledgeBase = (materials = []) => {
    const knowledgeBase = {};

    materials.forEach((material) => {
        const courseName = material.course_name || `Course ${material.course_id || "Unknown"}`;
        if (!knowledgeBase[courseName]) {
            knowledgeBase[courseName] = {};
        }

        const tags = Array.isArray(material.semantic_tags) && material.semantic_tags.length ? material.semantic_tags : ["general"];
        tags.forEach((tag) => {
            if (!knowledgeBase[courseName][tag]) {
                knowledgeBase[courseName][tag] = [];
            }
            knowledgeBase[courseName][tag].push(material);
        });
    });

    return knowledgeBase;
};
const mergeMaterials = (data, materials) => {
    materials.forEach((material) => {
        const stableMaterialId = material.material_id || material.url || material.title || "unknown";
        const key = `${material.course_id || "unknown"}-${stableMaterialId}-${material.url || "no-url"}`;
        if (!data.learning_materials.some((existing) => existing._key === key)) {
            data.learning_materials.push({ ...material, _key: key });
        }
    });

    data.knowledge_base = buildKnowledgeBase(data.learning_materials);
};

const finalizeActiveTab = async (tabId, endTime) => {
    const active = activeTabs.get(tabId);
    if (!active) return;
    const durationMs = Math.max(0, endTime - active.startTime);
    if (durationMs <= 0) {
        activeTabs.delete(tabId);
        return;
    }
    const data = await getStoredData();
    const coursesMap = toCourseMap(data.courses);
    mergeCourse(coursesMap, { course_id: active.courseId, course_name: active.courseName });

    const course = coursesMap.get(active.courseId);
    if (course) {
        course.total_time_spent_seconds += Math.round(durationMs / 1000);
        course.last_access_time = new Date(endTime).toISOString();
        coursesMap.set(active.courseId, course);
    }

    data.behavior.total_time_spent_on_moodle += Math.round(durationMs / 1000);
    updateSessionMetrics(data, endTime, false);
    updateActiveDayAndHours(data, endTime);

    data.courses = Array.from(coursesMap.values());
    await saveStoredData(data);
    activeTabs.delete(tabId);
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = sender.tab?.id;

    if (message.type === "get_data") {
        chrome.storage.local.get(STORAGE_KEY, (result) => {
            sendResponse({ data: result[STORAGE_KEY] || null });
        });
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
            const payload = message.payload;
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
            const coursesMap = toCourseMap(data.courses);
            mergeCourse(coursesMap, { course_id: payload.course_id, course_name: payload.course_name });
            const course = coursesMap.get(payload.course_id);
            if (course) {
                course.total_visits += 1;
                course.last_access_time = new Date(timestamp).toISOString();
                if (payload.page_type === "assignment") {
                    course.number_of_assignments_viewed += 1;
                } else if (payload.page_type === "quiz") {
                    course.number_of_quizzes_viewed += 1;
                } else if (payload.page_type === "resource") {
                    course.number_of_resources_clicked += 1;
                }
                coursesMap.set(payload.course_id, course);
            }
            data.courses = Array.from(coursesMap.values());

            updateSessionMetrics(data, timestamp, false);
            updateActiveDayAndHours(data, timestamp);
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
            const payload = message.payload;
            const timestamp = payload.timestamp || Date.now();
            const data = await getStoredData();

            updateSessionMetrics(data, timestamp, payload.action_type === "click");
            updateActiveDayAndHours(data, timestamp);
            addEvent(data, {
                timestamp,
                course_id: payload.course_id,
                page_type: payload.page_type,
                action_type: payload.action_type
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
            const data = await getStoredData();
            mergeGrades(data, message.payload || []);
            await saveStoredData(data);
            sendResponse({ status: "ok" });
        })();
        return true;
    }

    if (message.type === "materials") {
        (async () => {
            const data = await getStoredData();
            mergeMaterials(data, message.payload || []);
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
