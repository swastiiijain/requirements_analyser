import React, { useState } from 'react';
import ChatMessage, { TypingIndicator } from '../components/ChatMessage';

function Chat({ token, onLogout }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const readDocument = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/read-doc', {
        method: 'POST',
        headers,
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = await res.json();
      setCurrentFile(data.filename);
      setMessages((msgs) => [
        ...msgs,
        { sender: 'system', text: `Document "${data.filename}" loaded (${data.characters} chars).` },
      ]);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const ask = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    const q = question.trim();
    setQuestion('');
    setMessages((msgs) => [...msgs, { sender: 'user', text: q }]);
    setIsTyping(true);
    try {
      const res = await fetch('http://localhost:8000/ask', {
        method: 'POST',
        headers,
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = await res.json();
      setMessages((msgs) => [...msgs, { sender: 'bot', text: data.answer }]);
    } catch (err) {
      setMessages((msgs) => [...msgs, { sender: 'system', text: `Error: ${err.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center justify-between bg-blue-600 text-white p-4">
        <h1 className="text-xl font-semibold">Secure Document Chatbot</h1>
        <div className="flex items-center space-x-2">
          {currentFile && (
            <span className="hidden sm:block text-sm truncate max-w-xs">
              File: <strong>{currentFile}</strong>
            </span>
          )}
          <button
            onClick={readDocument}
            className="bg-white text-blue-600 px-3 py-1 rounded"
          >
            {loading ? 'Reading...' : 'Read Active Document'}
          </button>
          <button onClick={onLogout} className="bg-red-600 px-3 py-1 rounded">
            Logout
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-100">
        {messages.map((m, idx) => (
          <ChatMessage key={idx} sender={m.sender} text={m.text} />
        ))}
        {isTyping && <TypingIndicator />}
      </div>
      <form onSubmit={ask} className="p-4 bg-white flex">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="flex-1 rounded border-gray-300 mr-2"
          placeholder="Ask something about the document..."
        />
        <button className="bg-blue-600 text-white px-4 rounded">Send</button>
      </form>
    </div>
  );
}

export default Chat; 