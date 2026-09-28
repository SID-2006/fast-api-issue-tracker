import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from app.auth import get_current_active_user
from app.schemas import IssueCreate, IssueOut, IssueUpdate, IssueStatus, IssuePriority, UserInDB
from app.storage import load_data, save_data

router = APIRouter(prefix="/api/v1/issues", tags=["issues"])


def _belongs_to_user(issue: dict, username: str) -> bool:
    return issue.get("owner_id", "johndoe") == username

@router.get("/",response_model=list[IssueOut])
async def get_issues(
    current_user: Annotated[UserInDB, Depends(get_current_active_user)],
):
    '''Retrieve all issues from the storage.'''
    issues = load_data()
    return [issue for issue in issues if _belongs_to_user(issue, current_user.username)]

@router.post("/", response_model=IssueOut, status_code=status.HTTP_201_CREATED)
def create_issue(
    payload: IssueCreate,
    current_user: Annotated[UserInDB, Depends(get_current_active_user)],
):
    '''Create a new issue and save it to the storage.'''
    issues = load_data()
    new_issue = {
        "id": str(uuid.uuid4()),
        "title": payload.title,
        "description": payload.description,
        "status": IssueStatus.open,
        "priority": payload.priority,
        "owner_id": current_user.username,
    }
    issues.append(new_issue)
    save_data(issues)
    return new_issue


@router.get("/{issue_id}", response_model=IssueOut)
def get_issue(
    issue_id: str,
    current_user: Annotated[UserInDB, Depends(get_current_active_user)],
):
    '''Retrieve a specific issue by its ID.'''
    issues = load_data()
    for issue in issues:
        if issue["id"] == issue_id and _belongs_to_user(issue, current_user.username):
            return issue
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")  


@router.put("/{issue_id}", response_model=IssueOut)
def update_issue(
    issue_id: str,
    payload: IssueUpdate,
    current_user: Annotated[UserInDB, Depends(get_current_active_user)],
):
    '''Update an existing issue by its ID.'''
    issues = load_data()
    for index, issue in enumerate(issues):
        if issue["id"] == issue_id and _belongs_to_user(issue, current_user.username):
            updated_issue = issue.copy()
            if payload.title is not None:
                updated_issue["title"] = payload.title
            if payload.description is not None:
                updated_issue["description"] = payload.description
            if payload.status is not None:
                updated_issue["status"] = payload.status
            if payload.priority is not None:
                updated_issue["priority"] = payload.priority
            issues[index] = updated_issue
            save_data(issues)
            return updated_issue
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")


@router.delete("/{issue_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_issue(
    issue_id: str,
    current_user: Annotated[UserInDB, Depends(get_current_active_user)],
):
    '''Delete an existing issue by its ID.'''
    issues = load_data()
    for index, issue in enumerate(issues):
        if issue["id"] == issue_id and _belongs_to_user(issue, current_user.username):
            del issues[index]
            save_data(issues)
            return
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")