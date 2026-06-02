"""
Canonical Moodle learning-material model.

A material is stored exactly once in the `course_materials` collection, keyed by
`(course_id, material_id)`. Categorisation (lecture / assignment / quiz /
practice / …) is **derived from metadata** (`semantic_tags` + `material_type`)
rather than by storing duplicate copies of the material in per-category arrays.
"""

from typing import Any, Dict, List, Optional

# Priority order used to pick a single primary category from a material's tags.
# (The full tag list is preserved; this is just a convenience label.)
_CATEGORY_PRIORITY: List[str] = [
    "assignment",
    "quiz",
    "exam",
    "lecture",
    "practice",
    "lab",
    "revision",
    "reference",
    "resource",
    "general",
]


def stable_material_id(material: Dict[str, Any]) -> Optional[str]:
    """Pick the most stable identifier available for a scraped material."""
    for key in ("material_id", "id", "url"):
        value = material.get(key)
        if value:
            return str(value).strip()
    title = material.get("title")
    return str(title).strip() if title else None


def derive_category(semantic_tags: List[str], material_type: Optional[str]) -> str:
    """Derive a single primary category from tags/type — never stored twice."""
    tags = {str(t).lower() for t in (semantic_tags or [])}
    if material_type:
        tags.add(str(material_type).lower())
    for category in _CATEGORY_PRIORITY:
        if category in tags:
            return category
    return "general"


def build_material_doc(
    material: Dict[str, Any],
    course_id: Optional[str],
    course_name: Optional[str],
) -> Optional[Dict[str, Any]]:
    """
    Build a canonical material document from a scraped material object.

    Returns None when the material has no usable identifier. `first_seen` /
    `last_seen` are set by the repository on upsert.
    """
    material_id = stable_material_id(material)
    if not material_id:
        return None

    course_id = str(course_id or material.get("course_id") or material.get("courseId") or "").strip() or None
    semantic_tags = material.get("semantic_tags") or []
    material_type = material.get("material_type") or material.get("type")

    return {
        "course_id": course_id,
        "course_name": course_name or material.get("course_name"),
        "material_id": material_id,
        "title": material.get("title") or "Untitled Material",
        "material_type": material_type or "unknown",
        "file_type": material.get("file_type") or material.get("fileType") or "unknown",
        "url": material.get("url"),
        "resolved_url": material.get("resolvedUrl") or material.get("resolved_url"),
        "source_page": material.get("sourcePage") or material.get("source_page"),
        "section_name": material.get("section_name"),
        "semantic_tags": list(semantic_tags),
        "category": derive_category(semantic_tags, material_type),
        "due_date": material.get("due_date"),
        "availability_status": material.get("availability_status"),
        "downloadable": bool(material.get("downloadable")),
    }


def serialize_material(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Convert a canonical material document to a camelCase API payload."""
    if not doc:
        return None
    return {
        "id": str(doc.get("_id", "")),
        "courseId": doc.get("course_id"),
        "courseName": doc.get("course_name"),
        "materialId": doc.get("material_id"),
        "title": doc.get("title", ""),
        "type": doc.get("material_type", "unknown"),
        "fileType": doc.get("file_type", "unknown"),
        "category": doc.get("category", "general"),
        "semanticTags": doc.get("semantic_tags", []),
        "url": doc.get("url"),
        "dueDate": doc.get("due_date"),
        "downloadable": bool(doc.get("downloadable")),
    }


def serialize_materials(docs) -> list:
    return [serialize_material(d) for d in docs]
