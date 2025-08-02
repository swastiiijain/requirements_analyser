let comparisonData = null;

// Get data from chrome.storage using ID from URL
async function getComparisonData() {
  const urlParams = new URLSearchParams(window.location.search);
  const comparisonId = urlParams.get('id');
  
  if (comparisonId) {
    try {
      const result = await chrome.storage.local.get([comparisonId]);
      if (result[comparisonId]) {
        // Don't immediately delete - let it persist for future access
        // chrome.storage.local.remove([comparisonId]);
        return result[comparisonId];
      }
    } catch (e) {
      console.error('Failed to get comparison data:', e);
      return null;
    }
  }
  return null;
}

// Initialize the comparison view
async function initializeComparison() {
  comparisonData = await getComparisonData();
  
  if (!comparisonData) {
    document.getElementById('summary-text').innerHTML = '<p style="color: #dc2626;">Error: No comparison data found</p>';
    return;
  }
  
  // Set document names
  document.getElementById('doc1-name').textContent = `${comparisonData.document1.name} (Original)`;
  document.getElementById('doc2-name').textContent = `${comparisonData.document2.name} (Updated)`;
  
  // Set document contents with highlighting
  highlightChanges();
  
  // Clear the summary text area since we have the header in the panel
  document.getElementById('summary-text').innerHTML = '';
  
  // Set changes list
  displayChanges();
}

// Format summary with proper styling
function formatSummary(summary) {
  if (!summary) return '<p>No summary available</p>';
  
  // Convert bullet points to HTML list
  const lines = summary.split('\n').filter(line => line.trim());
  let formatted = '';
  
  for (let line of lines) {
    if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
      if (!formatted.includes('<ul>')) {
        formatted += '<ul style="margin-left: 1rem; margin-top: 0.5rem;">';
      }
      formatted += `<li style="margin: 0.25rem 0;">${line.trim().substring(1).trim()}</li>`;
    } else {
      if (formatted.includes('<ul>') && !formatted.includes('</ul>')) {
        formatted += '</ul>';
      }
      formatted += `<p style="margin: 0.5rem 0;">${line}</p>`;
    }
  }
  
  if (formatted.includes('<ul>') && !formatted.includes('</ul>')) {
    formatted += '</ul>';
  }
  
  return formatted;
}

// Display changes in the sidebar
function displayChanges() {
  const changesList = document.getElementById('changes-list');
  
  if (!comparisonData.changes || comparisonData.changes.length === 0) {
    // If no changes from API, try to detect from highlighted differences
    const changeTargets = document.querySelectorAll('.change-target');
    if (changeTargets.length === 0) {
      changesList.innerHTML = '<p style="font-size: 0.875rem; color: #6b7280;">No specific changes detected</p>';
      return;
    } else {
             // Create generic changes based on highlighted elements
       let changesHtml = '';
       const uniqueChanges = new Set();
      
      changeTargets.forEach((target, index) => {
        const changeIndex = target.getAttribute('data-change-index');
        if (changeIndex && !uniqueChanges.has(changeIndex)) {
          uniqueChanges.add(changeIndex);
          const changeType = target.classList.contains('highlight-added') ? 'Addition' :
                            target.classList.contains('highlight-removed') ? 'Removal' : 'Modification';
          
                     changesHtml += `
             <div class="change-item highlight-modified cursor-pointer hover:opacity-80 transition-opacity" 
                  data-change-index="${changeIndex}"
                  title="Click to view this change in the documents">
               <strong>${changeType}:</strong> Line ${parseInt(changeIndex) + 1}
               <div style="font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem;">📍 Click to locate</div>
             </div>
           `;
        }
      });
      
             changesList.innerHTML = changesHtml;
       addChangeListeners();
     }
     return;
  }
  
  let changesHtml = '';
  
  comparisonData.changes.forEach((change, index) => {
    const changeClass = getChangeClass(change.type);
    changesHtml += `
      <div class="change-item ${changeClass} cursor-pointer hover:opacity-80 transition-opacity" 
           data-change-index="${index}" 
           title="Click to view this change in the documents">
        <strong>${change.type}:</strong> ${change.description || change.text || 'Change detected'}
        <div style="font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem;">📍 Click to locate</div>
      </div>
    `;
  });
  
  changesList.innerHTML = changesHtml;
  
  // Add event listeners for change items (avoiding CSP inline handler issues)
  addChangeListeners();
}

