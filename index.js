const https = require('https');
const http = require('http');

const PORT = process.env.PORT || 3000;
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxWtnUf-ueRQA7UHdcXIVmtwoqbbeV-0HrU_onXg-6QFwKcTsfQLAhZT3nb_ZCVK-76/exec';

function fetchFollow(reqUrl, redirects, cb) {
  if (redirects > 10) return cb('too many redirects', null);
  const mod = reqUrl.startsWith('https') ? https : http;
  const req = mod.get(reqUrl, {
    headers: { 'User-Agent': 'GoBody-Proxy/1.0' }
  }, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      return fetchFollow(res.headers.location, redirects + 1, cb);
    }
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => cb(null, body));
  });
  req.on('error', e => cb(e.message, null));
  req.setTimeout(10000, () => { req.destroy(); cb('timeout', null); });
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const email = new URL(req.url, 'http://localhost').searchParams.get('email') || '';
  const target = SCRIPT_URL + '?email=' + encodeURIComponent(email) + '&callback=gobFallback&t=' + Date.now();

  fetchFollow(target, 0, (err, body) => {
    if (err || !body) {
      res.writeHead(500);
      res.end(JSON.stringify({ found: false }));
      return;
    }
    const m = body.match(/gobFallback\(([\s\S]*)\)\s*$/);
    res.writeHead(200);
    res.end(m ? m[1] : '{"found":false}');
  });
});

server.listen(PORT, () => console.log('Proxy OK port ' + PORT));
