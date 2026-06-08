def individual_raw_moodle_payload_serial(payload) -> dict:
    return {
        "id": str(payload.get("_id", "")),
        "student_id": payload.get("student_id", None),
        "clicks": payload.get("clicks", 0),
        "lastActivity": payload.get("lastActivity", 0),
        "sessions": payload.get("sessions", []),
        "courses": payload.get("courses", {}),
    }


def list_raw_moodle_payload_serial(payloads) -> list:
    return [individual_raw_moodle_payload_serial(payload) for payload in payloads]