// Get CSS class for change type
function getChangeClass(type) {
  if (type && type.toLowerCase().includes('add')) return 'highlight-added';
  if (type && type.toLowerCase().includes('remove')) return 'highlight-removed';
  return 'highlight-modified';
}

// Add event listeners for change items (avoiding CSP inline handler issues)
function addChangeListeners() {
  document.querySelectorAll('.change-item[data-change-index]').forEach(item => {
    item.addEventListener('click', function() {
      const changeIndex = this.getAttribute('data-change-index');
      scrollToChange(parseInt(changeIndex));
    });
  });
}

// Highlight changes in document content
function highlightChanges() {
  const doc1Content = document.getElementById('doc1-content');
  const doc2Content = document.getElementById('doc2-content');
  
  // For now, just display the raw content
  // In a more sophisticated implementation, we would perform diff highlighting
  doc1Content.innerHTML = `<div style="white-space: pre-wrap; font-family: monospace; font-size: 0.875rem;">${escapeHtml(comparisonData.document1.content)}</div>`;
  doc2Content.innerHTML = `<div style="white-space: pre-wrap; font-family: monospace; font-size: 0.875rem;">${escapeHtml(comparisonData.document2.content)}</div>`;
  
  // TODO: Implement actual diff highlighting using a library like diff2html
  // For now, we'll use a simple approach to highlight potential changes
  highlightBasicDifferences();
}

