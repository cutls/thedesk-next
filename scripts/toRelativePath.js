const fs = require('fs')
const path = require('path')
const txt = "<script>const urlParams = new URLSearchParams(window.location.search);const at = urlParams.get('at');const link = `${at}migrate/v25.1.0.html?servers=${encodeURIComponent(localStorage.getItem('servers')) || ''}&accounts=${encodeURIComponent(localStorage.getItem('accounts')) || ''}&timelinesV2=${encodeURIComponent(localStorage.getItem('timelinesV2')) || ''}`;localStorage.clear();location.href = link;</script>"
function toRelativePath() {
    fs.writeFileSync(path.join(__dirname, '..', 'renderer', 'out', 'old.html'), txt)
}

toRelativePath()
