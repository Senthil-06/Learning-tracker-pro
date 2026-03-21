from datetime import datetime, timedelta, timezone
from sqlalchemy import func
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models, schemas
from auth import get_current_user, get_db

router = APIRouter(prefix="/analytics")


@router.get(
    "/weekly-time",
    response_model=list[schemas.WeeklyTime],
)
def weekly_time(
    weeks: int = 8,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    start = now - timedelta(weeks=weeks)

    rows = (
        db.query(
            func.date_trunc("week", models.LearningSession.created_at).label("week"),
            func.coalesce(func.sum(models.LearningSession.duration_minutes), 0)
            .label("total_minutes"),
        )
        .join(
            models.LearningItem,
            models.LearningItem.id == models.LearningSession.learning_item_id,
        )
        .filter(
            models.LearningItem.owner_id == user.id,
            models.LearningSession.created_at >= start,
        )
        .group_by("week")
        .order_by("week")
        .all()
    )

    # Build complete timeline (fill missing weeks)
    week_map = {
        row.week.date(): row.total_minutes for row in rows
    }

    result = []
    start -= timedelta(days=start.weekday())    #makes sure cursor points to a monday (start of the week)
    cursor = start.date()

    for _ in range(weeks):
        result.append({
            "week_start": cursor,
            "total_minutes": week_map.get(cursor, 0),
        })
        cursor += timedelta(weeks=1)

    return result

@router.get("/streak", response_model= schemas.StreakResponse)
def streak(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    rows = (
        db.query(models.LearningSession.created_at)
        .join(
            models.LearningItem,
            models.LearningItem.id == models.LearningSession.learning_item_id,
        )
        .filter(models.LearningItem.owner_id == user.id)
        .order_by(models.LearningSession.created_at.desc())
        .all()
    )

    if not rows:
        return {
            "current_streak": 0,
            "longest_streak": 0,
            "last_activity": None,
        }

    # Unique days
    days = sorted(
        {row.created_at.date() for row in rows},
        reverse=True,
    )

    today = datetime.now(timezone.utc).date()

    # ---- current streak ----
    current = 0
    cursor = today

    for day in days:
        if day == cursor:
            current += 1
            cursor -= timedelta(days=1)
        else:
            break

    # ---- longest streak ----
    longest = 1
    temp = 1

    for i in range(1, len(days)):
        if days[i] == days[i - 1] - timedelta(days=1):
            temp += 1
            longest = max(longest, temp)
        else:
            temp = 1

    return {
        "current_streak": current,
        "longest_streak": longest,
        "last_activity": days[0],
    }

@router.get("/dropoff", response_model = schemas.DropoffResponse)
def drop(
    days : int = 7,
    db: Session = Depends(get_db),
    user : models.User = Depends(get_current_user)
):
    subq = (
    db.query(
        models.LearningSession.learning_item_id.label("item_id"),
        func.max(models.LearningSession.created_at).label("last_activity")
    )
    .group_by(models.LearningSession.learning_item_id)
    .subquery()
)

    items = (
    db.query(
        models.LearningItem.id,
        models.LearningItem.title,
        func.coalesce(subq.c.last_activity, models.LearningItem.created_at).label("last_activity")
    )
    .outerjoin(subq, models.LearningItem.id == subq.c.item_id)
    .filter(
        models.LearningItem.owner_id == user.id,
        models.LearningItem.archived_at.is_(None),
        models.LearningItem.status != models.LearningStatus.completed,
    )
    .all()
)
    
    result = []

    if not items:
        return {
        "threshold_days": days,
        "count": len(result),
        "items": result,
    }

    now = datetime.now(timezone.utc)
    for item_id, title, last_activity in items:
        gap = (now - last_activity).days
        if gap >= days:
            result.append({
                "id": item_id,
                "title": title,
                "days_since_last_activity": gap,
            })
    return {
        "threshold_days": days,
        "count": len(result),
        "items": result,
    }

@router.get(
    "/subject-breakdown",
    response_model=list[schemas.SubjectBreakdown],
)
def category_breakdown(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    rows = (
        db.query(
            models.LearningItem.title.label("subject"),
            func.coalesce(
                func.sum(models.LearningSession.duration_minutes), 0
            ).label("total_minutes"),
        )
        .outerjoin(
            models.LearningSession,
            models.LearningItem.id == models.LearningSession.learning_item_id,
        )
        .filter(
            models.LearningItem.owner_id == user.id,
        )
        .group_by(models.LearningItem.title)
        .all()
    )

    return rows
