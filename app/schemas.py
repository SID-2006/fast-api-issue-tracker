from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional

class IssueStatus(str, Enum):
    open = "open"
    in_progress = "in_progress"
    closed = "closed"


class IssuePriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"

class IssueCreate(BaseModel):
    title: str=Field(min_length=3, max_length=100)
    description: str=Field(min_length=5,max_length=1000)
    priority: IssuePriority=IssuePriority.medium

class IssueUpdate(BaseModel):
    title: Optional[str]=Field(None, min_length=3, max_length=100)
    description: Optional[str]=Field(None, min_length=5,max_length=1000)
    status: Optional[IssueStatus]=None
    priority: Optional[IssuePriority]=None

class IssueOut(BaseModel):
    id: str
    title: str
    description: str
    status: IssueStatus
    priority: IssuePriority


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class User(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    disabled: Optional[bool] = None


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_.-]+$")
    password: str = Field(min_length=8, max_length=128)


class UserInDB(User):
    hashed_password: str