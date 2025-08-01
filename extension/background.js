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

  // Popup requests to highlight text in active tab
  if (type === 'docbot:highlight_text') {
    const { text, color, tabId, anchorId } = message;
    chrome.tabs.sendMessage(tabId, { 
      type: 'docbot:highlight_text', 
      text, 
      color: color || '#fef08a', 
      anchorId, tabId 
    }, () => {});
    return true; // async response
  }

  // Popup requests to scroll to anchor in page
  if (type === 'docbot:scroll_to') {
    const { anchorId, tabId } = message;
    chrome.tabs.sendMessage(tabId, { type: 'docbot:scroll_to', anchorId }, ()=>{});
    return; // no async response needed
  }

  // Proxy explain request (content script cannot fetch http when page is https)
  if (type === 'docbot:explain') {
    const { text, context } = message;
    (async () => {
      try {
        const r = await fetch('http://localhost:8000/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, context }),
        });
        if(!r.ok){
          throw new Error(await r.text());
        }
        const json = await r.json();
        if (sender.tab?.id !== undefined) {
          chrome.tabs.sendMessage(sender.tab.id, {
            type: 'docbot:explain_result',
            explanation: json.explanation,
            selection: text,
          }, ()=>{});
        }
      } catch (err) {
        if (sender.tab && sender.tab.id !== undefined) {
          chrome.tabs.sendMessage(sender.tab.id, {
            type: 'docbot:explain_result',
            explanation: `[Error] ${err.message}`,
            selection: text,
          }, ()=>{});
        }
      }
    })();
    sendResponse(); // keep message channel open but respond immediately
    return true; // indicate async work
  }

  // Legacy get_summary (now just return cached text preview)
  if (type === 'docbot:get_summary') {
    const { tabId } = message;
    const text = tabTextCache.get(tabId) || '';
    const summary = text ? text.slice(0, 500) + (text.length > 500 ? '…' : '') : '';
    sendResponse({ summary, hasText: !!text });
    return;
  }
}); 