from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(..., example="admin")
    password: str = Field(..., example="password")


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str


class ReadDocResponse(BaseModel):
    filename: str
    characters: int 