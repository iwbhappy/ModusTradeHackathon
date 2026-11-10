from datetime import timedelta
from typing import Annotated
import jwt

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import settings
from .db import now, session
from .domain.errors import DomainError
from .models import User

Database = Annotated[Session, Depends(session, scope="function")]
bearer = HTTPBearer(auto_error=False)


def issue_token(user: User) -> str:
    return jwt.encode(
        {
            "sub": user.id,
            "iat": now(),
            "exp": now() + timedelta(hours=settings().jwt_ttl_hours),
            "iss": "signal",
            "aud": "signal-ui",
        },
        settings().jwt_secret,
        algorithm="HS256",
    )


def current_user(
    db: Database,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> User:
    try:
        if not credentials:
            raise ValueError("missing token")
        data = jwt.decode(
            credentials.credentials,
            settings().jwt_secret,
            algorithms=["HS256"],
            issuer="signal",
            audience="signal-ui",
            options={"require": ["sub", "exp", "iat"]},
        )
        user = db.get(User, data["sub"])
        if not user:
            raise ValueError("missing user")
        return user
    except (jwt.InvalidTokenError, ValueError):
        raise DomainError("Сеанс истёк. Выполните демо-вход повторно", 401) from None


CurrentUser = Annotated[User, Depends(current_user)]


def admin(user: CurrentUser) -> User:
    if user.role != "Администратор":
        raise DomainError("Действие доступно администратору", 403)
    return user


Admin = Annotated[User, Depends(admin)]
