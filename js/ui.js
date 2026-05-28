// ---- INPUT HANDLING WITH WARNINGS ----
function focusInput() { 
  document.getElementById('hidden-input').focus(); 
}

document.getElementById('text-box').addEventListener('click', focusInput);

function handleKey(e) {
  if(e.key === 'Escape') { 
    restartTest(); 
    return; 
  }
  if(e.key === 'Tab') { 
    e.preventDefault(); 
    state._tabHeld = true; 
    return; 
  }
  if(e.key === 'Enter' && state._tabHeld) { 
    restartTest(); 
    return; 
  }
  if(e.key === 'Backspace') {
    if(state.pos > 0) {
      state.pos--;
      state.input = state.input.slice(0,-1);
      renderText();
      removeWarnings();
    }
    e.preventDefault();
  }
}

document.addEventListener('keyup', e => { 
  if(e.key==='Tab') state._tabHeld=false; 
});

function removeWarnings() {
  document.querySelectorAll('.warning-box').forEach(w => w.remove());
}

function showWarning(message) {
  removeWarnings();
  const box = document.createElement('div');
  box.className = 'warning-box';
  box.textContent = message;
  document.getElementById('text-box').appendChild(box);
  setTimeout(() => box.remove(), 2000);
}

function getCharCode(char) {
  return char.charCodeAt(0);
}

function isCapitalLetter(char) {
  return char >= 'A' && char <= 'Z';
}

function isLowercaseLetter(char) {
  return char >= 'a' && char <= 'z';
}

function isLatinLetter(char) {
  return (char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z');
}

function isCyrillicLetter(char) {
  return (char >= 'А' && char <= 'Я') || (char >= 'а' && char <= 'я');
}

function handleInput(e) {
  if(state.finished) return;
  const val = e.data;
  if(!val) return;

  if(!state.started) startTest();

  // Check for Caps Lock - improved detection
  if (state.pos === 0 && val.length === 1) {
    const expectedChar = state.text[state.pos];
    // Only warn if typing capital letter when lowercase expected (with no modifiers)
    if (isCapitalLetter(val) && isLowercaseLetter(expectedChar)) {
      showWarning(t('caps_warning'));
    }
  }

  // Check if first character should be capital but isn't
  if (state.pos === 0 && val.length === 1) {
    if (!isCapitalLetter(val) && isLowercaseLetter(val)) {
      showWarning(t('shift_warning'));
    }
  }

  // Check language mismatch
  if (state.pos === 0 && val.length === 1) {
    const expectedChar = state.text[state.pos];
    const inputLatin = isLatinLetter(val);
    const expectedLatin = isLatinLetter(expectedChar);
    const inputCyrillic = isCyrillicLetter(val);
    const expectedCyrillic = isCyrillicLetter(expectedChar);
    
    // If we're typing Latin but need Cyrillic (for Ukrainian/Russian)
    if (inputLatin && (expectedCyrillic || (state.lang !== 'en'))) {
      const langName = state.lang === 'uk' ? 'українську' : state.lang === 'ru' ? 'русский' : 'English';
      showWarning(t('lang_warning'));
    }
    // If we're typing Cyrillic but need Latin (for English)
    if (inputCyrillic && expectedLatin && state.lang === 'en') {
      showWarning(t('lang_warning'));
    }
  }

  const expected = state.text[state.pos];
  const correct = val === expected;

  if(state.settings.sound) playClick(correct);

  state.input += val;
  if(correct) state.correct++;
  else state.errors++;
  state.pos++;

  // End on words mode
  if(state.mode === 'words' && state.pos >= state.text.length) {
    finishTest();
    document.getElementById('hidden-input').value = '';
    return;
  }

  renderText();
  updateLiveStats();
  document.getElementById('hidden-input').value = '';
}

// ---- PAGES ----
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  document.getElementById('nav-'+name).classList.add('active');
  if (name === 'type') { 
    generateText(); 
    focusInput(); 
    updateHomeStats(); 
  }
  if (name === 'stats') renderStats();
  if (name === 'home') updateHomeStats();
  if (name === 'settings') renderSettings();
}

