from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, date
from models import LearningCategory, LearningStatus

class UserCreate(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str

class LearningItemOngoing(BaseModel):
    id: int
    title: str
    category: LearningCategory
    status: LearningStatus
    last_activity: datetime
    total_minutes: int

    class Config:
        from_attributes = True

class SessionCreate(BaseModel):
    duration_minutes: int = Field(gt=0, le=480)
    notes: str | None = None

class LearningItemCreate(BaseModel):
    title: str
    category: LearningCategory
    difficulty: int

class LearningItemUpdate(BaseModel):
    title: str | None = None
    category: LearningCategory | None = None
    difficulty: int | None = None
    status: LearningStatus | None = None
    archive: bool = False
    unarchive: bool = False  

class SessionRead(BaseModel):
    id: int
    duration_minutes: int
    created_at: datetime

class LearningItemDetail(BaseModel):
    id: int
    title: str
    category: LearningCategory
    difficulty: int
    status: LearningStatus
    created_at: datetime
    archived_at: datetime | None
    total_minutes: int
    last_activity: datetime
    sessions: list[SessionRead]

class WeeklyTime(BaseModel):
    week_start: date
    total_minutes: int

class StreakResponse(BaseModel):
    current_streak : int
    longest_streak : int
    last_activity : date | None

class DropoffItem(BaseModel):
    id: int
    title: str
    days_since_last_activity: int

class DropoffResponse(BaseModel):
    threshold_days: int
    count: int
    items: list[DropoffItem]

class SubjectBreakdown(BaseModel):
    subject : str
    total_minutes: int

class LearningItemRead(BaseModel):
    id: int
    title: str
    category: LearningCategory
    difficulty: int
    status: LearningStatus
    created_at: datetime
    archived_at: datetime | None

class UserProfileResponse(BaseModel):
    id: int
    email: str
    role: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class PasswordChange(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)

class AccountDeletionConfirm(BaseModel):
    password: str = Field(..., min_length=1)
    confirmation: str = Field(..., pattern="^DELETE$")