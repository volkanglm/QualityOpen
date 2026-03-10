(function() {
  var overlay = null;
  function showError(msg) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#1a0000;color:#ff6b6b;font-family:monospace;font-size:12px;padding:20px;overflow:auto;z-index:99999;white-space:pre-wrap;word-break:break-all;';
      overlay.innerHTML = '<b style="font-size:16px">JS ERROR (production diagnostic)</b>\n\n';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML += msg + '\n\n';
  }
  window.onerror = function(msg, src, line, col, err) {
    showError('[onerror] ' + msg + '\n  at ' + src + ':' + line + ':' + col + '\n  ' + (err && err.stack ? err.stack : ''));
    return false;
  };
  window.addEventListener('unhandledrejection', function(e) {
    var r = e.reason;
    showError('[unhandledrejection] ' + (r && r.stack ? r.stack : String(r)));
  });
  console.log('[DIAG] Error handlers installed');
})();