// ---- LANGUAGE ----
function setLang(l) {
  state.lang = l;
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('lang-'+l).classList.add('active');
  updateAllText();
  restartTest();
}

// ---- MODE & OPTIONS ----
function setMode(m) {
  state.mode = m;
  document.querySelectorAll('.mode-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('mode-'+m).classList.add('active');
  document.getElementById('time-opts').style.display = m === 'time' ? 'flex' : 'none';
  document.getElementById('words-opts').style.display = m === 'words' ? 'flex' : 'none';
  restartTest();
}

function setDuration(d) {
  state.duration = d;
  document.querySelectorAll('#time-opts .time-opt').forEach(b => b.classList.remove('active'));
  document.getElementById('dur-'+d).classList.add('active');
  restartTest();
}

function setWordCount(n) {
  state.wordCount = n;
  document.querySelectorAll('#words-opts .time-opt').forEach(b => b.classList.remove('active'));
  document.getElementById('wc-'+n).classList.add('active');
  restartTest();
}

// ---- TEXT GENERATION ----
function generateText() {
  const bank = [...WORDS[state.lang]];
  // shuffle
  for(let i=bank.length-1;i>0;i--){ 
    const j=Math.floor(Math.random()*(i+1)); 
    [bank[i],bank[j]]=[bank[j],bank[i]]; 
  }
  let words = [];
  const count = state.mode === 'words' ? state.wordCount : 80;
  for(let i=0;i<count;i++) words.push(bank[i % bank.length]);
  
  // Capitalize first word
  if (words.length > 0) {
    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  }
  
  // Insert numbers - randomized, not always at start
  if (state.settings.nums) {
    const positions = [];
    for(let i=1;i<words.length;i+=7) {
      positions.push(i);
    }
    // Insert from end to start to maintain positions
    for(let i=positions.length-1;i>=0;i--) {
      words.splice(positions[i], 0, String(Math.floor(Math.random()*100)));
    }
  }
  
  if (state.settings.punct) {
    const puncts = [',','.',',','!','?',';'];
    for(let i=3;i<words.length;i+=4) words[i] += puncts[Math.floor(Math.random()*puncts.length)];
  }
  
  state.text = words.join(' ').split('');
  state.pos = 0;
  state.input = '';
  state.correct = 0;
  state.errors = 0;
  state.started = false;
  state.finished = false;
  state.timeLeft = state.duration;
  clearInterval(state.timer);
  renderText();
  updateLiveStats();
  updateTimerDisplay(state.duration, state.duration);
  removeWarnings();
}

// ---- RENDER TEXT ----
function renderText() {
  const disp = document.getElementById('text-display');
  disp.innerHTML = state.text.map((ch, i) => {
    let cls = 'pending';
    if(i < state.pos) cls = (state.input[i] === ch) ? 'correct' : 'wrong';
    else if(i === state.pos) cls = 'current';
    const display = ch === ' ' ? '&nbsp;' : ch;
    return `<span class="char ${cls}" id="c${i}">${display}</span>`;
  }).join('');
  // Scroll into view
  const cur = document.getElementById('c'+state.pos);
  if(cur) cur.scrollIntoView({block:'nearest', inline:'nearest'});
}

// ---- TIMER ----
function startTest() {
  state.started = true;
  state.startTime = Date.now();
  if(state.mode === 'time') {
    state.timeLeft = state.duration;
    state.timer = setInterval(() => {
      state.timeLeft--;
      updateTimerDisplay(state.timeLeft, state.duration);
      updateLiveStats();
      if(state.timeLeft <= 0) finishTest();
    }, 1000);
  } else {
    state.timer = setInterval(() => { 
      updateLiveStats(); 
    }, 500);
  }
}

function updateTimerDisplay(left, total) {
  const el = document.getElementById('timer-display');
  const circle = document.getElementById('timer-circle');
  if(state.mode === 'time') {
    el.textContent = left;
    const circ = 226;
    const offset = circ * (1 - left/total);
    circle.style.strokeDashoffset = offset;
  } else {
    const elapsed = state.started ? Math.floor((Date.now()-state.startTime)/1000) : 0;
    el.textContent = elapsed+'s';
    circle.style.strokeDashoffset = 0;
  }
}

function updateLiveStats() {
  const elapsed = state.started ? (Date.now()-state.startTime)/1000/60 : 0;
  const wpm = elapsed > 0 ? Math.round((state.correct/5)/elapsed) : 0;
  const total = state.correct + state.errors;
  const acc = total > 0 ? Math.round(state.correct/total*100) : 100;
  document.getElementById('live-wpm').textContent = wpm;
  document.getElementById('live-acc').textContent = acc+'%';
}

// ---- FINISH ----
function finishTest() {
  if(state.finished) return;
  state.finished = true;
  clearInterval(state.timer);

  const elapsed = (Date.now()-state.startTime)/1000/60;
  const wpm = Math.round((state.correct/5)/elapsed);
  const total = state.correct+state.errors;
  const acc = total > 0 ? Math.round(state.correct/total*100) : 100;
  const dur = state.mode==='time' ? state.duration+'s' : state.wordCount+' wd';

  // Show results
  document.getElementById('res-wpm').textContent = wpm;
  document.getElementById('res-acc').textContent = acc+'%';
  document.getElementById('res-correct').textContent = state.correct;
  document.getElementById('res-errors').textContent = state.errors;
  document.getElementById('results-overlay').classList.add('show');

  // Save to history
  state.history.unshift({
    wpm, acc, dur, lang: state.lang.toUpperCase(),
    date: new Date().toLocaleDateString('en-CA')
  });
  if(state.history.length > 50) state.history = state.history.slice(0,50);
  save();
  updateHomeStats();
}

function closeResults() {
  document.getElementById('results-overlay').classList.remove('show');
}

function restartTest() {
  closeResults();
  generateText();
  setTimeout(focusInput, 50);
}

// ---- STATS ----
function updateHomeStats() {
  if(!state.history.length) return;
  const best = Math.max(...state.history.map(h=>h.wpm));
  const bestAcc = Math.max(...state.history.map(h=>h.acc));
  document.getElementById('hs-wpm').textContent = best;
  document.getElementById('hs-acc').textContent = bestAcc+'%';
  document.getElementById('hs-tests').textContent = state.history.length;
}

function renderStats() {
  if(!state.history.length) {
    document.getElementById('no-history').style.display = 'block';
    document.querySelector('#page-stats table').style.display = 'none';
  } else {
    document.getElementById('no-history').style.display = 'none';
    document.querySelector('#page-stats table').style.display = 'table';
    const best = Math.max(...state.history.map(h=>h.wpm));
    const avg = Math.round(state.history.reduce((a,h)=>a+h.wpm,0)/state.history.length);
    const bestAcc = Math.max(...state.history.map(h=>h.acc));
    document.getElementById('s-best-wpm').textContent = best;
    document.getElementById('s-avg-wpm').textContent = avg;
    document.getElementById('s-best-acc').textContent = bestAcc+'%';
    document.getElementById('s-total').textContent = state.history.length;
    document.getElementById('history-body').innerHTML = state.history.map((h,i)=>`
      <tr>
        <td>${i+1}</td>
        <td style="font-weight: 700; font-family: monospace;">${h.wpm}</td>
        <td>${h.acc}%</td>
        <td>${h.dur}</td>
        <td>${h.lang}</td>
        <td>${h.date}</td>
      </tr>
    `).join('');
  }
}

function clearStats() {
  if(confirm(t('settings_clear_confirm'))) {
    state.history = [];
    save();
    renderStats();
    updateHomeStats();
  }
}

// ---- SETTINGS ----
function renderSettings() {
  document.getElementById('toggle-punct').className = 'toggle'+(state.settings.punct?' on':'');
  document.getElementById('toggle-nums').className = 'toggle'+(state.settings.nums?' on':'');
  document.getElementById('toggle-sound').className = 'toggle'+(state.settings.sound?' on':'');
}

function toggleSetting(key) {
  state.settings[key] = !state.settings[key];
  renderSettings();
  save();
  if(key === 'punct' || key === 'nums') restartTest();
}

function changeFontSize(v) {
  document.getElementById('text-display').style.fontSize = v+'rem';
}
