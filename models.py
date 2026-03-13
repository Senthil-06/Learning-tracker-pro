from sqlalchemy import Column, Integer, String , DateTime, ForeignKey, Enum, CheckConstraint
from database import Base
from datetime import datetime, timezone
from sqlalchemy.orm import relationship
import enum


class LearningCategory(enum.Enum):
    backend = "backend"
    frontend = "frontend"
    math = "math"
    devops = "devops"
    other = "other"
    Acedemics = "Acedemics"
    Skill_up = "Skill_up"
    Responsibilities = "Responsibilities"
    Hobbies = "Hobbies"
    Miscellaneous = "Miscellaneous"


class LearningStatus(enum.Enum):
    planned = "planned"
    active = "active"
    paused = "paused"
    completed = "completed"




class User(Base):
    __tablename__ = 'users'

    id= Column(Integer,primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="user", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),nullable=False)
    archived_at = Column(DateTime(timezone=True), nullable=True)
    learning_items = relationship("LearningItem", back_populates="owner", passive_deletes=True)




class LearningItem(Base):
    __tablename__ = "learning_items"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    category = Column(Enum(LearningCategory), nullable=False)
    difficulty = Column(Integer, nullable=False)
    status = Column(Enum(LearningStatus), default=LearningStatus.planned, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    archived_at = Column(DateTime(timezone=True), nullable=True)

    owner = relationship("User", back_populates="learning_items")
    sessions = relationship("LearningSession",back_populates="learning_item", passive_deletes=True,)
    __table_args__ = (CheckConstraint("difficulty BETWEEN 1 AND 5",name="difficulty_range"),)





class LearningSession(Base):
    __tablename__ = "learning_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    learning_item_id = Column(Integer, ForeignKey("learning_items.id", ondelete="CASCADE"), nullable=False, index=True,)
    duration_minutes = Column(Integer, nullable=False)
    notes = Column(String(1000), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    learning_item = relationship("LearningItem", back_populates="sessions")

    __table_args__ = (CheckConstraint("duration_minutes > 0",name="positive_duration"), CheckConstraint("duration_minutes BETWEEN 1 AND 720", name="upper_bound_duration"))


