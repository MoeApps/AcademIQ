// Fills Student ID on localhost AcademIQ from extension storage.
// After reloading the extension in chrome://extensions, refresh this page (old script = "Extension context invalidated").
(() => {
    let observer = null;
    let finished = false;

    function stop() {
        finished = true;
        if (observer) {
            try {
                observer.disconnect();
            } catch (_) {
                /* ignore */
            }
            observer = null;
        }
    }

    function extensionAlive() {
        try {
            return Boolean(chrome?.runtime?.id);
        } catch {
            return false;
        }
    }

    function tryFill() {
        if (finished) return;
        if (!extensionAlive()) {
            stop();
            return;
        }
        try {
            chrome.storage.local.get("moodleData", (res) => {
                if (finished) return;
                if (chrome.runtime.lastError) {
                    stop();
                    return;
                }
                try {
                    const sid = res?.moodleData?.student?.student_id;
                    if (!sid || typeof sid !== "string") return;

                    window.dispatchEvent(new CustomEvent("academiq-fill-student-id", { detail: { studentId: sid } }));

                    const input =
                        document.querySelector("input#studentId") ||
                        document.querySelector('input[name="studentId"]');
                    if (input && (!input.value || !input.value.trim())) {
                        input.value = sid;
                        input.dispatchEvent(new Event("input", { bubbles: true }));
                    }
                    // One successful read is enough; avoids spam after extension reload
                    stop();
                } catch {
                    stop();
                }
            });
        } catch {
            stop();
        }
    }

    if (!extensionAlive()) return;

    [0, 500, 1500, 3000].forEach((ms) => setTimeout(tryFill, ms));

    observer = new MutationObserver(() => {
        if (finished) return;
        tryFill();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    setTimeout(stop, 12000);
})();
