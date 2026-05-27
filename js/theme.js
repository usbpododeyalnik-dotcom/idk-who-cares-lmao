// ---- THEME MANAGEMENT ----
function initTheme() {
  const saved = state.settings.theme || 'dark';
  setTheme(saved);
}

function setTheme(theme) {
  state.settings.theme = theme;
  save();
  
  if (theme === 'light') {
    document.documentElement.classList.add('light-theme');
    document.getElementById('theme-light').classList.add('active');
    document.getElementById('theme-dark').classList.remove('active');
  } else {
    document.documentElement.classList.remove('light-theme');
    document.getElementById('theme-dark').classList.add('active');
    document.getElementById('theme-light').classList.remove('active');
  }
}
