(function() {
  var overlay = null;
  function showError(msg) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'qo-crash-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#1a0000;color:#ff6b6b;font-family:monospace;font-size:12px;padding:30px;overflow:auto;z-index:99999;white-space:pre-wrap;word-break:break-all;display:flex;flex-direction:column;gap:20px;';
      
      var header = document.createElement('div');
      header.innerHTML = '<b style="font-size:18px;color:#fff;">QualityOpen CRASH REPORT</b><br/><span style="opacity:0.6;font-size:11px;">A critical error occurred during startup or runtime.</span>';
      overlay.appendChild(header);

      var actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:12px;';
      
      var btnReset = document.createElement('button');
      btnReset.innerText = 'Reset App Data (Recover)';
      btnReset.style.cssText = 'background:#e11d48;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;';
      btnReset.onclick = function() {
        if (confirm('This will clear local projects and settings to fix startup issues. Your items in the OS Keychain and License will remain. Continue?')) {
          localStorage.clear();
          indexedDB.deleteDatabase('qualityopen-db');
          indexedDB.deleteDatabase('qo_auth_v1');
          alert('Data cleared. The app will now reload.');
          location.reload();
        }
      };
      
      var btnCopy = document.createElement('button');
      btnCopy.innerText = 'Copy Error Report';
      btnCopy.style.cssText = 'background:#3f3f46;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;';
      btnCopy.onclick = function() {
        var text = overlay.innerText;
        navigator.clipboard.writeText(text).then(function() { alert('Copied to clipboard!'); });
      };

      var btnReload = document.createElement('button');
      btnReload.innerText = 'Reload App';
      btnReload.style.cssText = 'background:transparent;color:#a1a1aa;border:1px solid #3f3f46;padding:8px 16px;border-radius:6px;cursor:pointer;';
      btnReload.onclick = function() { location.reload(); };

      actions.appendChild(btnReset);
      actions.appendChild(btnCopy);
      actions.appendChild(btnReload);
      overlay.appendChild(actions);

      var logContainer = document.createElement('div');
      logContainer.id = 'qo-log-content';
      logContainer.style.cssText = 'flex:1;background:#030000;padding:15px;border-radius:8px;border:1px solid #330000;color:#fca5a5;';
      overlay.appendChild(logContainer);

      document.body.appendChild(overlay);
    }
    var log = document.getElementById('qo-log-content');
    if (log) log.innerHTML += msg + '\n\n';
  }

  window.onerror = function(msg, src, line, col, err) {
    showError('[onerror] ' + msg + '\n  at ' + src + ':' + line + ':' + col + '\n  ' + (err && err.stack ? err.stack : 'No stacktrace available'));
    return false;
  };

  window.addEventListener('unhandledrejection', function(e) {
    var r = e.reason;
    var detail = (r && r.stack) ? r.stack : String(r);
    var msg = (r && r.message) ? r.message : 'Unknown Promise Rejection';
    showError('[unhandledrejection] ' + msg + '\n' + detail);
  });

  console.log('[DIAG] Diagnostic overlay active');
})();
