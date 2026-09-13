const translationSwitch = document.getElementById('translations');
const switchState = document.getElementById('switch-state');
const textSize = document.getElementById('text-size');

function setTranslations(visible) {
  translationSwitch.setAttribute('aria-checked', String(visible));
  switchState.textContent = visible ? 'On' : 'Off';
  document.querySelectorAll('.english').forEach(cell => { cell.hidden = !visible; });
}

// Preferences are optional: the app also works when browser storage is unavailable.
function savePreference(key, value) {
  try { localStorage.setItem(key, value); } catch (_) { /* Keep working without storage. */ }
}
try {
  setTranslations(localStorage.getItem('spanish-translations') !== 'false');
  const savedSize = localStorage.getItem('spanish-text-size');
  if (['standard', 'larger', 'largest'].includes(savedSize)) {
    textSize.value = savedSize;
    document.documentElement.dataset.textSize = savedSize;
  }
} catch (_) { /* Defaults are already visible. */ }

translationSwitch.addEventListener('click', () => {
  const visible = translationSwitch.getAttribute('aria-checked') !== 'true';
  setTranslations(visible);
  savePreference('spanish-translations', String(visible));
});
textSize.addEventListener('change', () => {
  document.documentElement.dataset.textSize = textSize.value;
  savePreference('spanish-text-size', textSize.value);
});
document.getElementById('definitions-link').addEventListener('click', () => {
  document.getElementById('definitions').focus();
});
