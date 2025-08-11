import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { jsPDF } from "jspdf";

// --- added minimalist SVG icons ---
const RobotIcon = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="7" width="16" height="11" rx="2" ry="2" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <path d="M9 17h6M12 2v3" />
  </svg>
);
// Arrow up into tray for upload
const UploadIcon = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="12 15 12 4" />
    <polyline points="8 8 12 4 16 8" />
    <rect x="3" y="15" width="18" height="5" rx="1" ry="1" />
  </svg>
);
const NoteIcon = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 2.25a.75.75 0 00-.75.75v.75h7.5V3a.75.75 0 00-.75-.75h-6z" />
    <path d="M4.5 6h15a.75.75 0 01.75.75v12a2.25 2.25 0 01-2.25 2.25h-12A2.25 2.25 0 014.5 18.75v-12A.75.75 0 014.5 6z" />
    <path d="M5.25 9h13.5M5.25 12.75h13.5M5.25 16.5h13.5" />
  </svg>
);
const ReloadIcon = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 4.5a7.5 7.5 0 0113.054-2.15M19.5 4.5v5h-5" />
    <path d="M19.5 19.5a7.5 7.5 0 01-13.054 2.15M4.5 19.5v-5h5" />
  </svg>
);
// Arrow down from tray for export
const ExportIcon = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="12 9 12 20" />
    <polyline points="16 16 12 20 8 16" />
    <rect x="3" y="4" width="18" height="5" rx="1" ry="1" />
  </svg>
);
const TrashIcon = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 7h12" />
    <path d="M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12" />
    <path d="M9 7V4h6v3" />
  </svg>
);
const CompareIcon = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="8" height="16" rx="1" ry="1" />
    <rect x="14" y="3" width="8" height="16" rx="1" ry="1" />
    <line x1="6" y1="8" x2="6" y2="12" />
    <line x1="18" y1="8" x2="18" y2="12" />
  </svg>
);



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

