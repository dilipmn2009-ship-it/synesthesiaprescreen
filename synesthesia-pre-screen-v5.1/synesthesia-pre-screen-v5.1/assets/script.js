(function(){
  const yearSpan = document.getElementById('year');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  const beginBtn = document.getElementById('beginBtn');
  const resetBtn = document.getElementById('resetBtn');
  const questionEl = document.getElementById('question');
  const qkindEl = document.getElementById('qkind');
  const progressEl = document.getElementById('progress');
  const nextBtn = document.getElementById('nextBtn');

  // Grapheme
  const qG = document.getElementById('q_grapheme');
  const letterEl = document.getElementById('letter');
  const gChoices = document.getElementById('graphemeChoices');

  // Sound
  const qS = document.getElementById('q_sound');
  const playToneBtn = document.getElementById('playToneBtn');
  const toneLabel = document.getElementById('toneLabel');
  const sColorChoices = document.getElementById('soundColorChoices');
  const sShapeChoices = document.getElementById('soundShapeChoices');

  // Sequence
  const qQ = document.getElementById('q_sequence');
  const seqCanvas = document.getElementById('seqCanvas');
  const seqCtx = seqCanvas.getContext('2d');
  const seqCurrent = document.getElementById('seqCurrent');
  const seqCount = document.getElementById('seqCount');

  // Results
  const resultsEl = document.getElementById('results');
  const scoreOverallEl = document.getElementById('score_overall');
  const scoreGEl = document.getElementById('score_grapheme');
  const scoreSEl = document.getElementById('score_sound');
  const scoreQEl = document.getElementById('score_sequence');
  const scoreDescEl = document.getElementById('scoreDesc');
  const detailsTable = document.getElementById('detailsTable');
  const retryBtn = document.getElementById('retryBtn');
  const saveBtn = document.getElementById('saveBtn');
  const exportBtn = document.getElementById('exportBtn');

  // Data
  const graphemes = ['A','B','C','D','E','F','G','H','I','J'];
  const colorOptions = [
    {name:'Red',hex:'#ef4444'},{name:'Blue',hex:'#3b82f6'},{name:'Green',hex:'#22c55e'},
    {name:'Purple',hex:'#a78bfa'},{name:'Brown',hex:'#8b5e3c'},{name:'White',hex:'#ffffff'},
    {name:'Yellow',hex:'#eab308'},{name:'Orange',hex:'#f97316'},{name:'Pink',hex:'#ec4899'},
    {name:'Black',hex:'#000000'}
  ];
  const shapes = ['Circle','Square','Triangle','Star','Wave','Hexagon','Spiral','Diamond','Oval','Cross'];
  const tones = [220,247,262,294,330,349,392,440,494,523]; // 10 tones

  // State
  let setNum = 1; // 1 then 2
  let phase = 'G'; // G -> S -> Q
  let gOrder = [], sOrder = [];
  let gIndex = 0, sIndex = 0;
  let selectionG = null, selectionSC = null, selectionSS = null;

  let seqItemIndex = 0; // 0..9
  let seqPoints = {};   // {'1':{x,y}, ...}
  let seqReadyToProceed = false;

  const answers = {
    grapheme:{1:{},2:{}},
    soundColor:{1:{},2:{}},
    soundShape:{1:{},2:{}},
    sequence:{1:{},2:{}}
  };

  function shuffle(arr){
    for(let i=arr.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]] = [arr[j],arr[i]];
    }
    return arr;
  }
  function hideAll(){ qG.classList.add('hidden'); qS.classList.add('hidden'); qQ.classList.add('hidden'); }
  function setProgress(text){ progressEl.textContent = text; }

  // Audio
  let audioCtx = null;
  function playTone(freq, dur=0.7){
    try{
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type='sine'; osc.frequency.value=freq; gain.gain.value=0.15;
      osc.connect(gain).connect(audioCtx.destination); osc.start();
      setTimeout(()=>osc.stop(), Math.max(100, dur*1000));
    }catch(e){ console.log('Audio unavailable', e); }
  }
  playToneBtn.addEventListener('click', ()=>{
    if (phase==='S'){ playTone(sOrder[sIndex], 0.8); }
  });

  // Sequence canvas
  function drawSeqCanvas(){
    const w = seqCanvas.width, h = seqCanvas.height;
    seqCtx.clearRect(0,0,w,h);
    seqCtx.strokeStyle = 'rgba(255,255,255,0.08)'; seqCtx.lineWidth = 1;
    for(let i=1;i<10;i++){
      const gx = Math.round((w/10)*i), gy = Math.round((h/10)*i);
      seqCtx.beginPath(); seqCtx.moveTo(gx,0); seqCtx.lineTo(gx,h); seqCtx.stroke();
      seqCtx.beginPath(); seqCtx.moveTo(0,gy); seqCtx.lineTo(w,gy); seqCtx.stroke();
    }
    Object.entries(seqPoints).forEach(([k,p])=>{
      const x = Math.round(p.x*w), y = Math.round(p.y*h);
      seqCtx.fillStyle = '#22d3ee';
      seqCtx.beginPath(); seqCtx.arc(x,y,7,0,Math.PI*2); seqCtx.fill();
      seqCtx.fillStyle = 'rgba(255,255,255,.85)';
      seqCtx.font = '12px ui-sans-serif';
      seqCtx.fillText(k, x+10, y-10);
    });
  }
  seqCanvas.addEventListener('click', (e)=>{
    if (phase!=='Q') return;
    const rect = seqCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / seqCanvas.width;
    const y = (e.clientY - rect.top) / seqCanvas.height;
    const label = String(seqItemIndex+1);
    seqPoints[label] = {x,y};
    seqItemIndex = Math.min(9, seqItemIndex + 1);
    if (Object.keys(seqPoints).length>=10){ seqReadyToProceed = true; }
    document.getElementById('seqCurrent').textContent = String(seqItemIndex+1);
    document.getElementById('seqCount').textContent = String(Object.keys(seqPoints).length);
    drawSeqCanvas();
  });

  function begin(){
    setNum = 1; phase = 'G';
    gOrder = shuffle([...graphemes]);
    sOrder = shuffle([...tones]);
    gIndex = 0; sIndex = 0;
    selectionG = selectionSC = selectionSS = null;
    seqItemIndex = 0; seqPoints = {}; seqReadyToProceed = false;
    document.getElementById('seqCurrent').textContent = '1';
    document.getElementById('seqCount').textContent = '0';
    questionEl.classList.remove('hidden'); resultsEl.classList.add('hidden');
    resetBtn.disabled = false;
    render();
  }

  function render(){
    hideAll();
    if (phase==='G'){
      qkindEl.textContent = `Grapheme → Color (Set ${setNum}/2)`;
      qG.classList.remove('hidden');
      const letter = gOrder[gIndex];
      letterEl.textContent = letter;
      gChoices.innerHTML = '';
      const opts = shuffle(colorOptions.map(o=>o.name));
      opts.forEach(name=>{
        const meta = colorOptions.find(o=>o.name===name);
        const btn = document.createElement('button');
        btn.type='button'; btn.className='choice';
        btn.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;gap:8px">
          <span style="display:inline-block;width:14px;height:14px;border-radius:4px;border:1px solid rgba(255,255,255,.25);background:${meta.hex}"></span>
          <span>${name}</span></div>`;
        btn.onclick = ()=>{
          selectionG = name;
          [...gChoices.children].forEach(c=>c.classList.remove('active'));
          btn.classList.add('active');
        };
        gChoices.appendChild(btn);
      });
      setProgress(`Grapheme ${gIndex+1} of 10`);
    }
    else if (phase==='S'){
      qkindEl.textContent = `Sound → Color / Shape (Set ${setNum}/2)`;
      qS.classList.remove('hidden');
      document.getElementById('toneLabel').textContent = `Tone ${sIndex+1} of 10`;
      sColorChoices.innerHTML = '';
      shuffle(colorOptions.map(o=>o.name)).forEach(name=>{
        const meta = colorOptions.find(o=>o.name===name);
        const btn = document.createElement('button');
        btn.type='button'; btn.className='choice';
        btn.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;gap:8px">
          <span style="display:inline-block;width:14px;height:14px;border-radius:4px;border:1px solid rgba(255,255,255,.25);background:${meta.hex}"></span>
          <span>${name}</span></div>`;
        btn.onclick = ()=>{
          selectionSC = name;
          [...sColorChoices.children].forEach(c=>c.classList.remove('active'));
          btn.classList.add('active');
        };
        sColorChoices.appendChild(btn);
      });
      sShapeChoices.innerHTML = '';
      shuffle([...shapes]).forEach(sh=>{
        const btn = document.createElement('button');
        btn.type='button'; btn.className='choice'; btn.textContent = sh;
        btn.onclick = ()=>{
          selectionSS = sh;
          [...sShapeChoices.children].forEach(c=>c.classList.remove('active'));
          btn.classList.add('active');
        };
        sShapeChoices.appendChild(btn);
      });
      setProgress(`Sound ${sIndex+1} of 10`);
    }
    else if (phase==='Q'){
      qkindEl.textContent = `Sequence → Spatial (Set ${setNum}/2)`;
      qQ.classList.remove('hidden');
      document.getElementById('seqCurrent').textContent = String(seqItemIndex+1);
      document.getElementById('seqCount').textContent = String(Object.keys(seqPoints).length);
      drawSeqCanvas();
      setProgress(`Sequence: place dots for 1–10`);
    }
  }

  function next(){
    if (phase==='G'){
      if (!selectionG){ alert('Choose a color'); return; }
      const letter = gOrder[gIndex];
      answers.grapheme[setNum][letter] = selectionG;
      selectionG = null; gIndex++;
      if (gIndex>=10){ phase='S'; sIndex=0; render(); } else { render(); }
    }
    else if (phase==='S'){
      if (!selectionSC || !selectionSS){ alert('Choose both a color and a shape'); return; }
      const tone = sOrder[sIndex];
      answers.soundColor[setNum][String(tone)] = selectionSC;
      answers.soundShape[setNum][String(tone)] = selectionSS;
      selectionSC = selectionSS = null; sIndex++;
      if (sIndex>=10){ phase='Q'; seqItemIndex=0; seqPoints={}; seqReadyToProceed=false; render(); } else { render(); }
    }
    else if (phase==='Q'){
      if (!seqReadyToProceed || Object.keys(seqPoints).length<10){
        alert('Please place all 10 dots on the canvas (items 1–10).'); return;
      }
      answers.sequence[setNum] = {...seqPoints};
      if (setNum===1){
        setNum = 2;
        gOrder = shuffle([...graphemes]);
        sOrder = shuffle([...tones]);
        gIndex = 0; sIndex = 0;
        seqItemIndex = 0; seqPoints = {}; seqReadyToProceed=false;
        phase = 'G'; render();
      }else{
        showResults();
      }
    }
  }

  function computeScores(){
    let gHit=0; const gRows=[];
    graphemes.forEach(l=>{
      const a = answers.grapheme[1][l];
      const b = answers.grapheme[2][l];
      const match = (a && b && a===b);
      if (match) gHit++;
      gRows.push({type:'G', item:l, a:a||'—', b:b||'—', info: match?'match':'no match', score: match?100:0});
    });
    const gScore = Math.round((gHit/10)*100);

    let sSum=0; const sRows=[];
    tones.forEach(t=>{
      const key = String(t);
      const c1 = answers.soundColor[1][key], c2 = answers.soundColor[2][key];
      const sh1 = answers.soundShape[1][key], sh2 = answers.soundShape[2][key];
      const colorMatch = (c1 && c2 && c1===c2) ? 1 : 0;
      const shapeMatch = (sh1 && sh2 && sh1===sh2) ? 1 : 0;
      const score = Math.round(((colorMatch+shapeMatch)/2)*100);
      sSum += score;
      sRows.push({type:'S', item:key+' Hz', a:`${c1||'—'} / ${sh1||'—'}`, b:`${c2||'—'} / ${sh2||'—'}`, info:`color ${colorMatch? '✓':'×'}, shape ${shapeMatch? '✓':'×'}`, score});
    });
    const sScore = Math.round(sSum/tones.length);

    function dist(a,b){ const dx=a.x-b.x, dy=a.y-b.y; return Math.sqrt(dx*dx+dy*dy); }
    const diag = Math.sqrt(2);
    let qSum=0, qCount=0; const qRows=[];
    for (let i=1;i<=10;i++){
      const k = String(i);
      const a = answers.sequence[1][k];
      const b = answers.sequence[2][k];
      if (a && b){
        const d = dist(a,b);
        const s = Math.max(0, Math.round((1 - (d/diag))*100));
        qSum += s; qCount++;
        qRows.push({type:'Q', item:k, a:`(${a.x.toFixed(2)},${a.y.toFixed(2)})`, b:`(${b.x.toFixed(2)},${b.y.toFixed(2)})`, info:`Δ=${d.toFixed(2)} (norm)`, score:s});
      } else {
        qRows.push({type:'Q', item:k, a:'—', b:'—', info:'missing', score:0});
      }
    }
    const qScore = qCount? Math.round(qSum/qCount) : 0;

    const overall = Math.round((gScore + sScore + qScore)/3);
    return {overall, gScore, sScore, qScore, rows:[...gRows, ...sRows, ...qRows]};
  }

  function describeScore(parts){
    let verdict;
    if (parts.overall>=85) verdict = "Very high consistency across categories.";
    else if (parts.overall>=70) verdict = "High consistency across many items.";
    else if (parts.overall>=55) verdict = "Moderate consistency with mixed stability.";
    else verdict = "Low overall consistency.";
    return `${verdict} Synesthesia result estimate: ${parts.overall}% based on repeated‑choice agreement. (Grapheme ${parts.gScore}/100, Sound ${parts.sScore}/100, Sequence ${parts.qScore}/100.) This is educational only — not diagnostic.`;
  }

  function renderDetails(rows){
    let html = '<div class="table-wrap"><table class="table" style="width:100%;border-collapse:collapse">';
    html += '<thead><tr><th style="text-align:left;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.15)">Type</th><th style="text-align:left;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.15)">Item</th><th style="text-align:left;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.15)">Attempt 1</th><th style="text-align:left;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.15)">Attempt 2</th><th style="text-align:left;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.15)">Info / Score</th></tr></thead><tbody>';
    rows.forEach(r=>{
      html += `<tr>
        <td style="padding:6px 8px;border-bottom:1px dashed rgba(255,255,255,.1)">${r.type}</td>
        <td style="padding:6px 8px;border-bottom:1px dashed rgba(255,255,255,.1)"><strong>${r.item}</strong></td>
        <td style="padding:6px 8px;border-bottom:1px dashed rgba(255,255,255,.1)">${r.a}</td>
        <td style="padding:6px 8px;border-bottom:1px dashed rgba(255,255,255,.1)">${r.b}</td>
        <td style="padding:6px 8px;border-bottom:1px dashed rgba(255,255,255,.1)">${r.info} • ${r.score}/100</td>
      </tr>`;
    });
    html += '</tbody></table></div>';
    document.getElementById('detailsTable').innerHTML = html;
  }

  function showResults(){
    questionEl.classList.add('hidden');
    const scores = computeScores();
    scoreOverallEl.textContent = `${scores.overall}/100`;
    scoreGEl.textContent = `${scores.gScore}/100`;
    scoreSEl.textContent = `${scores.sScore}/100`;
    scoreQEl.textContent = `${scores.qScore}/100`;
    scoreDescEl.textContent = describeScore(scores);
    renderDetails(scores.rows);
    resultsEl.classList.remove('hidden');
  }

  function reset(){
    questionEl.classList.add('hidden');
    resultsEl.classList.add('hidden');
    resetBtn.disabled = true;
  }

  nextBtn.addEventListener('click', next);
  beginBtn?.addEventListener('click', begin);
  resetBtn?.addEventListener('click', reset);
  retryBtn?.addEventListener('click', begin);

  saveBtn?.addEventListener('click', () => {
    const scores = computeScores();
    const rec = { timestamp: new Date().toISOString(), scores, answers };
    const key = 'synesthesia_pre_screen_history_v51';
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    list.push(rec);
    localStorage.setItem(key, JSON.stringify(list));
    alert('Saved locally (browser storage).');
  });

  exportBtn?.addEventListener('click', () => {
    const scores = computeScores();
    const payload = { timestamp: new Date().toISOString(), scores, answers };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'synesthesia-pre-screen-results-v5.1.json';
    a.click();
    URL.revokeObjectURL(url);
  });
})();