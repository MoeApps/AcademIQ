"""
Verify backend and APIs end-to-end (no mock). Run with backend already running.
From project root: python -m backend.scripts.verify_all
Requires: pip install requests
"""
import sys
import os

try:
    import requests
except ImportError:
    print("Install requests: pip install requests")
    sys.exit(1)

BASE = os.environ.get("ACADEMIQ_API", "http://localhost:8000")


def main():
    failed = []

    # 1. Health
    r = requests.get(f"{BASE}/", timeout=5)
    if r.status_code != 200:
        failed.append(f"GET / -> {r.status_code}")
    else:
        print("OK  GET /")

    # 2. Login student
    r = requests.post(
        f"{BASE}/auth/login",
        json={"username": "student", "password": "password123"},
        headers={"Content-Type": "application/json"},
        timeout=5,
    )
    if r.status_code != 200:
        failed.append(f"POST /auth/login (student) -> {r.status_code}")
        print("FAIL POST /auth/login (student)")
        sys.exit(1)
    token_student = r.json().get("access_token", "")
    print("OK  POST /auth/login (student)")

    # 3. CRUD and student APIs (with student token)
    headers = {"Authorization": f"Bearer {token_student}"}
    for path in [
        "/api/v1/students",
        "/api/v1/courses",
        "/api/v1/grades/S001",
        "/api/v1/students/S001/profile",
        "/api/v1/students/S001/predictions",
        "/api/v1/students/S001/explain",
    ]:
        r = requests.get(f"{BASE}{path}", headers=headers, timeout=5)
        if r.status_code != 200:
            failed.append(f"GET {path} -> {r.status_code}")
            print(f"FAIL GET {path} -> {r.status_code}")
        else:
            print(f"OK  GET {path}")

    # 4. Course stats (pick first course from list)
    r = requests.get(f"{BASE}/api/v1/courses", headers=headers, timeout=5)
    if r.status_code == 200 and r.json():
        cid = r.json()[0].get("course_id")
        if cid:
            r2 = requests.get(
                f"{BASE}/api/v1/students/S001/courses/{cid}/stats",
                headers=headers,
                timeout=5,
            )
            if r2.status_code != 200:
                failed.append(f"GET /api/v1/students/S001/courses/{cid}/stats -> {r2.status_code}")
                print(f"FAIL GET .../courses/.../stats -> {r2.status_code}")
            else:
                print(f"OK  GET /api/v1/students/S001/courses/{cid}/stats")

    # 5. Login instructor
    r = requests.post(
        f"{BASE}/auth/login",
        json={"username": "instructor", "password": "password123"},
        headers={"Content-Type": "application/json"},
        timeout=5,
    )
    if r.status_code != 200:
        failed.append(f"POST /auth/login (instructor) -> {r.status_code}")
        print("FAIL POST /auth/login (instructor)")
    else:
        token_instructor = r.json().get("access_token", "")
        print("OK  POST /auth/login (instructor)")
        for path in ["/api/v1/instructor/at-risk", "/api/v1/instructor/analytics"]:
            r2 = requests.get(
                f"{BASE}{path}",
                headers={"Authorization": f"Bearer {token_instructor}"},
                timeout=5,
            )
            if r2.status_code != 200:
                failed.append(f"GET {path} -> {r2.status_code}")
                print(f"FAIL GET {path} -> {r2.status_code}")
            else:
                print(f"OK  GET {path}")

    if failed:
        print("\nFailed:", failed)
        sys.exit(1)
    print("\nAll checks passed.")


if __name__ == "__main__":
    main()
