import json
from pathlib import Path

USERS_FILE = Path(__file__).parent.parent / "data" / "users.json"


def load_users() -> dict:
    if not USERS_FILE.exists():
        return {}
    with USERS_FILE.open("r", encoding="utf-8") as users_file:
        return json.load(users_file)


def save_user(user: dict) -> None:
    users = load_users()
    users[user["username"]] = user
    USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with USERS_FILE.open("w", encoding="utf-8") as users_file:
        json.dump(users, users_file, indent=2)