from sqlalchemy import select
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import User, Role

db = SessionLocal()

try:
    role = db.scalar(
        select(Role).where(Role.name == "Desk Executive")
    )

    if not role:
        role = Role(name="Desk Executive")
        db.add(role)
        db.flush()

    user = User(
        full_name="Demo Executive",
        email="executive@hospital.com",
        password_hash=hash_password("Demo@12345"),
        is_active=True,
        roles=[role],
    )

    db.add(user)
    db.commit()

    print("Demo user created successfully!")
    print("Email: executive@hospital.com")
    print("Password: Demo@12345")

except Exception:
    db.rollback()
    raise

finally:
    db.close()