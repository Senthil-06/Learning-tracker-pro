from datetime import datetime, timezone
from fastapi import Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from collections import defaultdict
import models
import schemas
from auth import get_current_user, get_db
from fastapi import APIRouter
from typing import List
router = APIRouter(prefix="/learning-items",tags=["Learning"])


@router.get(
    "/ongoing",
    response_model=list[schemas.LearningItemOngoing],
)
def get_ongoing_learning_items(
    cursor: datetime | None = None,
    limit: int = 10,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    # ---- subquery: last session time per item ----
    last_session_sq = (
        select(
            models.LearningSession.learning_item_id.label("item_id"),
            func.max(models.LearningSession.created_at).label("last_session_at"),
        )
        .group_by(models.LearningSession.learning_item_id)
        .subquery()
    )

    # ---- subquery: total minutes per item ----
    total_minutes_sq = (
        select(
            models.LearningSession.learning_item_id.label("item_id"),
            func.sum(models.LearningSession.duration_minutes).label("total_minutes"),
        )
        .group_by(models.LearningSession.learning_item_id)
        .subquery()
    )

    # ---- base query ----
    query = (
        db.query(
            models.LearningItem.id,
            models.LearningItem.title,
            models.LearningItem.subject_code,
            models.LearningItem.difficulty,
            models.LearningItem.status,
            models.LearningItem.created_at,
            func.coalesce(
                last_session_sq.c.last_session_at,
                models.LearningItem.created_at,
            ).label("last_activity"),
            func.coalesce(
                total_minutes_sq.c.total_minutes,
                0,
            ).label("total_minutes"),
        )
        .outerjoin(
            last_session_sq,
            last_session_sq.c.item_id == models.LearningItem.id,
        )
        .outerjoin(
            total_minutes_sq,
            total_minutes_sq.c.item_id == models.LearningItem.id,
        )
        .filter(
            models.LearningItem.owner_id == user.id,
            models.LearningItem.archived_at.is_(None),
            models.LearningItem.status.in_(
                [
                    models.LearningStatus.planned,
                    models.LearningStatus.active,
                    models.LearningStatus.paused,
                ]
            ),
        )
        .order_by(func.coalesce(
            last_session_sq.c.last_session_at,
            models.LearningItem.created_at,
        ).desc())
    )

    # ---- cursor pagination ----
    if cursor:
        query = query.filter(
            func.coalesce(
                last_session_sq.c.last_session_at,
                models.LearningItem.created_at,
            ) < cursor
        )

    items = query.limit(limit).all()

    item_ids = [row.id for row in items]
    units = db.query(models.LearningUnit).filter(models.LearningUnit.learning_item_id.in_(item_ids)).order_by(models.LearningUnit.id).all()
    units_dict = defaultdict(list)
    for u in units:
        units_dict[u.learning_item_id].append(u)

    result = []
    for row in items:
        row_data = dict(row._mapping)
        row_data["units"] = units_dict[row.id]
        result.append(row_data)

    return result

@router.get("/completed",response_model=list[schemas.LearningItemOngoing])
def get_completed_items(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    last_session_sq = (
        select(
            models.LearningSession.learning_item_id.label("item_id"),
            func.max(models.LearningSession.created_at).label("last_session_at"),
        )
        .group_by(models.LearningSession.learning_item_id)
        .subquery()
    )

    total_minutes_sq = (
        select(
            models.LearningSession.learning_item_id.label("item_id"),
            func.sum(models.LearningSession.duration_minutes).label("total_minutes"),
        )
        .group_by(models.LearningSession.learning_item_id)
        .subquery()
    )

    query = (
        db.query(
            models.LearningItem.id,
            models.LearningItem.title,
            models.LearningItem.subject_code,
            models.LearningItem.difficulty,
            models.LearningItem.status,
            models.LearningItem.created_at,
            func.coalesce(
                last_session_sq.c.last_session_at,
                models.LearningItem.created_at,
            ).label("last_activity"),
            func.coalesce(
                total_minutes_sq.c.total_minutes,
                0,
            ).label("total_minutes"),
        )
        .outerjoin(
            last_session_sq,
            last_session_sq.c.item_id == models.LearningItem.id,
        )
        .outerjoin(
            total_minutes_sq,
            total_minutes_sq.c.item_id == models.LearningItem.id,
        )
        .filter(
            models.LearningItem.owner_id == user.id,
            models.LearningItem.archived_at.is_(None),
            models.LearningItem.status == models.LearningStatus.completed,
        )
        .order_by(models.LearningItem.created_at.desc())
    )

    items = query.all()

    item_ids = [row.id for row in items]
    units = db.query(models.LearningUnit).filter(models.LearningUnit.learning_item_id.in_(item_ids)).order_by(models.LearningUnit.id).all()
    units_dict = defaultdict(list)
    for u in units:
        units_dict[u.learning_item_id].append(u)

    result = []
    for row in items:
        row_data = dict(row._mapping)
        row_data["units"] = units_dict[row.id]
        result.append(row_data)

    return result

@router.get("/archived",response_model=List[schemas.LearningItemRead])
def get_archived_items(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    items = (
        db.query(models.LearningItem)
        .filter(
            models.LearningItem.owner_id == user.id,
            models.LearningItem.archived_at.isnot(None),
        )
        .order_by(models.LearningItem.archived_at.desc())
        .all()
    )
    return items
@router.post("/{id}/sessions", status_code=201)
def log_session(
    id: int,
    payload: schemas.SessionCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if payload.duration_minutes <= 0:
        raise HTTPException(status_code=400, detail="Duration must be > 0")
    
    item = (
        db.query(models.LearningItem)
        .filter(models.LearningItem.id == id)
        .first()
    )

    if not item:
        raise HTTPException(status_code=404, detail="Learning item not found")

    if item.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not your item")

    if item.archived_at is not None:
        raise HTTPException(status_code=400, detail="Item is archived")

    if item.status == models.LearningStatus.completed:
        raise HTTPException(status_code=400, detail="Item already completed")

    session = models.LearningSession(
        learning_item_id=item.id,
        duration_minutes=payload.duration_minutes,
        notes=payload.notes,
    )

    db.add(session)
    db.commit()

    return {"message": "Session logged"}

@router.post("")
def post_learning_item(payload: schemas.LearningItemCreate, db: Session=Depends(get_db), user: models.User=Depends(get_current_user)):

    #enforcing unique title at API level
    existing=db.query(models.LearningItem).filter(models.LearningItem.owner_id==user.id,models.LearningItem.title==payload.title).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subject already Exists")
    
    item=models.LearningItem(
        owner_id=user.id,
        title=payload.title,
        subject_code=payload.subject_code,
        difficulty=payload.difficulty,
        status=models.LearningStatus.planned)
    db.add(item)
    db.commit()
    db.refresh(item)

    # Automatically generate 5 units
    units = [
        models.LearningUnit(
            learning_item_id=item.id,
            unit_number=i,
            name=f"Unit {i}",
            two_marks_completed=False,
            eleven_marks_completed=False
        ) for i in range(1, 6)
    ]
    db.add_all(units)
    db.commit()

    return {"id": item.id, "message":"item created successfully"}

@router.patch("/{id}")
def edit_learning_item(id: int, payload: schemas.LearningItemUpdate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    item = db.query(models.LearningItem).filter(models.LearningItem.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Learning item not found")
    if item.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not your item")

    # --- Archived item: only unarchive is allowed ---
    if item.archived_at:
        if payload.unarchive:
            item.archived_at = None
            db.commit()
            return {"message": "Item unarchived"}
        raise HTTPException(status_code=400, detail="Item is archived. Only unarchiving is allowed.")

    # --- Archive request ---
    if payload.archive:
        item.archived_at = datetime.now(timezone.utc)
        db.commit()
        return {"message": "Item archived"}

    # --- Completed items cannot be edited ---
    if item.status == models.LearningStatus.completed:
        raise HTTPException(status_code=400, detail="Cannot edit a completed item")

    # --- Regular field updates ---
    if payload.title is not None:
        item.title = payload.title
    if payload.subject_code is not None:
        item.subject_code = payload.subject_code
    if payload.difficulty is not None:
        item.difficulty = payload.difficulty

    # --- Status update ---
    if payload.status is not None:
        if payload.status == models.LearningStatus.completed:
            has_session = (
                db.query(models.LearningSession)
                .filter(models.LearningSession.learning_item_id == item.id)
                .first()
            )
            if not has_session:
                raise HTTPException(status_code=400, detail="Cannot complete item without any sessions")
        item.status = payload.status

    db.commit()
    return {"message": "Item updated"}

@router.patch("/{id}/units/{unit_number}")
def update_learning_unit(
    id: int, 
    unit_number: int, 
    payload: schemas.LearningUnitUpdate, 
    db: Session = Depends(get_db), 
    user: models.User = Depends(get_current_user)
):
    item = db.query(models.LearningItem).filter(models.LearningItem.id == id, models.LearningItem.owner_id == user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    unit = db.query(models.LearningUnit).filter(models.LearningUnit.learning_item_id == id, models.LearningUnit.unit_number == unit_number).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    if payload.name is not None:
        unit.name = payload.name
    if payload.two_marks_completed is not None:
        unit.two_marks_completed = payload.two_marks_completed
    if payload.eleven_marks_completed is not None:
        unit.eleven_marks_completed = payload.eleven_marks_completed

    db.commit()
    return {"message": "Unit updated"}

@router.get("/{id}",response_model=schemas.LearningItemDetail)
def get_learning_item(
    id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item= db.query(models.LearningItem).filter(models.LearningItem.id ==id).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    if user.id != item.owner_id:
        raise HTTPException(status_code=403, detail="Not yours")
    if item.archived_at:
        raise HTTPException(status_code=400, detail="Already archived")
    
    sessions = (
        db.query(models.LearningSession)
        .filter(models.LearningSession.learning_item_id == item.id)
        .order_by(models.LearningSession.created_at.desc())
        .all()
    )

    total_minutes = sum(s.duration_minutes for s in sessions)

    last_activity = (
        sessions[0].created_at
        if sessions
        else item.created_at
    )

    return {
        "id": item.id,
        "title": item.title,
        "subject_code": item.subject_code,
        "difficulty": item.difficulty,
        "status": item.status,
        "created_at": item.created_at,
        "archived_at": item.archived_at,
        "total_minutes": total_minutes,
        "last_activity": last_activity,
        "sessions": sessions,
        "units": item.units
    }



