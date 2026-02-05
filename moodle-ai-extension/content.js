// content.js - Moodle data extraction and event tracking
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

    const parseMaterialId = (url, activity) => {
        const fromUrl = url?.match(/[?&](?:id|cmid)=([^&#]+)/i)?.[1];
        if (fromUrl) return fromUrl;
        return activity?.getAttribute("data-id") || activity?.id || `material_${Math.random().toString(36).slice(2, 9)}`;
    };

    const parseFileType = (url, title, activity) => {
        const fileName = url?.split("?")[0] || "";
        const extension = (fileName.match(/\.([a-z0-9]+)$/i)?.[1] || "").toLowerCase();
        if (extension) return extension;

        const iconSrc = activity?.querySelector("img.activityicon")?.getAttribute("src") || "";
        const iconAlt = activity?.querySelector("img.activityicon")?.getAttribute("alt") || "";
        const hint = `${iconSrc} ${iconAlt} ${title || ""}`.toLowerCase();

        if (hint.includes("pdf")) return "pdf";
        if (hint.includes("word") || hint.includes("doc")) return "docx";
        if (hint.includes("link") || hint.includes("url")) return "link";
        if (hint.includes("page") || hint.includes("lecture")) return "html";
        return "html";
    };

    const classifyMaterialType = (activity, title, fileType, url) => {
        const classList = activity?.className || "";
        const text = `${title || ""} ${url || ""}`.toLowerCase();

        if (classList.includes("assign") || text.includes("assignment")) return "assignment";
        if (classList.includes("quiz") || text.includes("quiz")) return "quiz";
        if (classList.includes("url") || fileType === "link") return "link";
        if (classList.includes("page") || text.includes("lecture")) return "lecture";
        if (classList.includes("folder") || text.includes("lab") || text.includes("tutorial")) return "lab";
        if (fileType === "pdf") return "pdf";
        if (classList.includes("resource")) return "pdf";
        return "lecture";
    };

    const parseSectionName = (activity) => {
        const section = activity?.closest("li.section, .course-section, .topics .section, section.course-section");
        const heading = section?.querySelector(".sectionname, h3.sectionname, .section-title, .course-section-header h3");
        return cleanText(heading?.textContent) || "General";
    };

    const parseAvailabilityStatus = (activity) => {
        const availability = cleanText(activity?.querySelector(".availabilityinfo")?.textContent);
        if (availability) return availability;

        const restricted = activity?.classList.contains("dimmed") || activity?.classList.contains("hidden") || activity?.classList.contains("stealth");
        return restricted ? "restricted" : "available";
    };

    const parseDueDate = (activity) => {
        const explicitDate = cleanText(activity?.querySelector(".activitydate")?.textContent);
        if (explicitDate) return explicitDate;

        const text = cleanText(activity?.textContent);
        const dueMatch = text?.match(/(?:due\s*(?:date|on)?\s*:?\s*)([^\n|]+)/i);
        return dueMatch?.[1]?.trim() || null;
    };

    const parseFileSize = (activity) => {
        const text = cleanText(activity?.textContent) || "";
        const sizeMatch = text.match(/\b(\d+(?:\.\d+)?)\s?(KB|MB|GB)\b/i);
        return sizeMatch ? `${sizeMatch[1]} ${sizeMatch[2].toUpperCase()}` : null;
    };

    const extractMaterialsFromCourse = (course) => {
        const materials = [];
        const seen = new Set();
        const activities = document.querySelectorAll(".activity, li.activity, .modtype_resource, .course-section .activity-item");

        activities.forEach((activity) => {
            const link = activity.querySelector("a.aalink, .activityname a, a[href]");
            const title = cleanText(activity.querySelector(".instancename")?.textContent || link?.textContent);
            const url = link?.href;
            if (!title || !url) return;

            const materialId = parseMaterialId(url, activity);
            const fileType = parseFileType(url, title, activity);
            const materialType = classifyMaterialType(activity, title, fileType, url);
            const downloadable = Boolean(url && (fileType === "pdf" || /\/pluginfile\.php\//.test(url) || /\/mod\/resource\//.test(url)));
            const dedupeKey = `${course.course_id || "unknown"}-${materialId}-${url}`;

            if (seen.has(dedupeKey)) return;
            seen.add(dedupeKey);

            materials.push({
                course_id: course.course_id,
                course_name: course.course_name,
                section_name: parseSectionName(activity),
                material_id: materialId,
                material_type: materialType,
                title,
                file_type: fileType,
                file_size: parseFileSize(activity),
                url,
                downloadable,
                due_date: parseDueDate(activity),
                availability_status: parseAvailabilityStatus(activity),
                extracted_at: new Date().toISOString()
            });
        });

        return materials;
    };

    const extractGradesFromTable = (courseId) => {
        const grades = [];
        document.querySelectorAll("table.user-grade tbody tr").forEach((row) => {
            const itemName = cleanText(row.querySelector("th.column-itemname")?.textContent);
            const gradeText = cleanText(row.querySelector("td.column-grade")?.textContent);
            const rangeText = cleanText(row.querySelector("td.column-range")?.textContent);
            if (!itemName || !gradeText) return;

            const [gradeValue] = gradeText.split("/");
            const maxGrade = rangeText?.split("/")[1] || rangeText;
            const gradeNumber = parseFloat(gradeValue);
            const maxNumber = parseFloat(maxGrade);
            const percentage =
                Number.isFinite(gradeNumber) && Number.isFinite(maxNumber) && maxNumber > 0
                    ? Math.round((gradeNumber / maxNumber) * 100)
                    : null;

            grades.push({
                course_id: courseId,
                item_name: itemName,
                item_type: itemName.toLowerCase().includes("quiz") ? "quiz" : "assignment",
                grade: gradeText,
                max_grade: rangeText,
                percentage,
                submission_status: cleanText(row.querySelector("td.column-status")?.textContent),
                submission_time: cleanText(row.querySelector("td.column-lastaccess")?.textContent)
            });
        });
        return grades;
    };

    const extractAssignmentDetails = (courseId) => {
        const title = cleanText(document.querySelector("h1")?.textContent);
        const status = cleanText(document.querySelector(".submissionstatustable")?.textContent);
        const dueDate = cleanText(document.querySelector(".submissionstatustable .duedate")?.textContent);
        const grade = cleanText(document.querySelector(".gradingtable .grade")?.textContent);
        return title
            ? [
                  {
                      course_id: courseId,
                      item_name: title,
                      item_type: "assignment",
                      grade,
                      max_grade: null,
                      percentage: null,
                      submission_status: status,
                      submission_time: null
                  }
              ]
            : [];
    };

    const extractQuizDetails = (courseId) => {
        const title = cleanText(document.querySelector("h1")?.textContent);
        const gradeSummary = cleanText(document.querySelector(".quizgradefeedback")?.textContent);
        const gradeInfo = cleanText(document.querySelector(".quizinfo")?.textContent);
        return title
            ? [
                  {
                      course_id: courseId,
                      item_name: title,
                      item_type: "quiz",
                      grade: gradeSummary,
                      max_grade: gradeInfo,
                      percentage: null,
                      submission_status: null,
                      submission_time: null
                  }
              ]
            : [];
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

        if (pageType === "course") {
            const materials = extractMaterialsFromCourse(course);
            if (materials.length) {
                sendMessage("materials", materials);
            }
        }

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

    document.addEventListener("click", () => {
        const pageType = detectPageType();
        const course = getCourseContext();
        sendMessage("interaction", {
            page_type: pageType,
            course_id: course.course_id,
            action_type: "click",
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
