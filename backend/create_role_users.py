
from getpass import getpass

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import User, Role


ROLES_TO_CREATE = [
    "Desk Head",
    "Treating Doctor",
    "CFO",
]


def main():
    db = SessionLocal()

    try:
        # Verify all required roles exist.
        roles = {
            role.name: role
            for role in db.scalars(
                select(Role).where(Role.name.in_(ROLES_TO_CREATE))
            ).all()
        }

        missing_roles = set(ROLES_TO_CREATE) - set(roles)

        if missing_roles:
            raise ValueError(
                f"Missing database roles: {', '.join(missing_roles)}"
            )

        accounts = []
        used_emails = set()

        # Collect all account details before inserting anything.
        for role_name in ROLES_TO_CREATE:
            print(f"\n--- Create {role_name} account ---")

            full_name = input("Full name: ").strip()
            email = input("Email: ").strip().lower()

            if not full_name or "@" not in email:
                raise ValueError("Invalid name or email.")

            if email in used_emails:
                raise ValueError("Duplicate email entered.")

            existing_user = db.scalar(
                select(User).where(User.email == email)
            )

            if existing_user:
                raise ValueError(
                    f"Account already exists for {email}. "
                    "No accounts were created."
                )

            password = getpass("Password (minimum 8 characters): ")
            confirm_password = getpass("Confirm password: ")

            if len(password) < 8:
                raise ValueError("Password must contain at least 8 characters.")

            if password != confirm_password:
                raise ValueError("Passwords do not match.")

            accounts.append({
                "full_name": full_name,
                "email": email,
                "password_hash": hash_password(password),
                "role": roles[role_name],
            })

            used_emails.add(email)

        # Create all three accounts in one transaction.
        for account in accounts:
            user = User(
                full_name=account["full_name"],
                email=account["email"],
                password_hash=account["password_hash"],
                is_active=True,
            )

            user.roles.append(account["role"])
            db.add(user)

        db.commit()

        print("\nSUCCESS: All three accounts created.")

        for account in accounts:
            print(
                f"{account['full_name']} | "
                f"{account['email']} | "
                f"{account['role'].name}"
            )

    except Exception as error:
        db.rollback()
        print(f"\nERROR: {error}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
