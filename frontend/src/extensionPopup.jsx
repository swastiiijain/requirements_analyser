import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { jsPDF } from "jspdf";

// --- per-page helpers ---
const makePageKey = (url) => (url || '').replace(/[#?].*$/, '');
const getDocIdForPage = (url) => localStorage.getItem(`docbot_page_${makePageKey(url)}`) || "default";
const setDocIdForPage = (url, id) => localStorage.setItem(`docbot_page_${makePageKey(url)}`, id);

const saveSessionToStorage = (docId, data) => {
  localStorage.setItem(`docbot_session_${docId}`, JSON.stringify(data));
};

const loadSessionFromStorage = (docId) => {
  try {
    return JSON.parse(localStorage.getItem(`docbot_session_${docId}`) || "null");
  } catch {
    return null;
  }
};

// Debounce saving session to avoid excessive writes
let saveTimer;

function ChatMessage({ sender, text, onPin, pinned, anchorId, tabId }) {
  let base = "max-w-[90%] px-3 py-2 rounded shadow text-sm whitespace-pre-wrap relative group";
  if (sender === "user") base += " bg-blue-600 text-white self-end";
  else if (sender === "bot") base += " bg-green-600 text-white";
  else base += " bg-gray-300 text-gray-800";

  const [hover, setHover] = useState(false);
  return (
    <div
      className={base}
      onMouseEnter={() => {
        setHover(true);
        if (sender === 'bot' && anchorId && tabId) {
          chrome.runtime.sendMessage({ type: 'docbot:scroll_to', anchorId, tabId });
        }
      }}
      onMouseLeave={() => setHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        if (sender === 'bot' && onPin) {
          // Allow pin click handling to run separately
        }
      }}
      style={{ opacity: hover ? 0.8 : 1 }}
    >
      {text}
      {sender === "bot" && onPin && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPin(text);
          }}
          className={`absolute -top-2 -right-2 rounded-full w-6 h-6 text-xs transition-opacity ${pinned ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-200 text-gray-600 opacity-0 group-hover:opacity-100'}`}
          title={pinned ? "Pinned" : "Pin to notes"}
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
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [pinnedMap, setPinnedMap] = useState({});
  const [tabId, setTabId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [showNotes, setShowNotes] = useState(false);
  const [pageUrl, setPageUrl] = useState("");
  const [currentDocId, setCurrentDocId] = useState("default");
  const endRef = useRef(null);
  const fileInputRef = useRef(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  const LoaderOverlay = () => (
    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-500 border-t-transparent"></div>
    </div>
  );

  // Auto-save on changes
  useEffect(() => {
    if (!currentDocId) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveSessionToStorage(currentDocId, { summary, messages, pinned: pinnedMap });
    }, 400);
  }, [summary, messages, pinnedMap, currentDocId]);

  // Pin / unpin toggle
  const togglePin = (text) => {
    const already = pinnedMap[text];
    const newMap = { ...pinnedMap };
    if (already) {
      delete newMap[text];
      // Delete note on backend
      const noteEntry = notes.find(n => n.content === text);
      if (noteEntry) {
        fetch(`http://localhost:8000/notes/${noteEntry.note_id}`, { method: 'DELETE' })
          .then(() => fetchNotes(currentDocId))
          .catch(()=>{});
      }
    } else {
      newMap[text] = true;
      saveNote(text, "Pinned");
    }
    setPinnedMap(newMap);
    saveSessionToStorage(currentDocId, { summary, messages, pinned: newMap });
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Get active tab url and initialise doc id / notes
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs?.length) return;
      const tab = tabs[0];
      setTabId(tab.id);
      setPageUrl(tab.url);

      const storedId = getDocIdForPage(tab.url);
      setCurrentDocId(storedId);

      // Load session for this page
      const sess = loadSessionFromStorage(storedId);
      if (sess) {
        setMessages(sess.messages || []);
        setSummary(sess.summary || "");
        setPinnedMap(sess.pinned || {});
      } else {
        setMessages([]);
        setSummary("");
        setPinnedMap({});
      }

      fetchNotes(storedId);
    });
  }, []);

  // Refresh notes when document changes
  useEffect(() => {
    fetchNotes(currentDocId);
    // Load session from storage
    const sess = loadSessionFromStorage(currentDocId);
    if (sess) {
      setMessages(sess.messages || []);
      setSummary(sess.summary || "");
      setPinnedMap(sess.pinned || {});
    } else {
      setMessages([]);
      setSummary("");
      setPinnedMap({});
    }
  }, [currentDocId]);

  // Modify summarisePage loading behaviour
  const summarisePage = () => {
    if (loadingSummary) return;
    setLoadingSummary(true);
    if (!tabId) {
      console.warn('DocBot: No tabId');
      return;
    }
    console.log('DocBot: Sending message to content script');
    chrome.tabs.sendMessage(tabId, { type: "docbot:request_text" }, (response) => {
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
                if (json.document_id && pageUrl) {
                  setCurrentDocId(json.document_id);
                  setDocIdForPage(pageUrl, json.document_id);
                  saveSessionToStorage(json.document_id, { summary: json.summary, messages, pinned: pinnedMap });
                }
                fetchAutoSuggestions(json.document_id || currentDocId);
              })
              .catch((err) => alert('Summarise failed: ' + err.message))
              .finally(() => setLoadingSummary(false));
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
                  if (json.document_id && pageUrl) {
                    setCurrentDocId(json.document_id);
                    setDocIdForPage(pageUrl, json.document_id);
                    saveSessionToStorage(json.document_id, { summary: json.summary, messages, pinned: pinnedMap });
                  }
                  fetchAutoSuggestions(json.document_id || currentDocId);
                })
                .catch((err) => alert('Summarise failed: ' + err.message))
                .finally(() => setLoadingSummary(false));
            }
          }
        );
      }
    });
  };

  // during chat ask
  const handleAsk = (e) => {
    e.preventDefault();
    if (loadingChat) return;
    if (!question.trim()) return;
    const q = question.trim();
    setQuestion("");
    setMessages((m) => [...m, { sender: "user", text: q }]);
    setLoadingChat(true);
    fetch('http://localhost:8000/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, document_id: currentDocId }),
    })
      .then((r) => r.json())
      .then((json) => {
        const firstSentence = json.answer.split(/[.?!]/)[0].slice(0, 120);
        const anchorId = `docbot-${Date.now()}`;
        setMessages((m) => [...m, { sender: 'bot', text: json.answer, anchorId, src: firstSentence }]);
        fetchAutoSuggestions(currentDocId);
        // highlight
        if (firstSentence.length > 10 && tabId) {
          chrome.runtime.sendMessage({ type: 'docbot:highlight_text', text: firstSentence, color: '#fef3c7', anchorId, tabId });
        }
      })
      .catch((err) => setMessages((m) => [...m, { sender: 'system', text: `Error: ${err.message}` }]))
      .finally(() => setLoadingChat(false));
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
        if (json.document_id && pageUrl) {
          setCurrentDocId(json.document_id);
          setDocIdForPage(pageUrl, json.document_id);
          saveSessionToStorage(json.document_id, { summary: json.summary, messages, pinned: pinnedMap });
        }
        fetchAutoSuggestions(json.document_id || currentDocId);
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

  const fetchAutoSuggestions = (docId) => {
    fetch(`http://localhost:8000/auto-suggestions?document_id=${docId}`, {
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
    if (!docId) return;
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

  const deleteHistory = () => {
    setLoadingDelete(true);
    setTimeout(() => {
      localStorage.removeItem(`docbot_session_${currentDocId}`);
      setMessages([]);
      setSummary("");
      setPinnedMap({});
      setShowDelete(false);
      setLoadingDelete(false);
    }, 300);
  };

  const exportChatPDF = () => {
    const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    let y = 40;
    doc.setFontSize(12);
    doc.text(`Chat Session - ${new Date().toLocaleString()}`, 40, y);
    y += 20;
    messages.forEach(({ sender, text }) => {
      const lines = doc.splitTextToSize(`${sender.toUpperCase()}: ${text}`, 500);
      doc.text(lines, 40, y);
      y += lines.length * 14 + 10;
      if (y > 780) {
        doc.addPage();
        y = 40;
      }
    });
    doc.save('docbot_chat.pdf');
  };

  const exportNotesPDF = () => {
    if (notes.length === 0) { alert('No notes'); return; }
    const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    let y = 40;
    doc.setFontSize(12);
    doc.text(`Doc Notes - ${new Date().toLocaleString()}`, 40, y);
    y += 20;
    notes.forEach((n, idx) => {
      const lines = doc.splitTextToSize(`${idx + 1}. ${n.content}`, 500);
      doc.text(lines, 40, y);
      y += lines.length * 14 + 10;
      if (y > 780) { doc.addPage(); y = 40; }
    });
    doc.save('docbot_notes.pdf');
  };

  return (
    <div 
      className="flex flex-col h-full p-3 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {(loadingSummary || loadingHistory || loadingDelete) && <LoaderOverlay />}
      {isDragging && (
        <div className="absolute inset-0 bg-purple-100 bg-opacity-90 flex items-center justify-center z-50 border-2 border-dashed border-purple-400 rounded">
          <p className="text-purple-700 text-lg font-medium">Drop PDF here to summarise</p>
        </div>
      )}
      
      <div className="pb-2 border-b border-gray-300">
        <h1 className="font-semibold text-xl text-gray-800 mb-3">DocBot</h1>
        <div className="grid grid-cols-5 gap-1">
          <button onClick={summarisePage} className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-medium w-full text-center">
            Summarise Page
          </button>
          <button onClick={openFileDialog} className="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-medium">
            Upload PDF
          </button>
          <button onClick={() => setShowNotes(!showNotes)} className="bg-emerald-600 text-white px-3 py-1 rounded text-xs font-medium">
            {showNotes ? 'Hide' : 'Notes'}
          </button>
          <button onClick={() => {
            const sess = loadSessionFromStorage(getDocIdForPage(pageUrl));
            setLoadingHistory(true);
            setTimeout(() => {
              if (sess) {
                setMessages(sess.messages || []);
                setSummary(sess.summary || "");
                setPinnedMap(sess.pinned || {});
              } else {
                alert('No stored history for this page');
              }
              setLoadingHistory(false);
            }, 200);
          }} className="bg-sky-600 text-white px-3 py-1 rounded text-xs font-medium">
            Reload History
          </button>
          <button onClick={exportChatPDF} className="bg-gray-700 text-white px-3 py-1 rounded text-xs font-medium">Export Chat</button>
        </div>
        <div className="mt-1">
          <button onClick={() => setShowDelete(true)} className="bg-red-600 text-white px-3 py-1 rounded text-xs font-medium w-full">Clear History</button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        {summary && (
          <div className={`mt-3 p-3 bg-gray-50 rounded-lg border relative ${summaryExpanded?'' :'pb-6'}`}>
            <button
              onClick={() => setSummaryExpanded(!summaryExpanded)}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-gray-600 hover:text-gray-800 text-lg leading-none"
              title={summaryExpanded ? 'Collapse' : 'Expand'}
            >
              {summaryExpanded ? '▴' : '▾'}
            </button>
            <p className={`text-sm text-gray-700 leading-relaxed whitespace-pre-wrap ${summaryExpanded ? '' : 'max-h-32 overflow-y-auto'}`}>{summary}</p>
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
            <h3 className="font-medium text-sm text-gray-800">📝 Document Notes</h3>
            <div className="space-x-1">
              <button onClick={() => fetchNotes(currentDocId)} className="text-xs bg-gray-200 text-gray-700 px-2 py-[2px] rounded">Refresh</button>
              <button onClick={exportNotesPDF} className="text-xs bg-blue-200 text-blue-800 px-2 py-[2px] rounded">Export</button>
            </div>
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
          <ChatMessage key={i} sender={m.sender} text={m.text} onPin={togglePin} pinned={!!pinnedMap[m.text]} anchorId={m.anchorId} tabId={tabId} />
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
      {/* Delete history modal */}
      {showDelete && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow-md w-64 text-center space-y-3">
            <p className="text-sm text-gray-800">Are you sure you want to delete history?</p>
            <div className="flex justify-center space-x-4">
              <button onClick={deleteHistory} className="px-3 py-1 bg-red-600 text-white text-xs rounded">Yes</button>
              <button onClick={() => setShowDelete(false)} className="px-3 py-1 bg-gray-300 text-gray-800 text-xs rounded">No</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.render(<PopupApp />, document.getElementById("root")); 