"""Utilities for detecting the active document window and extracting its text contents."""
from __future__ import annotations

import os
from typing import Tuple

import pygetwindow as gw

SUPPORTED_EXTENSIONS = {".docx", ".xlsx", ".pdf"}


def _extract_file_path_from_window_title(title: str) -> str | None:
    """Attempt to guess a file path from the window *title*.

    Many Windows applications append the absolute or file name in the title bar, e.g.
    "my_report.docx ‑ Word". We do a heuristic search for supported extensions.
    """
    lowered = title.lower()
    for ext in SUPPORTED_EXTENSIONS:
        if ext in lowered:
            # naive split on separators
            parts = title.split(" - ") + title.split(" – ")  # en dash / hyphen variations
            for p in parts:
                if p.lower().strip().endswith(ext):
                    return p.strip()
    return None


def get_active_document_text() -> Tuple[str, str]:
    """Return (filename, text) for the currently active document.

    Raises FileNotFoundError if the active window does not correspond to a
    supported document, or the file cannot be read.
    """
    active = gw.getActiveWindow()
    if not active:
        raise FileNotFoundError("No active window detected.")

    title = active.title or ""
    file_path = _extract_file_path_from_window_title(title)
    if not file_path or not os.path.exists(file_path):
        raise FileNotFoundError("Could not determine path of active document.")

    ext = os.path.splitext(file_path)[1].lower()
    text: str = ""

    if ext == ".docx":
        from docx import Document  # type: ignore

        doc = Document(file_path)
        text = "\n".join(p.text for p in doc.paragraphs)
    elif ext == ".xlsx":
        import openpyxl  # type: ignore

        wb = openpyxl.load_workbook(file_path, data_only=True)
        for ws in wb.worksheets:
            for row in ws.iter_rows(values_only=True):
                line = " ".join(str(c) for c in row if c is not None)
                text += line + "\n"
    elif ext == ".pdf":
        import pdfplumber  # type: ignore

        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text() or ""
                text += extracted + "\n"
    else:
        raise FileNotFoundError(f"Unsupported extension: {ext}")

    return file_path, text 