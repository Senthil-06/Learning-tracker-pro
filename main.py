from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from routers.learning_items import router as learning_router
from routers.analytics import router as analytics_router
from routers.profile import router as profile_router
from fastapi.middleware.cors import CORSMiddleware


import models
import schemas
from auth import (
    get_db,
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)

app = FastAPI()
app.include_router(learning_router)
app.include_router(analytics_router)
app.include_router(profile_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------- REGISTER ----------------

@app.post("/auth/register", status_code=201)
def register_user(  
    payload: schemas.UserCreate,
    db: Session = Depends(get_db),
):
    existing = (
        db.query(models.User) 
        .filter(models.User.email == payload.email)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    user = models.User(
        email=payload.email,
        password_hash=hash_password(payload.password),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "User created"}


# ---------------- LOGIN ----------------

@app.post("/auth/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = (
        db.query(models.User)
        .filter(models.User.email == form_data.username)
        .first()
    )

    if not user or not verify_password(
        form_data.password, user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    access_token = create_access_token(
        data={"sub": str(user.id)}    
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }



# testing

@app.get("/me")
def read_me(
    current_user: models.User = Depends(get_current_user)
):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "created_at": current_user.created_at,
    }
