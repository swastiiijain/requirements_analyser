// DocBot Notes Window

(function(){
  const qs = new URLSearchParams(location.search);
  const docId = qs.get('docId') || 'default';
  const notesEl = document.getElementById('notes');
  const refreshBtn = document.getElementById('refreshBtn');
  const exportBtn = document.getElementById('exportBtn');

  async function fetchNotes(){
    notesEl.innerHTML = '<p style="font-size:12px;color:#6b7280;">Loading…</p>';
    try{
      const r = await fetch(`http://localhost:8000/notes?document_id=${docId}`);
      const json = await r.json();
      renderNotes(json.notes||[]);
    }catch(err){
      notesEl.innerHTML = `<p style="font-size:12px;color:red;">Error: ${err.message}</p>`;
    }
  }

  function renderNotes(list){
    if(list.length===0){
      notesEl.innerHTML = '<p style="font-size:12px;color:#6b7280;font-style:italic;">No notes yet.</p>';
      return;
    }
    notesEl.innerHTML = '';
    list.forEach(n=>{
      const div = document.createElement('div');
      div.className='note';
      div.innerHTML = `<div class="note-title">${n.topic||''}</div><div>${n.content}</div>`;
      notesEl.appendChild(div);
    });
  }

  refreshBtn.addEventListener('click', fetchNotes);

  exportBtn.addEventListener('click', async () => {
    const r = await fetch(`http://localhost:8000/notes?document_id=${docId}`);
    const json = await r.json();
    const list = json.notes||[];
    if(list.length===0){ alert('No notes'); return; }
    const { jsPDF } = await import(chrome.runtime.getURL('dist/vendor.js')).catch(()=>({}));
    if(!jsPDF){ alert('Export Notes functionality will be implemented in the next phase.'); return; }
    const doc = new jsPDF({orientation:'p',unit:'pt',format:'a4'});
    let y=40;
    doc.setFontSize(12);
    doc.text(`Doc Notes – ${new Date().toLocaleString()}`,40,y); y+=20;
    list.forEach((n,i)=>{
      const lines = doc.splitTextToSize(`${i+1}. ${n.content}`,500);
      doc.text(lines,40,y); y+=lines.length*14+10;
      if(y>780){ doc.addPage(); y=40; }
    });
    doc.save('docbot_notes.pdf');
  });

  // initial load
  fetchNotes();
})(); 