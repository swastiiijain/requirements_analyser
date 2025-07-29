"""Light abstraction for sending queries to the configured LLM provider."""
from __future__ import annotations

import os

import openai

openai.api_key = os.getenv("OPENAI_API_KEY", "")

SYSTEM_PROMPT = "You are a helpful assistant that answers questions using the provided document context. If the answer isn't in the document, respond politely that you don't have enough information."  # noqa: E501


def ask(question: str, context: str) -> str:
    if not openai.api_key:
        return "OpenAI API key is not configured on the server."

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"Document contents:\n{context}\n\nQuestion: {question}",
        },
    ]
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=messages,
        max_tokens=512,
        temperature=0.7,
    )
    return response.choices[0].message["content"].strip() 