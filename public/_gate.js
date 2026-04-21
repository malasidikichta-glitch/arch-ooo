// Preview gate — shows a coming-soon overlay with password field on pages
// that include this script. Password unlock is cached per-session.
// To change the password, edit the PASSWORD constant below.
// To remove the gate (when the site is ready), remove the <script src="/_gate.js"></script>
// tag from each page (or just clear this file).

(function() {
  const PASSWORD = "xoxo";
  const STORAGE_KEY = "arch-preview-auth";

  if (sessionStorage.getItem(STORAGE_KEY) === "1") return;

  // Inject overlay on DOMContentLoaded
  const mount = () => {
    const style = document.createElement("style");
    style.textContent = `
      body.gate-locked { overflow: hidden; height: 100vh; }
      #preview-gate {
        position: fixed; inset: 0; z-index: 9999;
        background: #0f0f0f;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 24px; padding: 32px;
        font-family: 'Geist Mono', monospace; color: #e8e6e3;
      }
      #preview-gate.hidden { opacity: 0; visibility: hidden; pointer-events: none; transition: opacity 0.4s, visibility 0.4s; }
      #preview-gate .pg-mark {
        font-size: 10px; color: #4a4743; letter-spacing: 0.25em; text-transform: lowercase;
      }
      #preview-gate .pg-title {
        font-family: 'Instrument Serif', serif;
        font-size: clamp(56px, 12vw, 140px);
        line-height: 0.9; font-weight: 400; letter-spacing: -0.03em;
        text-align: center; color: #e8e6e3;
      }
      #preview-gate .pg-title em { font-style: italic; color: #8a8680; }
      #preview-gate .pg-sub {
        font-size: 11px; color: #8a8680;
        letter-spacing: 0.12em; text-transform: lowercase; margin-top: -8px;
      }
      #preview-gate form { display: flex; gap: 0; width: 100%; max-width: 260px; margin-top: 24px; }
      #preview-gate input {
        flex: 1; padding: 10px 12px;
        background: transparent; border: 1px solid rgba(255,255,255,0.1);
        border-right: none; color: #e8e6e3;
        font-family: 'Geist Mono', monospace; font-size: 12px; letter-spacing: 0.06em;
        outline: none;
      }
      #preview-gate input:focus { border-color: #8a8680; }
      #preview-gate input::placeholder { color: #4a4743; }
      #preview-gate button {
        padding: 10px 14px; background: transparent;
        border: 1px solid rgba(255,255,255,0.1); color: #8a8680;
        font-family: 'Geist Mono', monospace; font-size: 10px; letter-spacing: 0.12em;
        cursor: pointer; text-transform: lowercase;
        transition: border-color 0.2s, color 0.2s;
      }
      #preview-gate button:hover { border-color: #e8e6e3; color: #e8e6e3; }
      #preview-gate .pg-err {
        font-size: 10px; color: #ff5b4a;
        opacity: 0; transition: opacity 0.25s; height: 14px; letter-spacing: 0.06em;
      }
      #preview-gate .pg-err.show { opacity: 1; }
    `;
    document.head.appendChild(style);

    const el = document.createElement("div");
    el.id = "preview-gate";
    el.innerHTML = `
      <div class="pg-mark">— arch</div>
      <h1 class="pg-title">coming<br><em>soon</em></h1>
      <div class="pg-sub">work in progress</div>
      <form onsubmit="return window.__archGate(event)">
        <input type="password" id="pg-pw" placeholder="access" autocomplete="off" required>
        <button type="submit">enter</button>
      </form>
      <div class="pg-err" id="pg-err">access denied</div>
    `;
    document.body.classList.add("gate-locked");
    document.body.appendChild(el);

    window.__archGate = function(ev) {
      ev.preventDefault();
      const pw = document.getElementById("pg-pw").value;
      if (pw === PASSWORD) {
        sessionStorage.setItem(STORAGE_KEY, "1");
        document.getElementById("preview-gate").classList.add("hidden");
        document.body.classList.remove("gate-locked");
      } else {
        const err = document.getElementById("pg-err");
        err.classList.add("show");
        setTimeout(() => err.classList.remove("show"), 2000);
      }
      return false;
    };
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
