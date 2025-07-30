// DocBot Background Service Worker (Manifest V3)

// In-memory store for last extracted document text keyed by tabId
const tabTextCache = new Map();

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type } = message;

  // Content script sent freshly scraped text
  if (type === 'docbot:text_extracted') {
    const { text, tabId: explicitId } = message;
    const tabId = explicitId ?? sender.tab?.id;
    if (tabId) {
      tabTextCache.set(tabId, text);
      console.debug('[DocBot] Stored text for tab', tabId, text.length, 'chars');
    }
    return;
  }

  // Popup requests summary of current tab
  if (type === 'docbot:get_summary') {
    const { tabId, apiKey, provider } = message;
    const text = tabTextCache.get(tabId) || '';

    if (!text) {
      sendResponse({ summary: '', hasText: false });
      return;
    }

    // If no API key, fallback to a naive first-500-chars preview.
    if (!apiKey) {
      const preview = text.slice(0, 500) + (text.length > 500 ? '…' : '');
      sendResponse({ summary: preview, hasText: true });
      return;
    }

    const useGemini = provider === 'gemini' || apiKey.startsWith('gem-');

    if (useGemini) {
      fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: `Summarize the following document in 5 concise bullet points:\n${text.slice(0, 15000)}` }] }
          ]
        }),
      })
        .then(r => r.json())
        .then(json => {
          const summary = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          if (!summary) throw new Error('Gemini summary empty');
          sendResponse({ summary, hasText: true });
        })
        .catch(err => {
          console.error('[DocBot] Gemini summary failed', err);
          const fallback = text.slice(0, 500) + (text.length > 500 ? '…' : '');
          sendResponse({ summary: fallback, hasText: true, error: err.message });
        });

      return true;
    }

    // Otherwise, use OpenAI
    fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Summarize the following document in 5-7 concise bullet points.',
          },
          {
            role: 'user',
            content: text.slice(0, 15000),
          },
        ],
        max_tokens: 256,
        temperature: 0.3,
      }),
    })
      .then(r => r.json())
      .then(json => {
        if (json.error) throw new Error(json.error.message || 'OpenAI error');
        const summary = json.choices?.[0]?.message?.content?.trim() || '';
        sendResponse({ summary, hasText: true });
      })
      .catch(err => {
        console.error('[DocBot] OpenAI summary failed', err);
        const fallback = text.slice(0, 500) + (text.length > 500 ? '…' : '');
        sendResponse({ summary: fallback, hasText: true, error: err.message });
      });

    return true;
  }

  // Popup sends a question for the LLM
  if (type === 'docbot:ask_question') {
    const { question, tabId, apiKey, provider } = message;
    const context = tabTextCache.get(tabId) || '';
    if (!context) {
      sendResponse({ ok: false, error: 'No document text found for this tab. Click "Load Document" first.' });
      return true; // async
    }

    // Decide provider by flag or apiKey prefix
    const useGemini = provider === 'gemini' || apiKey.startsWith('gem-');

    if (useGemini) {
      // Gemini via Google Generative Language API
      fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: `Document:\n${context}\n\nQuestion: ${question}` }] }
          ]
        }),
      })
        .then(r => r.json())
        .then(json => {
          const answer = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (!answer) throw new Error('Gemini response empty');
          sendResponse({ ok: true, answer });
        })
        .catch(err => {
          console.error('[DocBot] Gemini error', err);
          sendResponse({ ok: false, error: err.message });
        });
      return true;
    }

    // Default: OpenAI
    fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are DocBot, an AI assistant that answers questions about a document provided in the context.' },
          { role: 'system', content: `DOCUMENT:\n${context}` },
          { role: 'user', content: question }
        ],
        max_tokens: 512,
        temperature: 0.2,
      }),
    })
      .then(r => r.json())
      .then(json => {
        if (json.error) {
          throw new Error(json.error.message || 'OpenAI API error');
        }
        const answer = json.choices?.[0]?.message?.content || '';
        sendResponse({ ok: true, answer });
      })
      .catch(err => {
        console.error('[DocBot] OpenAI error', err);
        sendResponse({ ok: false, error: err.message });
      });

    return true; // keep message channel open for async sendResponse
  }
}); 