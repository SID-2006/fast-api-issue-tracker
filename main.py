from pathlib import Path

from fastapi import FastAPI
from app.routes.auth import router as auth_router
from app.routes.issues import router as issues_router
from app.middleware.timer import timing_middleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI(
    title="Issue Tracker API",
    version="0.1.0",
    description="A mini production-style API built with FastAPI",
)

app.middleware("http")(timing_middleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(auth_router)
app.include_router(issues_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}

frontend_dist = Path(__file__).parent / "frontend" / "dist"
if frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")

# items = [
#     {'id': 1, 'name': 'Item 1'},
#     {'id': 2, 'name': 'Item 2'},
#     {'id': 3, 'name': 'Item 3'}
# ]

# @app.get("/health")
# def health_check():
#     return {"status": "ok"}

# @app.get("/items")
# def get_items():
#     return items

# @app.get("/items/{item_id}")
# def get_item(item_id: int):
#     for item in items:
#         if item['id'] == item_id:
#             return item
#     return {"error": "Item not found"}


# @app.post("/items")
# def create_item(item: dict):
#     items.append(item)
#     return item