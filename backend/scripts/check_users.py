from sqlalchemy import select
from app.core.database import SessionLocal
from app.models import User

db = SessionLocal()

try:
    users = db.scalars(select(User)).all()

    print(f"\nTotal users: {len(users)}")

    for user in users:
        print(f"Email: {user.email} | Active: {user.is_active}")

finally:
    db.close()