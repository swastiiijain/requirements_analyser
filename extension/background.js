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
    const { text, color, tabId } = message;
    chrome.tabs.sendMessage(tabId, { 
      type: 'docbot:highlight_text', 
      text, 
      color: color || '#fef08a' 
    }, (response) => {
      sendResponse(response);
    });
    return true; // async response
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