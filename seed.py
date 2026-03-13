from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
import models
from auth import hash_password
from database import SessionLocal

db: Session = SessionLocal()

# ----- USER -----
user = models.User(
    email="Chief@test.com",
    password_hash=hash_password("password123"),
)

db.add(user)
db.commit()
db.refresh(user)

now = datetime.now(timezone.utc)

# ----- LEARNING ITEMS -----
items = [
    models.LearningItem(
        owner_id=user.id,
        title="PostgreSQL indexing",
        category="Acedemics",
        difficulty=4,
        status="active",
        created_at=now - timedelta(days=30),
    ),
    models.LearningItem(
        owner_id=user.id,
        title="JWT authentication",
        category="Acedemics",
        difficulty=3,
        status="active",
        created_at=now - timedelta(days=25),
    ),
    models.LearningItem(
        owner_id=user.id,
        title="Docker basics",
        category="Responsibilities",
        difficulty=2,
        status="planned",
        created_at=now - timedelta(days=5),
    ),
    models.LearningItem(
        owner_id=user.id,
        title="React hooks",
        category="Skill_up",
        difficulty=3,
        status="completed",
        created_at=now - timedelta(days=40),
    ),
    models.LearningItem(
        owner_id=user.id,
        title="System design notes",
        category="Acedemics",
        difficulty=5,
        status="paused",
        created_at=now - timedelta(days=20),
    ),
    models.LearningItem(
        owner_id=user.id,
        title="Competitive programming",
        category="Hobbies",
        difficulty=5,
        status="active",
        archived_at=now - timedelta(days=10),
        created_at=now - timedelta(days=60),
    ),
]

db.add_all(items)
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
