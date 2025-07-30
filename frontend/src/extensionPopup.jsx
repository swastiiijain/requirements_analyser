import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import "./index.css";

function ChatMessage({ sender, text, onPin }) {
  let base = "max-w-[90%] px-3 py-2 rounded shadow text-sm whitespace-pre-wrap relative group";
  if (sender === "user") base += " bg-blue-600 text-white self-end";
  else if (sender === "bot") base += " bg-green-600 text-white";
  else base += " bg-gray-300 text-gray-800";
  
  return (
    <div className={base}>
      {text}
      {sender === "bot" && onPin && (
        <button
          onClick={() => onPin(text)}
          className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 rounded-full w-6 h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          title="Pin to notes"
        >
          📌
        </button>
      )}
    </div>
  );
}

function PopupApp() {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [summary, setSummary] = useState("");
  const [tabId, setTabId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [showNotes, setShowNotes] = useState(false);
  const [currentDocId, setCurrentDocId] = useState("default");
  const endRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Get active tab and summary on mount
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs?.length) return;
      const id = tabs[0].id;
      setTabId(id);
      // no summary on mount
    });
    fetchNotes(); // Load existing notes
  }, []);

  // Refresh notes when document changes
  useEffect(() => {
    fetchNotes(currentDocId);
  }, [currentDocId]);

  const summarisePage = () => {
     if (!tabId) {
      console.warn('DocBot: No tabId');
      return;
    }
    console.log('DocBot: Sending message to content script');
    chrome.tabs.sendMessage(tabId, { type: "docbot:request_text" }, () => {
      if (chrome.runtime.lastError) {
        console.warn('DocBot: content-script message failed', chrome.runtime.lastError.message);
        // Fallback: directly execute script to grab visible text
        chrome.scripting.executeScript(
          {
            target: { tabId },
            world: "MAIN",
            func: () => {
              const MAX = 100_000;
              const txt = document.body?.innerText || "";
              return txt.length > MAX ? txt.slice(0, MAX) : txt;
            },
          },
          (res) => {
            if (chrome.runtime.lastError || !res?.length) {
              console.error('DocBot: executeScript failed', chrome.runtime.lastError);
              // Try requesting host permission for this origin
              try {
                const origin = new URL(window.location.href).origin + "/*";
                chrome.permissions.request({ origins: [origin] }, (granted) => {
                  if (granted) {
                    console.log('DocBot: host permission granted, retrying');
                    // Retry after permission granted
                    summarisePage();
                  } else {
                    alert("Permission denied. Cannot read this page.");
                  }
                });
              } catch {
                alert("This page blocks access. Try another page.");
              }
              return;
            }
            console.log('DocBot: executeScript returned text length', res[0]?.result?.length);
            const text = res[0].result;
            chrome.runtime.sendMessage({ type: "docbot:text_extracted", text, tabId });
            fetch('http://localhost:8000/summarise', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text }),
            })
              .then((r) => r.json())
              .then((json) => {
                setSummary(json.summary);
                if (json.document_id) {
                  setCurrentDocId(json.document_id);
                }
                fetchAutoSuggestions();
              })
              .catch((err) => alert('Summarise failed: ' + err.message));
          }
        );
      } else {
        console.log('DocBot: content-script responded ok');
        chrome.scripting.executeScript(
          {
            target: { tabId },
            world: "MAIN",
            func: () => {
              const MAX = 100_000;
              const txt = document.body?.innerText || "";
              return txt.length > MAX ? txt.slice(0, MAX) : txt;
            },
          },
          (res) => {
            if (res?.length) {
              const text = res[0].result;
              chrome.runtime.sendMessage({ type: "docbot:text_extracted", text, tabId });
              fetch('http://localhost:8000/summarise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
              })
                .then((r) => r.json())
                .then((json) => {
                  setSummary(json.summary);
                  if (json.document_id) {
                    setCurrentDocId(json.document_id);
                  }
                  fetchAutoSuggestions();
                })
                .catch((err) => alert('Summarise failed: ' + err.message));
            }
          }
        );
      }
    });
  };

  const handleAsk = (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    const q = question.trim();
    setQuestion("");
    setMessages((m) => [...m, { sender: "user", text: q }]);
    fetch('http://localhost:8000/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, document_id: currentDocId }),
    })
      .then((r) => r.json())
      .then((json) => {
        setMessages((m) => [...m, { sender: 'bot', text: json.answer }]);
        fetchAutoSuggestions(); // Refresh suggestions after each answer
      })
      .catch((err) => setMessages((m) => [...m, { sender: 'system', text: `Error: ${err.message}` }]));
  };

  const uploadFile = (file) => {
     if (!file.name.toLowerCase().endsWith('.pdf')) {
       alert('Only PDF files are supported');
       return;
     }

    setCurrentDocId(file.name.replace(/[^a-zA-Z0-9]/g, '_'));
    const formData = new FormData();
    formData.append('file', file);

    fetch('http://localhost:8000/upload', {
      method: 'POST',
      body: formData,
    })
      .then((r) => r.json())
      .then((json) => {
        setSummary(json.summary);
        fetchAutoSuggestions();
      })
      .catch((err) => alert('Upload failed: ' + err.message));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const fetchAutoSuggestions = () => {
    fetch(`http://localhost:8000/auto-suggestions?document_id=${currentDocId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((r) => r.json())
      .then((json) => setSuggestions(json.suggestions))
      .catch(() => setSuggestions([]));
  };

  const saveNote = (content, topic = "") => {
     fetch('http://localhost:8000/notes', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         content,
         document_id: currentDocId,
         topic
       }),
     })
       .then(() => fetchNotes(currentDocId))
       .catch((err) => console.error('Note save failed:', err));
   };

  const fetchNotes = (docId = currentDocId) => {
    fetch(`http://localhost:8000/notes?document_id=${docId}`)
      .then((r) => r.json())
      .then((json) => setNotes(json.notes))
      .catch(() => setNotes([]));
  };

  const askSuggestedQuestion = (suggestedQ) => {
    setQuestion(suggestedQ);
    handleAsk({ preventDefault: () => {}, target: { question: { value: suggestedQ } } });
  };

  const pinResponseAsNote = (responseText) => {
    saveNote(responseText, "Chat Response");
  };

  return (
    <div 
      className="flex flex-col h-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-purple-100 bg-opacity-90 flex items-center justify-center z-50 border-2 border-dashed border-purple-400 rounded">
          <p className="text-purple-700 text-lg font-medium">Drop PDF here to summarise</p>
        </div>
      )}
      
      <div className="pb-2 border-b border-gray-300">
        <h1 className="font-semibold text-xl text-gray-800 mb-3">DocBot</h1>
        <div className="grid grid-cols-3 gap-1">
          <button onClick={summarisePage} className="bg-purple-600 text-white px-3 py-1 rounded text-xs font-medium">
            Summarise Page
          </button>
          <button onClick={openFileDialog} className="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-medium">
            Upload PDF
          </button>
          <button onClick={() => setShowNotes(!showNotes)} className="bg-emerald-600 text-white px-3 py-1 rounded text-xs font-medium">
            {showNotes ? 'Hide' : 'Notes'}
          </button>
          <button onClick={() => setSummary("")} className="bg-gray-400 text-white px-3 py-1 rounded text-xs col-span-3">Clear</button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        {summary && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">{summary}</p>
          </div>
        )}
        
        {/* Auto-suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-gray-600 mb-2">💡 Suggested questions:</p>
            <div className="space-y-1">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => askSuggestedQuestion(suggestion)}
                  className="block w-full text-left text-xs bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded border text-blue-700"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Notes Panel */}
      {showNotes && (
        <div className="border-b border-gray-300 pb-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-sm text-gray-800">📝 Vestige Notes</h3>
            <button onClick={fetchNotes} className="text-xs text-gray-500 hover:text-gray-700">Refresh</button>
          </div>
          <div className="max-h-24 overflow-y-auto space-y-1">
            {notes.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No notes yet. Pin responses to save them!</p>
            ) : (
              notes.slice(-5).map((note) => (
                <div key={note.note_id} className="bg-yellow-50 border-l-2 border-yellow-400 px-2 py-1 text-xs">
                  <div className="font-medium text-yellow-800">{note.topic}</div>
                  <div className="text-gray-700 truncate">{note.content}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto my-2 flex flex-col space-y-1">
        {messages.map((m, i) => (
          <ChatMessage key={i} sender={m.sender} text={m.text} onPin={pinResponseAsNote} />
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleAsk} className="flex space-x-1">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about the document…"
          className="flex-1 border rounded px-2 py-1 text-sm"
        />
        <button className="bg-green-600 text-white px-3 rounded text-sm">Send</button>
      </form>

      {/* API key and provider removed */}
    </div>
  );
}

ReactDOM.render(<PopupApp />, document.getElementById("root")); 