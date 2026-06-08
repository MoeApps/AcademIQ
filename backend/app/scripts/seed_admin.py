"""
Seed the initial admin account so you can log into /admin immediately.

Idempotent: if an account with ADMIN_EMAIL already exists it is left untouched
(its password is NOT reset). Credentials come from the environment with safe
defaults (see app/config/settings.py):

    ADMIN_EMAIL     (default: admin@academiq.local)
    ADMIN_PASSWORD  (default: Admin@12345)
    ADMIN_NAME      (default: AcademIQ Admin)

Run from the backend/ directory:

    python -m app.scripts.seed_admin
"""

from app.config.database import ensure_indexes
from app.config.settings import ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD
from app.models.user import ROLE_ADMIN, build_user_document
from app.repositories import user_repository
from app.services.security import hash_password


def seed_admin() -> None:
    ensure_indexes()

    existing = user_repository.find_by_email(ADMIN_EMAIL)
    if existing:
        print(f"ℹ️  Admin already exists: {ADMIN_EMAIL} (no changes made).")
        return

    document = build_user_document(
        email=ADMIN_EMAIL,
        password_hash=hash_password(ADMIN_PASSWORD),
        full_name=ADMIN_NAME,
        role=ROLE_ADMIN,
    )
    user_repository.create(document)
    print(
        "✅ Admin account created:\n"
        f"   Email:    {ADMIN_EMAIL}\n"
        f"   Password: {ADMIN_PASSWORD}\n"
        "   ⚠️  Change this password after first login."
    )


if __name__ == "__main__":
    seed_admin()
