from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    authenticate_user,
    create_access_token,
    fake_users_db,
    get_password_hash,
    get_user,
)
from app.schemas import Token, User, UserCreate
from app.user_storage import save_user

router = APIRouter(tags=["auth"])


@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register_user(payload: UserCreate) -> User:
    username = payload.username.lower()
    if get_user(fake_users_db, username):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already registered",
        )

    user_data = {
        "username": username,
        "full_name": None,
        "email": None,
        "hashed_password": get_password_hash(payload.password),
        "disabled": False,
    }
    save_user(user_data)
    return User(**{key: value for key, value in user_data.items() if key != "hashed_password"})


@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> Token:
    user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(access_token=access_token, token_type="bearer")