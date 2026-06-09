"""
Tests for the security module (password hashing, token generation).
"""
import pytest
from app.services.security import (
    hash_password,
    verify_password,
    generate_session_token,
    hash_token,
)


class TestPasswordHashing:
    """Test password hashing and verification."""

    def test_hash_password_creates_unique_hashes(self):
        """Test that hashing the same password twice produces different hashes."""
        password = "SecurePassword123!"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        
        assert hash1 != hash2  # Different bcrypt salts
        assert len(hash1) == 60  # bcrypt hash length

    def test_verify_password_success(self):
        """Test successful password verification."""
        password = "MyPassword123!"
        password_hash = hash_password(password)
        
        assert verify_password(password, password_hash) is True

    def test_verify_password_fails_with_wrong_password(self):
        """Test that verification fails with incorrect password."""
        password = "CorrectPassword"
        wrong_password = "WrongPassword"
        password_hash = hash_password(password)
        
        assert verify_password(wrong_password, password_hash) is False

    def test_verify_password_handles_empty_inputs(self):
        """Test that verification handles empty/None inputs safely."""
        password_hash = hash_password("ValidPassword")
        
        assert verify_password("", password_hash) is False
        assert verify_password(None, password_hash) is False
        assert verify_password("password", "") is False
        assert verify_password("password", None) is False

    def test_verify_password_handles_malformed_hash(self):
        """Test that verification handles malformed hashes gracefully."""
        # Malformed hashes should return False, not raise exceptions
        assert verify_password("password", "malformed") is False
        assert verify_password("password", "$2b$invalid") is False

    def test_password_truncation_at_72_bytes(self):
        """Test that passwords > 72 bytes are handled correctly."""
        short_password = "a" * 70
        long_password = "a" * 100
        
        short_hash = hash_password(short_password)
        long_hash = hash_password(long_password)
        
        # Both should be verifiable (bcrypt truncates internally)
        assert verify_password(short_password, short_hash) is True
        assert verify_password(long_password, long_hash) is True


class TestSessionTokens:
    """Test session token generation and hashing."""

    def test_generate_session_token_creates_valid_token(self):
        """Test that generated tokens are non-empty and URL-safe."""
        token = generate_session_token()
        
        assert isinstance(token, str)
        assert len(token) > 0
        # URL-safe characters only (no special chars except - _ .)
        assert all(c.isalnum() or c in '-_.' for c in token)

    def test_generate_session_tokens_are_unique(self):
        """Test that each generated token is unique."""
        tokens = {generate_session_token() for _ in range(100)}
        
        # All tokens should be unique
        assert len(tokens) == 100

    def test_hash_token_creates_consistent_hash(self):
        """Test that hashing the same token produces the same hash."""
        token = "test_token_123"
        hash1 = hash_token(token)
        hash2 = hash_token(token)
        
        assert hash1 == hash2
        assert len(hash1) == 64  # SHA-256 hex length

    def test_hash_token_produces_hex_string(self):
        """Test that hash_token produces a valid hex string."""
        token = generate_session_token()
        hashed = hash_token(token)
        
        # Should be valid hex
        try:
            int(hashed, 16)
            is_valid_hex = True
        except ValueError:
            is_valid_hex = False
        
        assert is_valid_hex is True

    def test_hash_token_sensitive_to_input(self):
        """Test that different tokens produce different hashes."""
        token1 = "token_1"
        token2 = "token_2"
        
        hash1 = hash_token(token1)
        hash2 = hash_token(token2)
        
        assert hash1 != hash2
