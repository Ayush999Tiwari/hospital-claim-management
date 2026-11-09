from sqlalchemy import inspect
from app.core.database import engine

inspector = inspect(engine)

for table in inspector.get_table_names():
    print(f"\nTABLE: {table}")
    for column in inspector.get_columns(table):
        print(
            f"  {column['name']} | "
            f"type={column['type']} | "
            f"nullable={column['nullable']} | "
            f"default={column['default']}"
        )

engine.dispose()