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

## Browser Extension (DocBot)

A Manifest V3 Chrome/Edge extension is provided in the `extension/` folder. It contains:

* `manifest.json` – extension metadata and permissions
* `background.js` – service-worker that stores scraped page text and proxies chat queries to OpenAI
* `contentScript.js` – injected into every tab to collect visible text (and PDF text via the browser viewer)
* `popup.html` + `popup.js` – React + Tailwind chat UI that appears when you click the toolbar icon

### Quick start

1. Create an OpenAI API key and keep it handy.
2. In Chrome/Edge, open `chrome://extensions` (or `edge://extensions`), enable *Developer mode* and click *Load unpacked*.
3. Select the `extension/` directory of this repo. The DocBot icon should appear in the toolbar.
4. Navigate to any online document (Google Docs, Word Online, PDFs, etc.) and click the icon.
5. Press **Load Document** to extract the visible text. A short summary will be shown.
6. Paste your OpenAI API key, save it, then start chatting about the document!

No data ever leaves your machine except when you explicitly ask a question – only then do the *document text* and your *question* get sent to the OpenAI API via HTTPS. The extension never touches local files beyond the current page context.
