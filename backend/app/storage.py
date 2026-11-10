from pathlib import Path
from typing import Protocol, BinaryIO
from uuid import uuid4

from fastapi import UploadFile
from .config import settings
from .domain.errors import DomainError

MAX_BYTES = 10 * 1024 * 1024
EXTENSIONS = {".pdf", ".png", ".jpg", ".docx", ".xlsx", ".txt"}


class Storage(Protocol):
    async def save(self, file: UploadFile) -> tuple[str, int]: ...
    def open(self, key: str) -> BinaryIO: ...


class LocalStorage:
    def __init__(self, directory: Path | None = None):
        self.directory = (directory or settings().storage_directory).resolve()
        self.directory.mkdir(parents=True, exist_ok=True)

    def path(self, key: str) -> Path:
        target = (self.directory / key).resolve()
        if target.parent != self.directory:
            raise DomainError("Недопустимый путь вложения", 403)
        return target

    def open(self, key: str) -> BinaryIO:
        try:
            return self.path(key).open("rb")
        except FileNotFoundError:
            raise DomainError("Файл отсутствует в хранилище", 404) from None

    async def save(self, file: UploadFile) -> tuple[str, int]:
        extension = Path(file.filename or "").suffix.lower()
        if extension not in EXTENSIONS:
            raise DomainError("Допустимы только pdf, png, jpg, docx, xlsx, txt", 422)
        key = uuid4().hex + extension
        target = self.path(key)
        size = 0
        try:
            with target.open("xb") as output:
                while chunk := await file.read(64 * 1024):
                    size += len(chunk)
                    if size > MAX_BYTES:
                        raise DomainError("Размер файла превышает 10 МБ", 422)
                    output.write(chunk)
            if not size:
                raise DomainError("Файл пуст", 422)
        except Exception:
            target.unlink(missing_ok=True)
            raise
        finally:
            await file.close()
        return key, size


def storage() -> Storage:
    return LocalStorage()
