import argparse

from app.config.database import ensure_indexes
from app.repositories import session_repository, user_repository
from app.services.email_service import send_password_reset_email
from app.services.security import hash_password
from app.utils.password import generate_password


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Reset an AcademIQ user's password safely."
    )
    parser.add_argument(
        "--email",
        required=True,
        help="The user's email address.",
    )
    parser.add_argument(
        "--password",
        default=None,
        help="Optional new password. If omitted, a temporary password is generated.",
    )

    args = parser.parse_args()

    ensure_indexes()

    email = args.email.strip().lower()
    plain_password = args.password or generate_password()

    user = user_repository.find_by_email(email)

    if not user:
        print(f"[ERROR] No user found with email: {email}")
        return

    user_repository.update(
        str(user["_id"]),
        {
            "password_hash": hash_password(plain_password),
        },
    )

    session_repository.delete_sessions_for_user(str(user["_id"]))

    send_password_reset_email(
        user.get("email", ""),
        user.get("full_name", ""),
        plain_password,
    )

    print("[OK] Password reset successfully.")
    print(f"Email: {email}")
    print(f"New password: {plain_password}")
    print("All existing sessions for this user were invalidated.")


if __name__ == "__main__":
    main()