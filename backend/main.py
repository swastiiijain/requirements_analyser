"""FastAPI entrypoint for the secure document-aware chatbot backend."""
from __future__ import annotations

from dotenv import load_dotenv
load_dotenv()

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from backend import auth as auth_utils
from backend import chatbot
from backend import document_reader
from backend.schemas import AskRequest, AskResponse, LoginRequest, LoginResponse, ReadDocResponse

app = FastAPI(title="Secure Document Chatbot")

# Allow local frontend dev server; adjust in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory mapping from JWT token -> last extracted document text.
session_docs: dict[str, str] = {}


@app.post("/auth", response_model=LoginResponse, tags=["auth"])
def login(data: LoginRequest):
    if not auth_utils.authenticate_user(data.username, data.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = auth_utils.create_access_token({"sub": data.username})
    return LoginResponse(access_token=token)


def _parse_bearer(authorization: str | None = Header(None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid Authorization header")
    return authorization.split(" ", 1)[1]


def _validate_token(token: str) -> None:
    try:
        auth_utils.decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired or invalid")


@app.post("/read-doc", response_model=ReadDocResponse, tags=["document"])
def read_doc(token: str = Depends(_parse_bearer)):
    _validate_token(token)
    filename, text = document_reader.get_active_document_text()
    session_docs[token] = text
    return ReadDocResponse(filename=filename, characters=len(text))


@app.post("/ask", response_model=AskResponse, tags=["chat"])
def ask_question(req: AskRequest, token: str = Depends(_parse_bearer)):
    _validate_token(token)
    context = session_docs.get(token)
    if not context:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No document has been analyzed for this session. Click 'Read Active Document' first.")

    answer = chatbot.ask(req.question, context)
    return AskResponse(answer=answer) 