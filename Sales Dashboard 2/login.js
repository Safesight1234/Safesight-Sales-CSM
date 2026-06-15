/* ============================================================
   Login gate — single password, session-based.
   Note: this is a client-side gate (the password lives in the
   shipped JS), so it deters casual access but is not strong
   security. For real protection, use Netlify password protection.
   ============================================================ */
(function () {
  var PASSWORD = 'lEidTlhN7Lg#Xs6%';
  var KEY = 'safesight_auth_v1';

  function $(id) { return document.getElementById(id); }
  var login = $('login');
  var root = $('root');

  function reveal() {
    if (login) login.hidden = true;
    if (root) root.hidden = false;
    document.documentElement.classList.remove('locked');
  }

  // already unlocked this session?
  var unlocked = false;
  try { unlocked = sessionStorage.getItem(KEY) === '1'; } catch (e) {}
  if (unlocked) { reveal(); return; }

  // show the gate
  document.documentElement.classList.add('locked');
  if (login) login.hidden = false;
  if (root) root.hidden = true;

  function tryUnlock() {
    var pw = $('login-pw');
    var err = $('login-error');
    var entered = pw ? String(pw.value).trim() : '';
    if (entered === PASSWORD) {
      try { sessionStorage.setItem(KEY, '1'); } catch (e2) {}
      reveal();
      return true;
    }
    if (err) err.hidden = false;
    if (pw) { pw.value = ''; pw.focus(); }
    var card = document.querySelector('.login-card');
    if (card) { card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); }
    return false;
  }

  function wire() {
    var form = $('login-form');
    var pw = $('login-pw');
    var err = $('login-error');
    var toggle = $('login-toggle');
    var btn = document.querySelector('.login-btn');
    if (!form) { return false; }

    // primary: form submit (covers Enter key + button)
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      e.stopPropagation();
      tryUnlock();
      return false;
    });
    // belt-and-braces: direct button click
    if (btn) btn.addEventListener('click', function (e) { e.preventDefault(); tryUnlock(); });
    // Enter inside the field
    if (pw) pw.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); tryUnlock(); } });

    if (pw && err) pw.addEventListener('input', function () { err.hidden = true; });
    if (toggle && pw) toggle.addEventListener('click', function () {
      pw.type = pw.type === 'password' ? 'text' : 'password';
      toggle.classList.toggle('on', pw.type === 'text');
    });
    if (pw) setTimeout(function () { try { pw.focus(); } catch (e) {} }, 80);
    return true;
  }

  // The form markup sits ABOVE this script, so it already exists — wire now.
  if (!wire()) {
    // fallback if somehow not ready yet
    document.addEventListener('DOMContentLoaded', wire);
  }
})();
