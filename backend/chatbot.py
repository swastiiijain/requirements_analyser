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
