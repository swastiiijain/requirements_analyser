// DocBot Content Script

// Store highlights across page refreshes
let highlights = JSON.parse(localStorage.getItem('docbot_highlights') || '[]');
let explainTooltip = null;

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

// Create highlight for text
function highlightText(text, color = '#fef08a', anchorId = null) {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }

  textNodes.forEach(textNode => {
    if (textNode.textContent.includes(text.trim())) {
      const parent = textNode.parentNode;
      if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') return;
      
      const regExp = new RegExp(text.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const highlightedHTML = textNode.textContent.replace(
        regExp,
        `<mark id="${anchorId || ''}" style="background-color: ${color}; padding: 2px 4px; border-radius: 2px; scroll-margin-top:80px" data-docbot-highlight="true">$&</mark>`
      );
      
      if (highlightedHTML !== textNode.textContent) {
        const wrapper = document.createElement('span');
        wrapper.innerHTML = highlightedHTML;
        // Add hover to expand
        wrapper.querySelectorAll('mark[data-docbot-highlight]').forEach(mark=>{
          mark.addEventListener('mouseenter', ()=>{ mark.style.backgroundColor='#fde68a';});
          mark.addEventListener('mouseleave', ()=>{ mark.style.backgroundColor=color;});
        });
        parent.replaceChild(wrapper, textNode);
      }
    }
  });
}

// Apply all stored highlights
function applyStoredHighlights() {
  highlights.forEach(highlight => {
    highlightText(highlight.text, highlight.color);
  });
}

// Add highlight and store it
function addHighlight(text, color = '#fef08a', anchorId = null) {
  const existingIndex = highlights.findIndex(h => h.text === text);
  if (existingIndex === -1) {
    highlights.push({ text, color, url: window.location.href });
    localStorage.setItem('docbot_highlights', JSON.stringify(highlights));
    highlightText(text, color, anchorId);
  }
}

// Create explain tooltip
function createExplainTooltip() {
  if (explainTooltip) return;
  
  explainTooltip = document.createElement('div');
  explainTooltip.id = 'docbot-explain-tooltip';
  explainTooltip.innerHTML = `
    <button id="docbot-explain-btn" style="
      background: #4f46e5;
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    ">Explain</button>
  `;
  explainTooltip.style.cssText = `
    position: absolute;
    z-index: 10000;
    display: none;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 4px;
  `;
  
  document.body.appendChild(explainTooltip);
  
  document.getElementById('docbot-explain-btn').addEventListener('click', () => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText && selectedText.length <= 500) {
      // Send to explain endpoint
      fetch('http://localhost:8000/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: selectedText,
          context: extractVisibleText().slice(0, 3000)
        }),
      })
        .then(r => r.json())
        .then(data => {
          alert(`Explanation:\n\n${data.explanation}`);
        })
        .catch(err => alert('Explain failed: ' + err.message));
    }
    
    explainTooltip.style.display = 'none';
  });
}

// Show explain tooltip on text selection
function handleTextSelection() {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (selectedText && selectedText.length > 10 && selectedText.length <= 500) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    createExplainTooltip();
    explainTooltip.style.left = (rect.left + window.scrollX) + 'px';
    explainTooltip.style.top = (rect.bottom + window.scrollY + 5) + 'px';
    explainTooltip.style.display = 'block';
  } else if (explainTooltip) {
    explainTooltip.style.display = 'none';
  }
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
  
  if (msg && msg.type === 'docbot:highlight_text') {
    addHighlight(msg.text, msg.color, msg.anchorId);
    sendResponse({ success: true });
    return true;
  }
  if (msg && msg.type === 'docbot:scroll_to') {
    const el = document.getElementById(msg.anchorId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('docbot-pulse');
      setTimeout(()=> el.classList.remove('docbot-pulse'), 1200);
    }
    return;
  }
});

// Pulse animation style
const style = document.createElement('style');
style.textContent = `@keyframes docPulse{0%{box-shadow:0 0 0 0 rgba(253,230,138,0.7);}70%{box-shadow:0 0 0 10px rgba(253,230,138,0);}100%{box-shadow:0 0 0 0 rgba(253,230,138,0);}} mark.docbot-pulse{animation:docPulse 1s ease-out;}`;
document.head.appendChild(style);

// Apply highlights when page loads
document.addEventListener('DOMContentLoaded', applyStoredHighlights);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyStoredHighlights);
} else {
  applyStoredHighlights();
}

// Add selection listener for explain tooltip
document.addEventListener('mouseup', handleTextSelection);
document.addEventListener('keyup', handleTextSelection);

// Hide tooltip when clicking elsewhere
document.addEventListener('click', (e) => {
  if (explainTooltip && !explainTooltip.contains(e.target)) {
    explainTooltip.style.display = 'none';
  }
});

// Optionally, auto-send text shortly after page load so popup has it ready
setTimeout(() => {
  const text = extractVisibleText();
  if (text) {
    chrome.runtime.sendMessage({ type: 'docbot:text_extracted', text });
  }
}, 2000); 