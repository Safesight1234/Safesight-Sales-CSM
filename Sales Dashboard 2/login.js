/* ============================================================
   Login gate — single password, session-based.
   Note: this is a client-side gate (the password lives in the
   shipped JS), so it deters casual access but is not strong
   security. For real protection, put the site behind Netlify's
   password protection or an Identity/Access rule.
   ============================================================ */
(function () {
  var PASSWORD = 'lEidTlhN7Lg#Xs6%';
  var KEY = 'safesight_auth_v1';

  var login = document.getElementById('login');
  var root = document.getElementById('root');

  function reveal() {
    if (login) login.hidden = true;
    if (root) root.hidden = false;
    document.documentElement.classList.remove('locked');
  }

  // already unlocked this session?
  try {
    if (sessionStorage.getItem(KEY) === '1') { reveal(); return; }
  } catch (e) {}

  // show the gate
  document.documentElement.classList.add('locked');
  if (login) login.hidden = false;
  if (root) root.hidden = true;

  function init() {
    var form = document.getElementById('login-form');
    var pw = document.getElementById('login-pw');
    var err = document.getElementById('login-error');
    var toggle = document.getElementById('login-toggle');
    if (!form) return;

    if (pw) setTimeout(function () { pw.focus(); }, 100);

    if (toggle && pw) {
      toggle.addEventListener('click', function () {
        pw.type = pw.type === 'password' ? 'text' : 'password';
        toggle.classList.toggle('on', pw.type === 'text');
      });
    }

    if (pw && err) pw.addEventListener('input', function () { err.hidden = true; });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (pw && pw.value === PASSWORD) {
        try { sessionStorage.setItem(KEY, '1'); } catch (e2) {}
        reveal();
      } else {
        if (err) err.hidden = false;
        if (pw) { pw.value = ''; pw.focus(); }
        var card = document.querySelector('.login-card');
        if (card) { card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); }
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
