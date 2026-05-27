// ---- STATE ----
let state = {
  lang: 'uk',
  mode: 'time',
  duration: 15,
  wordCount: 25,
  text: [],
  input: '',
  pos: 0,
  started: false,
  finished: false,
  startTime: null,
  timer: null,
  timeLeft: 15,
  correct: 0,
  errors: 0,
  settings: { punct: false, nums: false, sound: true, theme: 'dark' },
  history: []
};

// Load saved data
try {
  const saved = localStorage.getItem('peretaip_v1');
  if (saved) {
    const d = JSON.parse(saved);
    state.history = d.history || [];
    state.settings = { ...state.settings, ...(d.settings || {}) };
  }
} catch(e){}

function save() {
  localStorage.setItem('peretaip_v1', JSON.stringify({ history: state.history, settings: state.settings }));
}
