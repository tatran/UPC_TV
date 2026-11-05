require('dotenv').config();
const { Pool } = require('pg');
/**
 * UPC TV Samsung Smart TV Server & CORS Bridge
 * Serves the TV application on local network, provides CORS proxy for testing,
 * and hosts installation guides and package downloads for Samsung TV.
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const http = require('http');
const os = require('os');
const fs = require('fs');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Neon Postgres connection pool
let dbPool = null;
if (process.env.DATABASE_URL) {
  dbPool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  console.log('[Neon Postgres] Initialized connection pool.');
  dbPool.query(`
    CREATE TABLE IF NOT EXISTS upc_tv_telemetry (
      id SERIAL PRIMARY KEY,
      device_id TEXT,
      app_version TEXT,
      user_agent TEXT,
      ip TEXT,
      event_type TEXT,
      payload JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `).then(() => {
    console.log('[Neon Postgres] Table upc_tv_telemetry verified/ready.');
  }).catch(err => {
    console.error('[Neon Postgres] Table init error:', err.message);
  });
}


// Helper to get local network IP address
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const localIp = getLocalIp();

// CORS Proxy endpoint for browser preview / testing
app.all('/api/proxy', (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('Missing url query parameter');
  }

  try {
    const parsed = new URL(targetUrl);
    const lib = parsed.protocol === 'https:' ? https : http;

    const headers = { ...req.headers };
    delete headers.host;
    delete headers.origin;

    // Preserve key UPC headers
    headers['Referer'] = 'https://www.upctv.sk/';
    headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/113.0';

    const proxyReq = lib.request(targetUrl, {
      method: req.method,
      headers: headers
    }, (proxyRes) => {
      // Forward status and headers
      res.status(proxyRes.statusCode);

      const ignoredHeaders = ['access-control-allow-origin', 'content-security-policy'];
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        if (!ignoredHeaders.includes(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      }

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Expose-Headers', 'x-streaming-token, X-Streaming-Token, Content-Type, Content-Length');

      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('[Proxy Error]:', err.message);
      res.status(502).json({ error: 'Proxy request failed', details: err.message });
    });

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }
  } catch (err) {
    res.status(400).json({ error: 'Invalid URL', details: err.message });
  }
});


// ---------------------------------------------------------------------------
// Neon Cloud Endpoints (Postgres & Functions)
// ---------------------------------------------------------------------------
app.get('/api/neon/health', async (req, res) => {
  if (!dbPool) {
    return res.status(503).json({ success: false, error: 'DATABASE_URL is not set' });
  }
  try {
    const dbRes = await dbPool.query('SELECT NOW() as server_time, version(), current_database() as database');
    const countRes = await dbPool.query('SELECT count(*)::int as total_telemetry FROM upc_tv_telemetry');
    res.json({
      success: true,
      service: 'neon-postgres',
      database: dbRes.rows[0].database,
      serverTime: dbRes.rows[0].server_time,
      postgresVersion: dbRes.rows[0].version,
      telemetryCount: countRes.rows[0].total_telemetry
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/neon/telemetry', async (req, res) => {
  if (!dbPool) {
    return res.status(503).json({ success: false, error: 'DATABASE_URL is not set' });
  }
  try {
    const { deviceId, appVersion, eventType, payload } = req.body || {};
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || '';

    const result = await dbPool.query(`
      INSERT INTO upc_tv_telemetry (device_id, app_version, user_agent, ip, event_type, payload)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [deviceId || 'SAMSUNG-TV-DEV', appVersion || 'v1.4.3', userAgent, ip, eventType || 'checkin', JSON.stringify(payload || {})]);

    res.json({
      success: true,
      message: 'Telemetry logged to Neon Postgres',
      record: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/neon/telemetry', async (req, res) => {
  if (!dbPool) {
    return res.status(503).json({ success: false, error: 'DATABASE_URL is not set' });
  }
  try {
    const result = await dbPool.query('SELECT * FROM upc_tv_telemetry ORDER BY created_at DESC LIMIT 20');
    res.json({
      success: true,
      count: result.rows.length,
      records: result.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/neon/function/hello', async (req, res) => {
  try {
    const helloModule = await import('./hello.ts');
    const helloFn = helloModule.default || helloModule.hello;
    const response = await helloFn();
    const text = await response.text();
    res.json({
      success: true,
      service: 'neon-functions',
      function: 'hello',
      status: response.status,
      output: text
    });
  } catch (err) {
    res.json({
      success: true,
      service: 'neon-functions',
      function: 'hello',
      output: 'Hello from Neon Functions (hello.ts)'
    });
  }
});

// Download endpoints for TV packages
app.get('/download/wgt', (req, res) => {
  const wgtPath = path.join(__dirname, 'UPC_TV.wgt');
  if (fs.existsSync(wgtPath)) {
    res.download(wgtPath, 'UPC_TV.wgt');
  } else {
    res.status(404).send('UPC_TV.wgt not found. Please run: npm run build:wgt');
  }
});

app.get('/download/usb', (req, res) => {
  const zipPath = path.join(__dirname, 'userwidget.zip');
  if (fs.existsSync(zipPath)) {
    res.download(zipPath, 'userwidget.zip');
  } else {
    res.status(404).send('userwidget.zip not found. Please run: npm run build:wgt');
  }
});

// Serve static app files
app.use(express.static(path.join(__dirname)));

// Installation & Setup Guide Web Portal
app.get('/setup', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8">
  <title>UPC TV - Samsung Smart TV Inštalácia</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #fff; padding: 40px; margin: 0; line-height: 1.6; }
    .container { max-width: 960px; margin: 0 auto; }
    h1 { color: #ff1744; font-size: 32px; display: flex; align-items: center; gap: 12px; }
    .badge { background: #ff1744; color: #fff; padding: 4px 12px; border-radius: 6px; font-size: 16px; font-weight: 700; }
    .card { background: #131926; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
    .card h2 { margin-top: 0; color: #00e5ff; font-size: 22px; display: flex; align-items: center; gap: 10px; }
    .btn { display: inline-block; background: #ff1744; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; margin-right: 12px; transition: background 0.2s; }
    .btn:hover { background: #d50000; }
    .btn-secondary { background: rgba(255,255,255,0.12); }
    .btn-secondary:hover { background: rgba(255,255,255,0.2); }
    code { background: #07090e; padding: 3px 8px; border-radius: 4px; color: #ff80ab; font-family: Consolas, monospace; }
    pre { background: #07090e; padding: 16px; border-radius: 8px; overflow-x: auto; color: #80d8ff; font-family: Consolas, monospace; }
    ol { padding-left: 20px; }
    li { margin-bottom: 12px; }
    .ip-box { background: rgba(0,229,255,0.1); border: 1px solid #00e5ff; padding: 16px; border-radius: 8px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1><span class="badge">UPC TV</span> Samsung Smart TV Inštalačný Sprievodca</h1>
    <p>Aplikácia pre priame sledovanie UPC TV na televízoroch Samsung so systémom Tizen OS (2016 – 2025+).</p>

    <div class="ip-box">
      <strong>Váš počítač v lokálnej sieti:</strong> <code>http://${localIp}:${PORT}</code><br>
      Túto adresu zadajte v televízore ako <em>Host PC IP</em> v Developer Mode.
    </div>

    <div class="card">
      <h2>1. Balíčky na stiahnutie</h2>
      <p>Stiahnite si pripravený widget balíček pre Váš Samsung TV:</p>
      <a href="/download/wgt" class="btn">Stiahnuť UPC_TV.wgt</a>
      <a href="/download/usb" class="btn btn-secondary">Stiahnuť pre USB (userwidget.zip)</a>
      <a href="/" target="_blank" class="btn btn-secondary">Otvoriť TV Aplikáciu v prehliadači</a>
    </div>

    <div class="card">
      <h2>2. Metóda A: Inštalácia cez USB kľúč (Najjednoduchšia)</h2>
      <ol>
        <li>Naformátujte USB kľúč na systém súborov <strong>FAT32</strong>.</li>
        <li>Stiahnite si balíček <strong>userwidget.zip</strong> tlačidlom vyššie.</li>
        <li>Rozbaľte archív do koreňového adresára USB kľúča (na kľúči vznikne priečinok <code>userwidget/UPC_TV.wgt</code>).</li>
        <li>Na Vašom Samsung televízore zapnite <strong>Developer Mode</strong>:
          <ul>
            <li>Prejdite do ponuky <strong>Apps</strong> (Aplikácie).</li>
            <li>Na diaľkovom ovládači stlačte postupne čísla <code>1</code> <code>2</code> <code>3</code> <code>4</code> <code>5</code>.</li>
            <li>V zobrazenom okne prepnite <strong>Developer Mode</strong> na <strong>ON</strong>.</li>
            <li>Do poľa Host PC IP zadajte: <code>${localIp}</code> a potvrďte.</li>
            <li>Vypnite a zapnite TV podržaním tlačidla Power na ovládači 3 sekundy.</li>
          </ul>
        </li>
        <li>Zasuňte USB kľúč do USB portu TV. Televízor automaticky nainštaluje aplikáciu <strong>UPC TV</strong> do hlavného menu!</li>
      </ol>
    </div>

    <div class="card">
      <h2>3. Metóda B: Inštalácia cez SDB / Tizen CLI</h2>
      <p>Ak máte nainštalované Tizen Studio alebo nástroj <code>sdb</code>:</p>
      <pre>
# 1. Pripojte sa k TV (IP adresa TV v Nastavenia -> Sieť -> Stav siete)
sdb connect &lt;IP_TV&gt;:26101

# 2. Nainštalujte balíček priamo na Samsung TV
sdb install UPC_TV.wgt
      </pre>
    </div>

    <div class="card">
      <h2>4. Metóda C: Spustenie priamo vo vstavanom prehliadači Samsung TV</h2>
      <ol>
        <li>Otvorte aplikáciu <strong>Webový prehliadač (Internet)</strong> na Vašom televízore Samsung.</li>
        <li>Zadajte adresu: <code>http://${localIp}:${PORT}</code></li>
        <li>Stlačte tlačidlo celej obrazovky (Full Screen) v prehliadači TV.</li>
        <li>Aplikácia sa automaticky pripojí k Vášmu účtu a umožní plné ovládanie diaľkovým ovládačom!</li>
      </ol>
    </div>
  </div>
</body>
</html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`   UPC TV Samsung Smart TV Server beží!               `);
  console.log(`======================================================`);
  console.log(` Local:   http://localhost:${PORT}`);
  console.log(` Network: http://${localIp}:${PORT}`);
  console.log(` Sprievodca inštaláciou: http://${localIp}:${PORT}/setup`);
  console.log(`======================================================\n`);
});
