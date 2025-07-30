"""Chatbot abstraction now backed by Google's Gemini models."""
from __future__ import annotations

import os
from dotenv import load_dotenv
import google.generativeai as genai  # type: ignore

# Load environment variables from .env file
load_dotenv()

# Configure Gemini client using API key from environment
api_key = os.getenv("GEMINI_API_KEY")
print("Loaded GEMINI_API_KEY:", api_key)
if api_key:
    genai.configure(api_key=api_key)
    print("Loaded GEMINI_API_KEY:", os.getenv("GEMINI_API_KEY"))
else:
    raise EnvironmentError("GEMINI_API_KEY not found in environment variables.")

MODEL_NAME = "gemini-2.0-flash"

SYSTEM_PROMPT = (
    "You are a helpful assistant that answers questions using the provided document "
    "context. If the answer is not contained in the context, say so."
)


def ask(question: str, context: str) -> str:
    """Send *question* and *context* to Gemini and return the reply text."""
    model = genai.GenerativeModel(MODEL_NAME)
    prompt = (
        f"{SYSTEM_PROMPT}\n\nDocument contents:\n{context}\n\nQuestion: {question}"
    )

    try:
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.7,
                "max_output_tokens": 512,
            },
        )
        return response.text.strip()
    except Exception as exc:  # pragma: no cover
        return f"[Gemini error] {exc}"


def summarise(text: str) -> str:
    """Return a concise 5-bullet summary of *text* using Gemini."""
    model = genai.GenerativeModel(MODEL_NAME)
    prompt = (
        "Provide a concise summary in 5 bullet points of the following document:"
        f"\n{text[:15000]}"
    )
    try:
        response = model.generate_content(
            prompt,
            generation_config={"temperature": 0.3, "max_output_tokens": 256},
        )
        return response.text.strip()
    except Exception as exc:
        return f"[Gemini error] {exc}"


def generate_auto_suggestions(text: str) -> list[str]:
    """Generate smart question suggestions based on document content."""
    if not genai.api_key:
        return ["What is this document about?", "What are the key points?", "Are there any deadlines?"]
    
    model = genai.GenerativeModel(MODEL_NAME)
    prompt = (
        "Based on the following document, generate 3 smart, specific questions that users might want to ask. "
        "Focus on deadlines, risks, key decisions, requirements, or important details. "
        "Return only the questions, one per line:\n\n"
        f"{text[:8000]}"
    )
    
    try:
        response = model.generate_content(
            prompt,
            generation_config={"temperature": 0.5, "max_output_tokens": 200}
        )
        suggestions = [q.strip() for q in response.text.strip().split('\n') if q.strip()]
        return suggestions[:3] if suggestions else ["What are the main topics?", "Any important dates?", "What are the key requirements?"]
    except Exception:
        return ["What are the main topics?", "Any important dates?", "What are the key requirements?"]


def explain_text(text: str, context: str = "") -> str:
    """Provide a simplified explanation of selected text."""
    if not genai.api_key:
        return "Explanation unavailable - Gemini API key missing."
    
    model = genai.GenerativeModel(MODEL_NAME)
    context_part = f"\n\nDocument context: {context[:3000]}" if context else ""
    prompt = (
        f"Explain the following text in simple, clear terms. If it's technical, break it down for easy understanding:"
        f"\n\nText to explain: {text}"
        f"{context_part}"
    )
    
    try:
        response = model.generate_content(
            prompt,
            generation_config={"temperature": 0.3, "max_output_tokens": 300}
        )
        return response.text.strip()
    except Exception as exc:
        return f"[Error] {exc}"


def compare_documents(text1: str, text2: str, filename1: str, filename2: str) -> tuple[str, list[dict]]:
    """Compare two documents and return summary of changes."""
    if not genai.api_key:
        return "Comparison unavailable - Gemini API key missing.", []
    
    model = genai.GenerativeModel(MODEL_NAME)
    prompt = (
        f"Compare these two documents and provide:\n"
        f"1. A summary of key differences\n"
        f"2. What was added, removed, or changed\n\n"
        f"Document 1 ({filename1}):\n{text1[:10000]}\n\n"
        f"Document 2 ({filename2}):\n{text2[:10000]}"
    )
    
    try:
        response = model.generate_content(
            prompt,
            generation_config={"temperature": 0.3, "max_output_tokens": 600}
        )
        
        # Simple change detection (can be enhanced with difflib)
        import difflib
        differ = difflib.unified_diff(
            text1.splitlines(keepends=True),
            text2.splitlines(keepends=True),
            fromfile=filename1,
            tofile=filename2,
            lineterm=""
        )
        
        changes = []
        for line in differ:
            if line.startswith('+++') or line.startswith('---') or line.startswith('@@'):
                continue
            elif line.startswith('+'):
                changes.append({"type": "added", "text": line[1:].strip()})
            elif line.startswith('-'):
                changes.append({"type": "removed", "text": line[1:].strip()})
        
        return response.text.strip(), changes[:50]  # Limit changes for performance
    except Exception as exc:
        return f"[Error] {exc}", []
