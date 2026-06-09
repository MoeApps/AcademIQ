"""
Tests for basic API health checks and root endpoints.
"""
import pytest


class TestRootEndpoint:
    """Test the root "/" endpoint."""

    def test_root_endpoint_returns_200(self, test_client):
        """Test that root endpoint returns 200 OK."""
        response = test_client.get("/")
        assert response.status_code == 200

    def test_root_endpoint_returns_message(self, test_client):
        """Test that root endpoint returns expected message."""
        response = test_client.get("/")
        data = response.json()
        
        assert "message" in data
        assert "AcademIQ Backend" in data["message"]


class TestHealthEndpoint:
    """Test the /health endpoint."""

    def test_health_endpoint_returns_200(self, test_client):
        """Test that health endpoint returns 200 OK."""
        response = test_client.get("/health")
        assert response.status_code == 200

    def test_health_endpoint_returns_status(self, test_client):
        """Test that health endpoint returns status and database info."""
        response = test_client.get("/health")
        data = response.json()
        
        assert "status" in data
        assert data["status"] == "ok"
        assert "database" in data

    def test_health_endpoint_json_structure(self, test_client):
        """Test that health endpoint returns proper JSON structure."""
        response = test_client.get("/health")
        
        assert response.headers["content-type"] == "application/json"
        data = response.json()
        assert isinstance(data, dict)
