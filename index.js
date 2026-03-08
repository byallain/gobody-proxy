const https = require('https');
const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3000;
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxWtnUf-ueRQA7UHdcXIVmtwoqbbeV-0HrU_onXg-6QFwKcTsfQLAhZT3nb_ZCVK-76/exec';

function follow(reqUrl, cb, redirects) {
  if (redirects > 10) return cb(new Error('too many redirects'), null);
  const mod = reqUrl.startsWith('https') ? https : http;
  mod.get(reqUrl, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      return follow(res.headers.location, cb, (redirects||0)+1);
    }
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => cb(null, data));
  }).on('error', (e) => cb(e, null));
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const email = parsed.query.email || '';

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const target = SCRIPT_URL + '?email=' + encodeURIComponent(email) + '&t=' + Date.now();

  follow(target, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ found: false, error: err.message }));
      return;
    }
    // Apps Script renvoie gobFallback({...}) — on extrait le JSON pur
    const match = data.match(/gobFallback\((.*)\)$/s) || data.match(/\w+\((.*)\)$/s);
    const json = match ? match[1] : data;
    res.writeHead(200);
    res.end(json);
  });
});

server.listen(PORT, () => console.log('GoBody proxy running on port ' + PORT));
