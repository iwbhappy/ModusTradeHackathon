import asyncio
import logging
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm.exc import StaleDataError

from .config import settings
from .domain.errors import DomainError
from .routes import router
from .sla import scheduler

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
)


def warm_up_embeddings() -> None:
    """Загружает модель и досчитывает векторы; при неудаче остаётся режим правил."""
    from .ai.embeddings import sync_embeddings
    from .db import SessionLocal

    with SessionLocal() as db:
        count = sync_embeddings(db)
        db.commit()
    if count:
        logging.getLogger("signal.ai").info("Посчитано векторов обращений: %s", count)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(scheduler(settings().sla_interval_seconds))
    # Модель грузится в фоне, чтобы API отвечал сразу после старта.
    asyncio.get_running_loop().run_in_executor(None, warm_up_embeddings)
    yield
    task.cancel()
    with suppress(asyncio.CancelledError):
        await task


app = FastAPI(title="Сигнал · API", version="0.3.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings().cors_origins,
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(router)


@app.exception_handler(DomainError)
async def domain_error(request: Request, error: DomainError):
    return JSONResponse({"detail": error.message}, status_code=error.status)


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, error: RequestValidationError):
    fields = ", ".join(".".join(map(str, e["loc"][1:])) for e in error.errors())
    return JSONResponse(
        {"detail": f"Проверьте обязательные поля и допустимые значения: {fields}"},
        status_code=422,
    )


@app.exception_handler(IntegrityError)
async def conflict(request: Request, error: IntegrityError):
    return JSONResponse(
        {"detail": "Запись уже существует или связана с другими данными"},
        status_code=409,
    )


@app.exception_handler(StaleDataError)
async def concurrent_change(request: Request, error: StaleDataError):
    return JSONResponse(
        {"detail": "Обращение уже изменено другим пользователем. Обновите карточку."},
        status_code=409,
    )


@app.get("/health")
def health():
    return {"status": "ok"}
