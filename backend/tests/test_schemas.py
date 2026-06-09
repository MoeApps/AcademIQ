"""
Tests for data serialization and schema handling.
"""
import pytest
from bson import ObjectId
from app.schema.schemas import (
    individual_serial,
    list_serial,
    individual_course_serial,
    list_course_serial,
    individual_assignment_serial,
    list_assignment_serial,
)


class TestTodoSerialization:
    """Test todo item serialization."""

    def test_individual_serial_with_full_data(self):
        """Test serializing a complete todo document."""
        todo = {
            "_id": ObjectId(),
            "name": "Test Todo",
            "description": "A test description",
            "complete": True,
        }
        
        result = individual_serial(todo)
        
        assert "id" in result
        assert isinstance(result["id"], str)
        assert result["name"] == "Test Todo"
        assert result["description"] == "A test description"
        assert result["complete"] is True

    def test_individual_serial_with_missing_fields(self):
        """Test serializing a document with missing fields."""
        todo = {"_id": ObjectId()}
        
        result = individual_serial(todo)
        
        assert "id" in result
        assert result["name"] == ""
        assert result["description"] == ""
        assert result["complete"] is False

    def test_list_serial_empty(self):
        """Test serializing an empty list of todos."""
        result = list_serial([])
        
        assert isinstance(result, list)
        assert len(result) == 0

    def test_list_serial_multiple_items(self):
        """Test serializing multiple todo items."""
        todos = [
            {
                "_id": ObjectId(),
                "name": "Todo 1",
                "complete": False,
            },
            {
                "_id": ObjectId(),
                "name": "Todo 2",
                "complete": True,
            },
        ]
        
        result = list_serial(todos)
        
        assert len(result) == 2
        assert result[0]["name"] == "Todo 1"
        assert result[1]["name"] == "Todo 2"


class TestCourseSerialization:
    """Test course serialization."""

    def test_individual_course_serial_with_full_data(self):
        """Test serializing a complete course document."""
        course = {
            "_id": ObjectId(),
            "course_id": "101",
            "name": "Python Programming",
            "visits": 15,
            "time_spent_ms": 3600000,
            "final_grade": 87.5,
        }
        
        result = individual_course_serial(course)
        
        assert "id" in result
        assert isinstance(result["id"], str)
        assert result["course_id"] == "101"
        assert result["name"] == "Python Programming"
        assert result["visits"] == 15
        assert result["final_grade"] == 87.5

    def test_individual_course_serial_with_missing_fields(self):
        """Test serializing a course with missing optional fields."""
        course = {
            "_id": ObjectId(),
            "course_id": "102",
        }
        
        result = individual_course_serial(course)
        
        assert result["course_id"] == "102"
        assert result["name"] == ""
        assert result["visits"] == 0
        assert result["time_spent_ms"] == 0
        assert result["final_grade"] is None

    def test_list_course_serial(self):
        """Test serializing a list of courses."""
        courses = [
            {
                "_id": ObjectId(),
                "course_id": "101",
                "name": "Course 1",
                "visits": 10,
            },
            {
                "_id": ObjectId(),
                "course_id": "102",
                "name": "Course 2",
                "visits": 20,
            },
        ]
        
        result = list_course_serial(courses)
        
        assert len(result) == 2
        assert result[0]["name"] == "Course 1"
        assert result[1]["name"] == "Course 2"


class TestAssignmentSerialization:
    """Test assignment serialization."""

    def test_individual_assignment_serial(self):
        """Test serializing an assignment."""
        assignment = {
            "_id": ObjectId(),
            "title": "Assignment 1",
            "due_date": "2025-02-15T23:59:59Z",
            "submitted": True,
            "grade": 92,
        }
        
        result = individual_assignment_serial(assignment)
        
        assert "id" in result
        assert result["title"] == "Assignment 1"
        assert result["submitted"] is True
        assert result["grade"] == 92

    def test_list_assignment_serial(self):
        """Test serializing a list of assignments."""
        assignments = [
            {
                "_id": ObjectId(),
                "title": "Assignment 1",
                "grade": 90,
            },
            {
                "_id": ObjectId(),
                "title": "Assignment 2",
                "grade": 85,
            },
        ]
        
        result = list_assignment_serial(assignments)
        
        assert len(result) == 2
        assert result[0]["title"] == "Assignment 1"
        assert result[1]["title"] == "Assignment 2"
