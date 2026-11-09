
from getpass import getpass
from sqlalchemy import select
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import User

email = "deskhead@hospital.com"

password = getpass("Enter new Desk Head password: ")

if len(password) < 8:
    raise ValueError("Password must be at least 8 characters.")

db = SessionLocal()

try:
    user = db.scalar(
        select(User).where(User.email == email)
    )

    if not user:
        raise ValueError("Desk Head account not found.")

    user.password_hash = hash_password(password)
    db.commit()

    print("Desk Head password reset successfully.")

finally:
    db.close()
