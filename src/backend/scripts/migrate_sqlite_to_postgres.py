import os
import shutil
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database import connect_db, ensure_schema


TABLES = {
    "customers": (
        "id", "qcc_id", "company_name", "credit_code", "legal_person", "company_status", "address",
        "registered_capital", "established_date", "risk_level", "has_new_risk", "has_company_change",
        "created_at", "last_checked_at",
    ),
    "risk_records": (
        "id", "customer_id", "risk_type", "risk_level", "title", "description", "occurred_at", "created_at", "is_handled",
    ),
    "company_changes": (
        "id", "customer_id", "field_name", "old_value", "new_value", "changed_at", "created_at",
    ),
}


def copy_runtime_data():
    seed_path = Path(os.getenv("LIVE_ASSESSMENTS_SOURCE_PATH", "/app/seed-data/live_assessments.json"))
    target_path = Path(os.getenv("LIVE_ASSESSMENTS_TARGET_PATH", "/app/data/live_assessments.json"))
    if seed_path.exists() and not target_path.exists():
        target_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(seed_path, target_path)


def migrate():
    source_path = Path(os.getenv("SQLITE_SOURCE_PATH", "/app/seed-data/risk_monitor.db"))
    if not source_path.is_file():
        raise FileNotFoundError(f"SQLite source not found: {source_path}")

    source = sqlite3.connect(source_path)
    source.row_factory = sqlite3.Row
    target = connect_db()
    try:
        ensure_schema(target)
        target_counts = {
            table: target.execute(f"SELECT COUNT(*) AS count FROM {table}").fetchone()["count"]
            for table in TABLES
        }
        target.commit()
        if any(target_counts.values()):
            print(f"PostgreSQL already contains data; migration skipped: {target_counts}")
            copy_runtime_data()
            return

        with target.transaction():
            for table, columns in TABLES.items():
                records = source.execute(f"SELECT {', '.join(columns)} FROM {table} ORDER BY id").fetchall()
                if records:
                    placeholders = ", ".join(["%s"] * len(columns))
                    with target.cursor() as cursor:
                        cursor.executemany(
                            f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({placeholders})",
                            [tuple(record[column] for column in columns) for record in records],
                        )
                target.execute(
                    "SELECT setval(pg_get_serial_sequence(%s, 'id'), COALESCE(MAX(id), 1), COUNT(*) > 0) FROM " + table,
                    (table,),
                )
                print(f"Migrated {table}: {len(records)} row(s)")
        copy_runtime_data()
    finally:
        source.close()
        target.close()


if __name__ == "__main__":
    migrate()
