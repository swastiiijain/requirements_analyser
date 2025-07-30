// DocBot Content Script

// Helper: extract visible text from current page
function extractVisibleText() {
  let text = '';
  // For most pages we can use innerText of body
  if (document.body) {
    text = document.body.innerText || '';
  }
  // Trim excessively long text to 100k chars to stay within quota
  const MAX = 100_000;
  return text.length > MAX ? text.slice(0, MAX) : text;
}

// Respond to messages from the popup asking for page text
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'docbot:request_text') {
    const text = extractVisibleText();
    sendResponse({ text });
    // Also proactively send to background to cache
    chrome.runtime.sendMessage({ type: 'docbot:text_extracted', text });
    return true; // keep channel open (response sent synchronously though)
  }
});

// Optionally, auto-send text shortly after page load so popup has it ready
setTimeout(() => {
  const text = extractVisibleText();
  if (text) {
    chrome.runtime.sendMessage({ type: 'docbot:text_extracted', text });
  }
}, 2000); 