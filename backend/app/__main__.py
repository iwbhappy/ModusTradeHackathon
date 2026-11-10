"""Local startup: migrate, seed only an empty DB, run one API/scheduler process."""

from pathlib import Path
import uvicorn
from alembic import command
from alembic.config import Config

from .db import SessionLocal
from .seed import load_seed


if __name__ == "__main__":
    directory = Path(__file__).resolve().parents[1]
    config = Config(str(directory / "alembic.ini"))
    config.set_main_option("script_location", str(directory / "migrations"))
    command.upgrade(config, "head")
    with SessionLocal() as db:
        load_seed(db)
        db.commit()
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000)
