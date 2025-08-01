from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(..., example="admin")
    password: str = Field(..., example="password")


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AskRequest(BaseModel):
    question: str
    document_id: str = "default"


class AskResponse(BaseModel):
    answer: str


class ReadDocResponse(BaseModel):
    filename: str
    characters: int 


class SummariseRequest(BaseModel):
    text: str


class SummariseResponse(BaseModel):
    summary: str
    characters: int 
    document_id: str


class UploadResponse(BaseModel):
    summary: str
    characters: int 
    document_id: str


class AutoSuggestionsResponse(BaseModel):
    suggestions: list[str]


class ExplainRequest(BaseModel):
    text: str
    context: str = ""
    document_id: str | None = None


class ExplainResponse(BaseModel):
    explanation: str


class NoteRequest(BaseModel):
    content: str
    document_id: str
    topic: str = ""


class NoteResponse(BaseModel):
    note_id: str
    content: str
    document_id: str
    topic: str
    timestamp: str


class NotesListResponse(BaseModel):
    notes: list[NoteResponse]


class CompareRequest(BaseModel):
    text1: str
    text2: str
    filename1: str = "Document 1"
    filename2: str = "Document 2"


class CompareResponse(BaseModel):
    summary: str
    changes: list[dict]
    document1_id: str
    document2_id: str 