// Typing indicator for extension popup
function TypingIndicator() {
  return (
    <div className="max-w-[90%] px-3 py-2 rounded shadow text-sm bg-gray-200 text-gray-700">
      <div className="flex items-center space-x-2">
        <span>DocBot is thinking</span>
        <div className="flex space-x-1">
          <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}

function PopupApp() {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [summary, setSummary] = useState("");
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [summaryVisible, setSummaryVisible] = useState(true);
  const [pinnedMap, setPinnedMap] = useState({});
  const [tabId, setTabId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [notes, setNotes] = useState([]);

  const [pageUrl, setPageUrl] = useState("");
  const [currentDocId, setCurrentDocId] = useState("default");
  const endRef = useRef(null);
  const fileInputRef = useRef(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareFile1, setCompareFile1] = useState(null);
  const [compareFile2, setCompareFile2] = useState(null);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [comparisonHistory, setComparisonHistory] = useState([]);

  // helper to reload history with cleaner callback
  const handleReloadHistory = () => {
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
  };

  // Format summary into bullet-points if multiple lines
  const renderSummary = () => {
    if (!summary) return null;
    const parts = summary.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    const cleaned = parts.map(p=>p.replace(/^[*\-•\s]+/, ''));
    if (cleaned.length > 1) {
      const [heading, ...bullets] = cleaned;
      return (
        <div className={`${summaryExpanded ? '' : 'max-h-32 overflow-y-auto'} space-y-2`}>
          <p className="text-sm text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{__html: heading}}></p>
          <ul className="list-disc pl-4 text-sm text-gray-700 leading-relaxed space-y-1">
            {bullets.map((p, i) => (
              <li key={i} dangerouslySetInnerHTML={{__html:p}}></li>
            ))}
          </ul>
        </div>
      );
    }
    return (
      <p className={`text-sm text-gray-700 leading-relaxed whitespace-pre-wrap ${summaryExpanded ? '' : 'max-h-32 overflow-y-auto'}`}>{summary}</p>
    );
  };
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

  // Load comparison history on mount
  useEffect(() => {
    // Try chrome.storage first, then fallback to localStorage
    chrome.storage.local.get(['docbot_comparison_history'], (result) => {
      if (result.docbot_comparison_history && result.docbot_comparison_history.length > 0) {
        setComparisonHistory(result.docbot_comparison_history);
      } else {
        // Fallback to localStorage
        const savedHistory = localStorage.getItem('docbot_comparison_history');
        if (savedHistory) {
          try {
            const history = JSON.parse(savedHistory);
            setComparisonHistory(history);
            // Migrate to chrome.storage
            if (history.length > 0) {
              chrome.storage.local.set({ 'docbot_comparison_history': history });
            }
          } catch (e) {
            console.error('Failed to load comparison history:', e);
          }
        }
      }
    });
  }, []);

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
    doc.text(`DocBot Session - ${new Date().toLocaleString()}`, 40, y);
    y += 30;
    
    // Include summary if available
    if (summary) {
      doc.setFontSize(10);
      doc.text('SUMMARY:', 40, y);
      y += 15;
      const summaryLines = doc.splitTextToSize(summary, 500);
      doc.text(summaryLines, 40, y);
      y += summaryLines.length * 12 + 20;
      
      // Add separator
      doc.text('CHAT HISTORY:', 40, y);
      y += 20;
      doc.setFontSize(12);
    }
    
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

  const handleCompareDocuments = async () => {
    if (!compareFile1 || !compareFile2) {
      alert('Please select both documents to compare');
      return;
    }

    setLoadingCompare(true);
    try {
      // Create new File objects to avoid file lock issues
      const file1Buffer = await compareFile1.arrayBuffer();
      const file2Buffer = await compareFile2.arrayBuffer();
      
      const newFile1 = new File([file1Buffer], compareFile1.name, { 
        type: compareFile1.type,
        lastModified: Date.now()
      });
      const newFile2 = new File([file2Buffer], compareFile2.name, { 
        type: compareFile2.type,
        lastModified: Date.now()
      });

      const formData = new FormData();
      formData.append('document1', newFile1);
      formData.append('document2', newFile2);

      const response = await fetch('http://localhost:8000/compare', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to compare documents');
      }

      const result = await response.json();
      
      // Open comparison in new tab
      const comparisonData = {
        summary: result.comparison_summary,
        document1: {
          name: compareFile1.name,
          content: result.document1_content
        },
        document2: {
          name: compareFile2.name,
          content: result.document2_content
        },
        changes: result.changes || []
      };

      // Store comparison data in chrome.storage with a unique key
      const comparisonId = 'comparison_' + Date.now();
      const storageData = {
        [comparisonId]: comparisonData,
        [`${comparisonId}_metadata`]: {
          created: Date.now(),
          file1Name: compareFile1.name,
          file2Name: compareFile2.name,
          summary: result.comparison_summary.substring(0, 100) + '...'
        }
      };
      
      chrome.storage.local.set(storageData, () => {
        // Add to comparison history
        const historyItem = {
          id: comparisonId,
          timestamp: new Date().toLocaleString(),
          file1Name: compareFile1.name,
          file2Name: compareFile2.name,
          summary: result.comparison_summary.substring(0, 100) + '...'
        };
        
        const updatedHistory = [historyItem, ...comparisonHistory.slice(0, 9)]; // Keep last 10
        setComparisonHistory(updatedHistory);
        localStorage.setItem('docbot_comparison_history', JSON.stringify(updatedHistory));
        
        // Also store in chrome.storage for better persistence
        chrome.storage.local.set({ 'docbot_comparison_history': updatedHistory });
        
        // Create comparison tab with just the ID
        chrome.tabs.create({
          url: `chrome-extension://${chrome.runtime.id}/comparison.html?id=${comparisonId}`
        });
      });

      // Reset modal
      setShowCompareModal(false);
      setCompareFile1(null);
      setCompareFile2(null);
    } catch (error) {
      console.error('Compare error:', error);
      let errorMessage = 'Failed to compare documents.\n\n';
      
      if (error.message.includes('file is in use') || error.message.includes('file that\'s open') || error.name === 'NotAllowedError') {
        errorMessage += '📁 File Access Issue:\n';
        errorMessage += '• Close the files in Word, Excel, or any other program\n';
        errorMessage += '• Try renaming the files with different names\n';
        errorMessage += '• Copy the files to your Desktop and try again\n';
        errorMessage += '• Make sure the files are not read-only\n\n';
        errorMessage += '💡 Alternative: Try exporting/saving the files as PDF first, then compare the PDFs.';
      } else if (error.message.includes('permission') || error.message.includes('access')) {
        errorMessage += 'Permission denied. Please check file permissions and try again.';
      } else if (error.message.includes('Unsupported file type')) {
        errorMessage += error.message;
      } else if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
        errorMessage += 'Network error. Please ensure the backend server is running on http://localhost:8000';
      } else {
        errorMessage += error.message;
      }
      
      alert(errorMessage);
    } finally {
      setLoadingCompare(false);
    }
  };

  const reopenComparison = (historyItem) => {
    console.log('Reopening comparison:', historyItem.id);
    
    // Check if comparison data still exists in chrome.storage
    chrome.storage.local.get([historyItem.id, `${historyItem.id}_metadata`], (result) => {
      console.log('Storage result:', result);
      
      if (result[historyItem.id]) {
        // Data exists, open comparison tab
        console.log('Opening comparison tab');
        chrome.tabs.create({
          url: `chrome-extension://${chrome.runtime.id}/comparison.html?id=${historyItem.id}`
        });
      } else {
        // Data expired, show message
        console.log('Comparison data not found');
        alert(`This comparison (${historyItem.file1Name} vs ${historyItem.file2Name}) is no longer available. Please run a new comparison.`);
        
        // Remove from history
        const updatedHistory = comparisonHistory.filter(item => item.id !== historyItem.id);
        setComparisonHistory(updatedHistory);
        localStorage.setItem('docbot_comparison_history', JSON.stringify(updatedHistory));
        chrome.storage.local.set({ 'docbot_comparison_history': updatedHistory });
      }
    });
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
        <div className="flex items-center mb-2">
          <RobotIcon className="w-6 h-6 text-purple-600 mr-2" />
          <h1 className="font-semibold text-lg text-gray-800">DocBot</h1>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {/* Summarise remains a text button for clarity */}
          <button onClick={summarisePage} className="col-span-2 bg-purple-600 text-white px-2 py-1 rounded text-xs font-medium text-center">
            Summarise
          </button>

          {/* Upload PDF */}
          <button onClick={openFileDialog} className="group bg-indigo-600 text-white flex items-center justify-center px-2 py-2 rounded text-xs font-medium">
            <UploadIcon className="w-5 h-5" />
            <span className="hidden group-hover:inline ml-1">Upload</span>
          </button>

          {/* Compare Documents */}
          <button onClick={() => setShowCompareModal(true)} className="group bg-orange-600 text-white flex items-center justify-center px-2 py-2 rounded text-xs font-medium relative overflow-hidden">
            <CompareIcon className="w-5 h-5 group-hover:hidden" />
            <span className="hidden group-hover:block text-center whitespace-nowrap">Compare</span>
          </button>

          {/* Notes toggle */}
          <button onClick={() => {
            chrome.windows.create({
              url: `chrome-extension://${chrome.runtime.id}/notes.html?docId=${currentDocId}`,
              type: 'popup',
              width: 400,
              height: 600,
            });
          }} className="group bg-emerald-600 text-white flex items-center justify-center px-2 py-2 rounded text-xs font-medium">
            <NoteIcon className="w-5 h-5" />
            <span className="hidden group-hover:inline ml-1">Notes</span>
          </button>

          {/* Reload History */}
          <button onClick={handleReloadHistory} className="group bg-sky-600 text-white flex items-center justify-center px-2 py-2 rounded text-xs font-medium">
            <ReloadIcon className="w-5 h-5" />
            <span className="hidden group-hover:inline ml-1">Reload</span>
          </button>

          {/* Export Chat */}
          <button onClick={exportChatPDF} className="group bg-gray-700 text-white flex items-center justify-center px-2 py-2 rounded text-xs font-medium">
            <ExportIcon className="w-5 h-5" />
            <span className="hidden group-hover:inline ml-1">Export</span>
          </button>
        </div>

        <div className="mt-1">
          <button onClick={() => setShowDelete(true)} className="group bg-red-600 text-white flex items-center justify-center px-2 py-2 rounded text-xs font-medium w-full">
            <TrashIcon className="w-5 h-5" />
            <span className="hidden group-hover:inline ml-1">Clear History</span>
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        {summary && summaryVisible && (
          <div className={`mt-3 p-3 bg-gray-50 rounded-lg border relative ${summaryExpanded?'' :'pb-6'}`}>
            {/* Close button */}
            <button
              onClick={() => setSummaryVisible(false)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
              title="Close summary"
            >
              ✕
            </button>
            {/* Expand/collapse button */}
            <button
              onClick={() => setSummaryExpanded(!summaryExpanded)}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-gray-600 hover:text-gray-800 text-lg leading-none"
              title={summaryExpanded ? 'Collapse' : 'Expand'}
            >
              {summaryExpanded ? '▴' : '▾'}
            </button>
            {renderSummary()}
          </div>
        )}
        
        {/* Restore summary button when hidden */}
        {summary && !summaryVisible && (
          <div className="mt-2 flex justify-center">
            <button
              onClick={() => setSummaryVisible(true)}
              className="group bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1 rounded-full text-xs flex items-center gap-1"
              title="Show summary"
            >
              📄 <span className="hidden group-hover:inline">Summary</span>
            </button>
          </div>
        )}
        
        {/* suggestions now rendered near input */}
      </div>
      
      {/* Notes Panel */}
      {/* Removed Notes Panel as it's now an external window */}
      <div className="flex-1 overflow-y-auto my-2 flex flex-col space-y-1">
        {messages.map((m, i) => (
          <ChatMessage key={i} sender={m.sender} text={m.text} onPin={togglePin} pinned={!!pinnedMap[m.text]} anchorId={m.anchorId} tabId={tabId} />
        ))}
        {loadingChat && <TypingIndicator />}
        <div ref={endRef} />
      </div>

      {/* Compact Auto-suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-2">
          <div className="flex flex-wrap gap-1 py-1">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => askSuggestedQuestion(s)}
                className="group relative text-[11px] bg-blue-50 hover:bg-blue-100 border px-2 py-1 rounded text-blue-700 max-w-[120px] truncate"
                title={s}>
                {s.length > 20 ? s.slice(0, 20) + '...' : s}
                {/* Hover tooltip */}
                <div className="absolute bottom-full left-0 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-normal max-w-xs">
                  {s}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

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

      {/* Compare Documents Modal */}
      {showCompareModal && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow-lg w-96 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Compare Documents</h3>
              <button onClick={() => setShowCompareModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            
            <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
              <p><strong>How to use:</strong></p>
              <p>• Upload two versions of the same document (PDF, Word, or text files)</p>
              <p>• The system will compare them and show changes side-by-side</p>
              <p>• Changes will be highlighted and summarized</p>
            </div>
            
            <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-800">
              <p><strong>⚠️ Important:</strong></p>
              <p>• Close files in Word/Excel before uploading</p>
              <p>• If you get "file in use" errors, copy files to Desktop first</p>
              <p>• PDF files work best for comparison</p>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document 1 (Original Version)</label>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.doc"
                  onChange={(e) => setCompareFile1(e.target.files[0])}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Supported: PDF, Word (.docx, .doc), Text (.txt)</p>
                {compareFile1 && <p className="text-xs text-green-600 mt-1">✓ {compareFile1.name}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document 2 (Updated Version)</label>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.doc"
                  onChange={(e) => setCompareFile2(e.target.files[0])}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Supported: PDF, Word (.docx, .doc), Text (.txt)</p>
                {compareFile2 && <p className="text-xs text-green-600 mt-1">✓ {compareFile2.name}</p>}
              </div>
            </div>
            
            {/* Comparison History - Always show when modal is open */}
            <div className="border-t pt-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Recent Comparisons {comparisonHistory.length > 0 && `(${comparisonHistory.length})`}
              </h4>
              {comparisonHistory.length === 0 ? (
                <p className="text-gray-500 text-xs py-2">No comparison history yet. Your comparisons will appear here.</p>
              ) : (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {comparisonHistory.map((item, index) => (
                    <div 
                      key={item.id}
                      onClick={() => reopenComparison(item)}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">
                          {item.file1Name} ↔ {item.file2Name}
                        </p>
                        <p className="text-gray-500 text-xs">{item.timestamp}</p>
                      </div>
                      <div className="ml-2 text-blue-600 hover:text-blue-800">
                        📄
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2 pt-2">
              <button 
                onClick={() => setShowCompareModal(false)} 
                className="px-3 py-1 bg-gray-300 text-gray-800 text-sm rounded"
              >
                Cancel
              </button>
              <button 
                onClick={handleCompareDocuments}
                disabled={!compareFile1 || !compareFile2 || loadingCompare}
                className="px-3 py-1 bg-orange-600 text-white text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingCompare ? 'Comparing...' : 'Compare'}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

ReactDOM.render(<PopupApp />, document.getElementById("root")); 