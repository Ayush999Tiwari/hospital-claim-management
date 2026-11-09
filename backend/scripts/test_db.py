from sqlalchemy import text
from app.core.database import engine

try:
    with engine.connect() as connection:
        result = connection.execute(text("SELECT version()"))
        print("Neon PostgreSQL connected successfully!")
        print(result.scalar())

except Exception as error:
    print("Database connection failed:")
    print(error)

finally:
    engine.dispose()