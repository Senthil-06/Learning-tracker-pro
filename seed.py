from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
import models
from models import DifficultyLevel
from auth import hash_password
from database import SessionLocal

db: Session = SessionLocal()

# ----- USER -----
user = models.User(
    email="chief2@test.com",
    password_hash=hash_password("password"),
)

db.add(user)
db.commit()
db.refresh(user)

now = datetime.now(timezone.utc)

# ----- LEARNING ITEMS -----
items = [
    models.LearningItem(
        owner_id=user.id,
        title="Operating Systems",
        subject_code="CS23432",
        difficulty=DifficultyLevel.Easy,
        status="active",
        created_at=now - timedelta(days=30),
    ),
    models.LearningItem(
        owner_id=user.id,
        title="Maths",
        subject_code="AI23231",
        difficulty=DifficultyLevel.Easy,
        status="active",
        created_at=now - timedelta(days=25),
    ),
    models.LearningItem(
        owner_id=user.id,
        title="WTMA",
        subject_code="AI23431",
        difficulty=DifficultyLevel.Hard,
        status="planned",
        created_at=now - timedelta(days=5),
    ),
    models.LearningItem(
        owner_id=user.id,
        title="Software construction",
        subject_code="CS23433",
        difficulty=DifficultyLevel.Medium,
        status="planned",
        created_at=now - timedelta(days=40),
    ),
    models.LearningItem(
        owner_id=user.id,
        title="Statistical Analysis",
        subject_code= "AD33333",
        difficulty=DifficultyLevel.Medium,
        status="paused",
        created_at=now - timedelta(days=20),
    ),
    models.LearningItem(
        owner_id=user.id,
        title="Soft Skills",
        subject_code="CSCSCS",
        difficulty=DifficultyLevel.Easy,
        status="active",
        archived_at=now - timedelta(days=10),
        created_at=now - timedelta(days=60),
    ),
]

db.add_all(items)
db.commit()

# ----- UNITS -----
all_units = []
for item in items:
    for i in range(1, 6):
        all_units.append(
            models.LearningUnit(
                learning_item_id=item.id,
                unit_number=i,
                name=f"Unit {i}",
                two_marks_completed=False,
                eleven_marks_completed=False
            )
        )

db.add_all(all_units)
db.commit()

# ----- SESSIONS -----
sessions = [
    models.LearningSession(
        learning_item_id=items[0].id,
        duration_minutes=60,
        created_at=now - timedelta(days=10),
    ),
    models.LearningSession(
        learning_item_id=items[0].id,
        duration_minutes=45,
        created_at=now - timedelta(days=2),
    ),
    models.LearningSession(
        learning_item_id=items[1].id,
        duration_minutes=30,
        created_at=now - timedelta(days=7),
    ),
    models.LearningSession(
        learning_item_id=items[3].id,
        duration_minutes=90,
        created_at=now - timedelta(days=20),
    ),
    models.LearningSession(
        learning_item_id=items[5].id,
        duration_minutes=120,
        created_at=now - timedelta(days=40),
    ),
]

db.add_all(sessions)
db.commit()
db.close()
