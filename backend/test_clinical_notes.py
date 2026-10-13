import main
from database import engine

with engine.connect() as conn:
    cursor = conn.connection.cursor()
    cursor.execute("PRAGMA table_info(patients)")
    cols = [r[1] for r in cursor.fetchall()]
    print("Patients table columns after main import:", cols)
    assert "clinical_notes" in cols, "clinical_notes column missing!"

print("Backend schema verification SUCCESS!")
