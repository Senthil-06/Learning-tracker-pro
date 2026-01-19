from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm

import models
import schemas
from auth import (
    get_db,
    hash_password,
    verify_password,
    create_access_token,
)

app = FastAPI()


# ---------------- REGISTER ----------------

@app.post("/auth/register", status_code=201)
def register_user(  
    payload: schemas.UserCreate,
    db: Session = Depends(get_db),
): #didn't bother writing responese_model? good practice?
    existing = (
        db.query(models.User)  #models.User resembles a table but it probably is a ORM model
        .filter(models.User.email == payload.email)
        .first()  #if only one record is returned, why .first()?
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
def login(# why no async?
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
        data={"sub": user.id}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }
