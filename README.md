# requirements_analyser
DocBot - Intelligent Document Analysis Chatbot

A desktop based AI assistant that reads and analyzes open word, excel or PDF documents in real-time. Designed to help developers and teams quickly extract key information from lengthy requirement documents without manually scanning through them. With just a click, the chatbot integrates with your system, access the open document, and allows you to query it conversationally - saving time and improving focus on development tasks.

Key Features

Supports Word (.docx), Excel(.xlsx) and PDF files
Natural language chatbot interface for querying documents
Highlights key requirements, use cases and action points
Built with python, LLMs, and desktop automation tools

# Secure Document Chatbot

This project provides a local chatbot capable of answering questions about the **currently active Word, Excel, or PDF document** on your Windows machine.

## Quickstart (Backend)

1. **Create & activate a Python virtual environment** (optional but recommended):

   ```powershell
   python -m venv .venv
   .venv\Scripts\activate
   ```

2. **Install dependencies**:

   ```powershell
   pip install -r requirements.txt
   ```

3. **Set environment variables** (at minimum the OpenAI key and JWT secret):

   ```powershell
   setx OPENAI_API_KEY "sk-..."
   setx JWT_SECRET "choose-a-strong-secret"
   ```

4. **Run the backend**:

   ```powershell
   uvicorn backend.main:app --reload
   ```

The API will be available at `http://localhost:8000`. Use the automatically generated docs at `http://localhost:8000/docs` to explore the endpoints during development.

---

Frontend and further instructions will follow.
