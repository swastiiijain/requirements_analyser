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
        `<mark id="${anchorId || ''}" style="${HIGHLIGHT_STYLE} scroll-margin-top:80px" data-docbot-highlight="true">$&</mark>`
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
    
    if (selectedText && selectedText.length <= 100) {
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
          // create inline popup near selection
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          showExplanationPopup(rect, data.explanation);
        })
        .catch(err => alert('Explain failed: ' + err.message));
    }
    
    explainTooltip.style.display = 'none';
  });
}

// Add explain result listener
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'docbot:explain_result') {
    const explanation = msg.explanation;
    const rect = { left: window.innerWidth / 2, top: window.innerHeight / 2, bottom: window.innerHeight / 2 };
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const r = sel.getRangeAt(0).getBoundingClientRect();
      rect.left = r.left + window.scrollX;
      rect.bottom = r.bottom + window.scrollY;
    }
    // remove any existing tooltip
    document.querySelectorAll('.docbot-popup').forEach(el=>el.remove());

    let popup=currentPopup;
    if(!popup){
      popup=document.createElement('div');
      document.body.appendChild(popup);
    }
    popup.className='docbot-popup';
    popup.style.cssText=`position:absolute;top:${rect.bottom+6}px;left:${rect.left}px;max-width:320px;background:#ecfdf5;border:1px solid #10b981;border-radius:8px;padding:10px;font-size:13px;color:#065f46;box-shadow:0 6px 16px rgba(0,0,0,.2);z-index:10000;line-height:1.4;`;
    const formatted = explanation.includes('\n') ? '<ul style="margin:0;padding-left:18px;list-style-type:disc;">' + explanation.split('\n').filter(t=>t.trim()).map(t=>`<li>${t.trim()}</li>`).join('') + '</ul>' : explanation;
    popup.innerHTML = formatted;
    popup.addEventListener('click', () => popup.remove());
    // No auto timer; will stay until click elsewhere
  }
});

// Simplified selection handler
function handleTextSelection() {
  const selection = window.getSelection();
  const txt = selection.toString().trim();
  if (txt && txt.length <= 100) {
    const range = selection.rangeCount? selection.getRangeAt(0):null;
    const rect = range? range.getBoundingClientRect(): {left:window.innerWidth/2,bottom:window.innerHeight/2};

    // show loader popup
    document.querySelectorAll('.docbot-popup').forEach(el=>el.remove());
    createLoadingPopup(rect);

    chrome.runtime.sendMessage({
      type: 'docbot:explain',
      text: txt,
      context: extractVisibleText().slice(0, 3000),
    });
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

// Track current explanation popup or loader
let currentPopup = null;

// Helper to remove any open popups
const removePopup = () => {
  document.querySelectorAll('.docbot-popup').forEach(el => el.remove());
};

function createLoadingPopup(rect) {
  removePopup();
  const popup = document.createElement('div');
  popup.className = 'docbot-popup';
  popup.style.cssText = `position:absolute;top:${rect.bottom + 6}px;left:${rect.left}px;max-width:200px;background:#ffffff;border:1px solid #d1d5db;border-radius:8px;padding:6px 10px;font-size:12px;color:#4b5563;box-shadow:0 4px 12px rgba(0,0,0,.15);display:flex;align-items:center;gap:6px;z-index:10000;`;
  popup.innerHTML = '<span style="width:14px;height:14px;border:3px solid #d1d5db;border-top-color:#6366f1;border-radius:50%;display:inline-block;animation:docSpin 1s linear infinite"></span><span>Loading…</span>';
  document.body.appendChild(popup);
  return popup;
}

function showExplanationPopup(rect, text) {
  removePopup();
  const popup = document.createElement('div');
  popup.className = 'docbot-popup';
  popup.style.cssText = `position:absolute;top:${rect.bottom + 6}px;left:${rect.left}px;max-width:320px;background:#ecfdf5;border:1px solid #10b981;border-radius:8px;padding:10px;font-size:13px;color:#065f46;box-shadow:0 6px 16px rgba(0,0,0,.2);z-index:10000;line-height:1.4;`;
  const formatted = text.includes('\n') ? '<ul style="margin:0;padding-left:18px;list-style-type:disc;">' + text.split('\n').filter(t=>t.trim()).map(t=>`<li>${t.trim()}</li>`).join('') + '</ul>' : text;
  popup.innerHTML = formatted;
  document.body.appendChild(popup);

  // outside click handler
  const clickHandler = (e)=>{
    if(!popup.contains(e.target)) {
      popup.remove();
      document.removeEventListener('click', clickHandler, true);
    }
  };
  // use capture so it runs before page handlers
  setTimeout(()=>document.addEventListener('click', clickHandler, true),0);
  currentPopup = popup;
}

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