// Basic difference highlighting (simplified approach)
function highlightBasicDifferences() {
  // This is a simplified approach - in a real implementation, 
  // you'd use a proper diff algorithm
  
  const doc1Lines = comparisonData.document1.content.split('\n');
  const doc2Lines = comparisonData.document2.content.split('\n');
  
  // Simple line-by-line comparison for demonstration
  // This could be much more sophisticated
  
  let doc1Html = '';
  let doc2Html = '';
  let changeIndex = 0;
  
  const maxLines = Math.max(doc1Lines.length, doc2Lines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const line1 = doc1Lines[i] || '';
    const line2 = doc2Lines[i] || '';
    
    if (line1 !== line2) {
      const changeId = `change-${changeIndex}`;
      if (line1 && !line2) {
        doc1Html += `<div id="${changeId}-doc1" class="highlight-removed change-target" data-change-index="${changeIndex}">${escapeHtml(line1)}</div>`;
        doc2Html += `<div id="${changeId}-doc2" class="change-target" data-change-index="${changeIndex}" style="opacity: 0.3; font-style: italic;">[Line removed]</div>`;
      } else if (!line1 && line2) {
        doc1Html += `<div id="${changeId}-doc1" class="change-target" data-change-index="${changeIndex}" style="opacity: 0.3; font-style: italic;">[Line added]</div>`;
        doc2Html += `<div id="${changeId}-doc2" class="highlight-added change-target" data-change-index="${changeIndex}">${escapeHtml(line2)}</div>`;
      } else {
        doc1Html += `<div id="${changeId}-doc1" class="highlight-modified change-target" data-change-index="${changeIndex}">${escapeHtml(line1)}</div>`;
        doc2Html += `<div id="${changeId}-doc2" class="highlight-modified change-target" data-change-index="${changeIndex}">${escapeHtml(line2)}</div>`;
      }
      changeIndex++;
    } else {
      doc1Html += `<div>${escapeHtml(line1)}</div>`;
      doc2Html += `<div>${escapeHtml(line2)}</div>`;
    }
  }
  
  document.getElementById('doc1-content').innerHTML = `<div style="font-family: monospace; font-size: 0.875rem; line-height: 1.5;">${doc1Html}</div>`;
  document.getElementById('doc2-content').innerHTML = `<div style="font-family: monospace; font-size: 0.875rem; line-height: 1.5;">${doc2Html}</div>`;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Ask question about the comparison
async function askQuestion() {
  const input = document.getElementById('question-input');
  const question = input.value.trim();
  
  if (!question) return;
  
  // TODO: Implement chat functionality for comparison questions
  // This would communicate with the backend using the comparison document IDs
  
  alert('Chat functionality for comparisons will be implemented in the next phase.');
  input.value = '';
}

// Scroll to a specific change in both documents
function scrollToChange(changeIndex) {
  console.log('Scrolling to change:', changeIndex);
  
  const doc1Element = document.getElementById(`change-${changeIndex}-doc1`);
  const doc2Element = document.getElementById(`change-${changeIndex}-doc2`);
  
  console.log('Found elements:', doc1Element, doc2Element);
  
  if (doc1Element && doc2Element) {
    // Remove previous highlights
    document.querySelectorAll('.change-target.active-change').forEach(el => {
      el.classList.remove('active-change');
    });
    
    // Add highlight to current changes
    doc1Element.classList.add('active-change');
    doc2Element.classList.add('active-change');
    
    // Scroll both panels to the change
    const doc1Panel = document.getElementById('doc1-content');
    const doc2Panel = document.getElementById('doc2-content');
    
    if (doc1Panel && doc2Panel) {
      // Use scrollIntoView for more reliable scrolling
      doc1Element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      doc2Element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Add a pulse animation
      doc1Element.style.animation = 'pulse-highlight 2s ease-in-out';
      doc2Element.style.animation = 'pulse-highlight 2s ease-in-out';
      
      // Remove animation after it completes
      setTimeout(() => {
        doc1Element.style.animation = '';
        doc2Element.style.animation = '';
      }, 2000);
    }
  } else {
    console.error('Could not find change elements for index:', changeIndex);
    alert('Could not locate this change in the documents. This might be due to formatting differences.');
  }
}

// Download key changes as text file
function downloadChanges() {
  if (!comparisonData) return;
  
  let content = `Document Comparison: ${comparisonData.document1.name} vs ${comparisonData.document2.name}\n`;
  content += `Generated: ${new Date().toLocaleString()}\n`;
  content += `${'='.repeat(60)}\n\n`;
  
  if (comparisonData.changes && comparisonData.changes.length > 0) {
    content += `KEY CHANGES (${comparisonData.changes.length} total):\n\n`;
    comparisonData.changes.forEach((change, index) => {
      content += `${index + 1}. ${change.type}: ${change.description || change.text || 'Change detected'}\n`;
    });
  } else {
    // Fallback to detected changes from highlighting
    const changeTargets = document.querySelectorAll('.change-target');
    const uniqueChanges = new Set();
    
    content += `DETECTED CHANGES:\n\n`;
    changeTargets.forEach((target, index) => {
      const changeIndex = target.getAttribute('data-change-index');
      if (changeIndex && !uniqueChanges.has(changeIndex)) {
        uniqueChanges.add(changeIndex);
        const changeType = target.classList.contains('highlight-added') ? 'Addition' :
                          target.classList.contains('highlight-removed') ? 'Removal' : 'Modification';
        content += `${uniqueChanges.size}. ${changeType}: Line ${parseInt(changeIndex) + 1}\n`;
      }
    });
    
    if (uniqueChanges.size === 0) {
      content += `No specific changes detected between the documents.\n`;
    }
  }
  
  // Create and download file
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `comparison_${comparisonData.document1.name}_vs_${comparisonData.document2.name}_${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Handle Enter key in input
document.addEventListener('DOMContentLoaded', function() {
  const input = document.getElementById('question-input');
  if (input) {
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        askQuestion();
      }
    });
  }
  
  // Add download button event listener
  const downloadBtn = document.getElementById('download-changes-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadChanges);
  }
  
  // Initialize the comparison view
  initializeComparison();
}); 