"""
Reusable, cryptographically-secure one-time password generator.

Used when auto-provisioning students (and on admin create / reset). The password
is emailed once and only its bcrypt hash is stored — never the plaintext.

Per product choice it's an **8-digit numeric** code for easy entry. NOTE: this
is much weaker than a mixed 12+ char password (~10^8 combinations); it's
acceptable only because it's a temporary password the student is asked to change
after first login. Randomness still comes from the `secrets` CSPRNG.
"""

import secrets
import string

PASSWORD_LENGTH = 8


def generate_password(length: int = PASSWORD_LENGTH) -> str:
    """Generate a secure random numeric one-time password (digits only)."""
    length = max(int(length), 4)
    return "".join(secrets.choice(string.digits) for _ in range(length))
