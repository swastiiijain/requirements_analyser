import os
import datetime
from typing import Dict

import jwt
from passlib.context import CryptContext

PWD_CONTEXT = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# NOTE: In production, load users securely from vault or encrypted store.
USERS_DB: Dict[str, str] = {
    "admin": PWD_CONTEXT.hash("password")  # default credentials – change after first run!
}

SECRET_KEY = os.getenv("JWT_SECRET", "change_me")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if the plain password matches the hashed password."""
    return PWD_CONTEXT.verify(plain_password, hashed_password)


def authenticate_user(username: str, password: str) -> bool:
    """Validate the user credentials against the in-memory store."""
    hashed = USERS_DB.get(username)
    if not hashed:
        return False
    return verify_password(password, hashed)


def create_access_token(data: dict, expires_delta: int = ACCESS_TOKEN_EXPIRE_MINUTES) -> str:
    """Return a signed JWT token containing *data* with an expiration."""
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=expires_delta)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode the JWT token and return its payload."""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM]) 