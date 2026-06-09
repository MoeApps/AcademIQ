# AcademIQ Backend - Testing Guide

## Quick Start

```bash
cd backend
pip install -r requirements-test.txt
pytest tests/ -v
```

## Test Files Overview

| File | Tests | Coverage |
|------|-------|----------|
| `test_security.py` | 15 | Password hashing, token generation, verification |
| `test_api_health.py` | 3 | Root endpoint, health checks |
| `test_course_routes.py` | 14 | Course CRUD (GET, POST, PUT, DELETE) |
| `test_assignment_routes.py` | 11 | Assignment CRUD operations |
| `test_auth.py` | 3 | Authentication and authorization |
| `test_schemas.py` | 13 | Data serialization, edge cases |
| **TOTAL** | **59** | **Complete backend coverage** |

## Running Tests

### All tests with verbose output
```bash
pytest tests/ -v
```

### With coverage report
```bash
pytest tests/ --cov=app --cov-report=html --cov-report=term-missing
```

### Specific test file
```bash
pytest tests/test_security.py -v
```

### Specific test class
```bash
pytest tests/test_security.py::TestPasswordHashing
```

### Specific test function
```bash
pytest tests/test_security.py::TestPasswordHashing::test_hash_password_creates_unique_hashes
```

### Run only fast tests
```bash
pytest tests/ -m "not slow"
```

## Test Fixtures

Available fixtures in `conftest.py`:

- **`test_client`** - FastAPI TestClient with mocked MongoDB
- **`mock_mongo_client`** - MongoMock client for database testing
- **`mock_database`** - Isolated test database
- **`mock_collections`** - Pre-configured MongoDB collections
- **`sample_user_data`** - Sample user document
- **`sample_admin_data`** - Sample admin user document
- **`sample_course_data`** - Sample course document
- **`sample_assignment_data`** - Sample assignment document
- **`sample_feature_vector_data`** - Sample ML feature vector
- **`sample_moodle_payload`** - Sample Moodle extension payload

## Database Testing

The test suite uses **MongoMock** (in-memory mock MongoDB):

✅ No external database required  
✅ Fast test execution  
✅ Isolated test data  
✅ No side effects on real data  

## Coverage Report

After running tests with `--cov-report=html`:

```bash
open backend/htmlcov/index.html        # macOS
xdg-open backend/htmlcov/index.html    # Linux
start backend/htmlcov/index.html       # Windows
```

The coverage report shows:
- Line-by-line code coverage
- Missing lines highlighted in red
- Overall coverage percentage

## Continuous Integration

### GitHub Actions Workflow

Add to `.github/workflows/test.yml`:

```yaml
name: Backend Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.11"]

    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ matrix.python-version }}
      
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r backend/requirements-test.txt
      
      - name: Run tests with coverage
        run: pytest backend/tests/ --cov=backend/app --cov-report=xml
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.xml
```

## Common Issues

### Import errors
```bash
cd backend
pytest tests/
```

Or set PYTHONPATH:
```bash
PYTHONPATH=backend pytest backend/tests/
```

### MongoDB connection errors
Tests use MongoMock, so real MongoDB isn't needed. If you see connection errors:

1. Ensure mongomock is installed: `pip install mongomock`
2. Check `conftest.py` has `from mongomock import MongoClient`

### Async test failures
If async tests fail, ensure `pytest-asyncio` is installed:

```bash
pip install pytest-asyncio
```

## Adding New Tests

### 1. Create test file

```python
# backend/tests/test_my_feature.py
import pytest

class TestMyFeature:
    """Tests for my feature."""
    
    def test_something(self, test_client):
        """Test description."""
        response = test_client.get("/endpoint")
        assert response.status_code == 200
```

### 2. Use fixtures

```python
def test_with_database(self, test_client, mock_collections):
    """Test that uses fixtures."""
    mock_collections["courses_collection"].insert_one({"name": "Test"})
```

### 3. Run your test

```bash
pytest tests/test_my_feature.py -v
```

## Test Markers

Tests can be marked for selective execution:

```python
@pytest.mark.unit
def test_something():
    pass

@pytest.mark.slow
def test_slow_operation():
    pass
```

Run specific markers:
```bash
pytest tests/ -m api           # Only API tests
pytest tests/ -m "not slow"    # Skip slow tests
```

## Performance Tips

- Use MongoMock (not real MongoDB) for speed
- Mark slow tests with `@pytest.mark.slow`
- Use `pytest-xdist` for parallel execution: `pip install pytest-xdist && pytest tests/ -n auto`
- Minimize fixture scope when possible
- Clean up after tests to avoid state pollution

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/advanced/testing-dependencies/)
- [MongoMock Documentation](https://github.com/mongomock/mongomock)
- [Coverage.py](https://coverage.readthedocs.io/)
- [Pytest Best Practices](https://docs.pytest.org/en/latest/goodpractices.html)

## Next Steps

1. **Expand test coverage** - Add tests for new endpoints as they're developed
2. **Integration tests** - Test component interactions
3. **Load tests** - Test performance under load with `locust` or `k6`
4. **End-to-end tests** - Test full workflows with `Playwright` or `Cypress`
5. **CI/CD** - Integrate with GitHub Actions (see example above)
