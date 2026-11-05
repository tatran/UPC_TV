/**
 * UPC TV - Windows HLS Movie Bridge
 * Translates the remote 5.1 GB MP4 stream into a live HLS stream on your local network
 * so Samsung Smart TV can play it smoothly with 0% CPU overhead.
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const PORT = 3001;
// Keep HLS chunks in Temp directory so tz build does not package them into the WGT
const HLS_DIR = path.join(os.tmpdir(), 'upc_tv_hls');

// Find local network IP (skipping link-local 169.254.x.x)
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  let fallback = '127.0.0.1';
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (!iface.address.startsWith('169.254.')) {
          return iface.address;
        }
        fallback = iface.address;
      }
    }
  }
  return fallback;
}

const LOCAL_IP = getLocalIp();

// Clean and prepare HLS directory
if (fs.existsSync(HLS_DIR)) {
  fs.rmSync(HLS_DIR, { recursive: true, force: true });
}
fs.mkdirSync(HLS_DIR, { recursive: true });

// Copy subtitles
const vttSrc = path.join(__dirname, '..', 'UPC_TV', 'subtitles', 'amziah-king-cs.vtt');
if (fs.existsSync(vttSrc)) {
  fs.copyFileSync(vttSrc, path.join(HLS_DIR, 'subtitles.vtt'));
}

const app = express();
app.use(cors());

let ffmpegErrorMsg = null;

// Serve HLS files with proper MIME types and CORS
app.use('/hls', express.static(HLS_DIR, {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (filePath.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache');
    } else if (filePath.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    } else if (filePath.endsWith('.vtt')) {
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    }
  }
}));

app.get('/', (req, res) => {
  const m3u8Exists = fs.existsSync(path.join(HLS_DIR, 'movie.m3u8'));
  const segments = fs.existsSync(HLS_DIR) ? fs.readdirSync(HLS_DIR).filter(f => f.endsWith('.ts')).length : 0;
  res.send(`
    <html>
      <head><meta charset="utf-8"><title>UPC TV - HLS Bridge</title></head>
      <body style="font-family: sans-serif; padding: 30px; background: #121212; color: #fff;">
        <h1>🎬 UPC TV - HLS Movie Bridge</h1>
        <p><strong>Status:</strong> ${m3u8Exists ? '🟢 Pripravené na prehrávanie' : '🔴 Čaká sa na film (m3u8 chýba)'}</p>
        <p><strong>Pripravených segmentov:</strong> ${segments}</p>
        <p><strong>Stream URL pre TV:</strong> <code>http://${LOCAL_IP}:${PORT}/hls/movie.m3u8</code></p>
        ${ffmpegErrorMsg ? `<div style="background: #500; padding: 15px; border-radius: 6px; margin: 20px 0;"><strong>Chyba:</strong> ${ffmpegErrorMsg}</div>` : ''}
        <hr style="border: 0; border-top: 1px solid #444; margin: 30px 0;">
        <h3>💡 Ako film spustiť:</h3>
        <p>Ak máte film stiahnutý v PC, uložte ho ako: <br><code>C:\\VS\\AI\\UPC_TV_Bridge\\movie.mp4</code></p>
        <p>Mostík ho z disku rozseká na HLS za cca 5 sekúnd a film bude na TV okamžite funkčný!</p>
      </body>
    </html>
  `);
});

app.get('/hls/movie.m3u8', (req, res, next) => {
  const m3u8Path = path.join(HLS_DIR, 'movie.m3u8');
  if (!fs.existsSync(m3u8Path)) {
    return res.status(503).send(`[HLS Bridge] movie.m3u8 zatiaľ nie je pripravený. ${ffmpegErrorMsg || 'Zdrojový stream na CDN expiroval (402 Payment Required).'}`);
  }
  next();
});

app.get('/status', (req, res) => {
  const m3u8Exists = fs.existsSync(path.join(HLS_DIR, 'movie.m3u8'));
  const segments = fs.existsSync(HLS_DIR) ? fs.readdirSync(HLS_DIR).filter(f => f.endsWith('.ts')).length : 0;
  res.json({
    ready: m3u8Exists && segments > 0,
    segments: segments,
    error: ffmpegErrorMsg,
    streamUrl: `http://${LOCAL_IP}:${PORT}/hls/movie.m3u8`,
    subtitlesUrl: `http://${LOCAL_IP}:${PORT}/hls/subtitles.vtt`
  });
});

let ffmpegProcess = null;

function startFfmpeg() {
  let ffmpegPath = 'ffmpeg';
  try {
    const installer = require('@ffmpeg-installer/ffmpeg');
    if (installer && installer.path && fs.existsSync(installer.path)) {
      ffmpegPath = installer.path;
    }
  } catch (e) { }

  const remoteUrl = 'https://prg-c3-storage6.premiumcdn.net/188233588/zGpt63HrzSQyFA0SdaUb2HJEt7pupaC8lsekU69sYpfD3hDlHK6SVbS1gs0GcLDH70SmjsWQFbxszRiv1SlBUjZIp8Tr7Tb0h9BIdZCD5SkyhQBsjrIv4.mp4?token=9Kv3tL7YfAqC&expires=1793785103&sparams=token%2Cpath%2Cexpires%2Climitsize%2Climitid&limitsize=5120341779&limitid=0b193b1526828a16c10991f835889433&signature=fff5e77ce82c8a2b30e1460971deed8eadd98b9a';

  const localFile = path.join(__dirname, 'movie.mp4');
  let inputSource = remoteUrl;
  if (fs.existsSync(localFile)) {
    console.log('[FFMPEG] Zistený lokálny súbor: ' + localFile);
    inputSource = localFile;
  } else {
    console.log('[FFMPEG] Používam vzdialenú stream URL...');
  }

  console.log('[FFMPEG] Spúšťam remuxovanie MP4 na HLS segmenty...');
  console.log('[FFMPEG] Použitý ffmpeg: ' + ffmpegPath);
  console.log('[FFMPEG] Režim: Stream Copy (-c copy) -> 0% záťaž procesora');

  const args = [
    '-y',
    '-i', inputSource,
    '-c', 'copy',
    '-hls_time', '4',
    '-hls_list_size', '0',
    '-hls_playlist_type', 'event',
    '-hls_flags', 'temp_file',
    '-hls_segment_filename', path.join(HLS_DIR, 'segment_%04d.ts'),
    path.join(HLS_DIR, 'movie.m3u8')
  ];

  ffmpegProcess = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });

  let stderrLog = '';
  ffmpegProcess.stderr.on('data', (data) => {
    const str = data.toString();
    stderrLog += str;
    if (str.includes('402 Payment Required') || str.includes('402')) {
      ffmpegErrorMsg = 'Webshare/PremiumCDN vrátila: 402 Payment Required (vypršaný alebo prečerpaný token na direct link)';
      console.error('\n[CHYBA] ' + ffmpegErrorMsg);
    }
    const matchSpeed = str.match(/speed=\s*([\d\.]+)x/);
    const matchTime = str.match(/time=([\d:\.]+)/);
    if (matchSpeed || matchTime) {
      process.stdout.write(`\r[Priebeh] Pripravené: ${matchTime ? matchTime[1] : '...'} (Rýchlosť: ${matchSpeed ? matchSpeed[1] : '?'}x)   `);
    }
  });

  ffmpegProcess.on('error', (err) => {
    ffmpegErrorMsg = 'Chyba procesu: ' + err.message;
    console.error('\n[FFMPEG] Chyba procesu:', err);
  });

  ffmpegProcess.on('close', (code) => {
    if (code === 0) {
      console.log(`\n[FFMPEG] Celý film bol úspešne prevedený do HLS (kód: 0).`);
    } else {
      console.error(`\n[FFMPEG] Proces skončil s kódom ${code}.`);
      if (stderrLog.includes('402')) {
        console.error('>> DÔVOD: Webshare link expiroval (402 Payment Required).');
        console.error('>> RIEŠENIE: Uložte stiahnutý film ako "movie.mp4" do C:\\VS\\AI\\UPC_TV_Bridge\\movie.mp4, alebo vygenerujte nový link.');
      }
    }
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log('================================================================');
  console.log(`   🎬 UPC TV - Windows HLS Movie Bridge Server beží!          `);
  console.log('================================================================');
  console.log(`📡 Lokálna IP:       ${LOCAL_IP}`);
  console.log(`📺 HLS Stream URL:    http://${LOCAL_IP}:${PORT}/hls/movie.m3u8`);
  console.log(`💬 Titulky VTT:       http://${LOCAL_IP}:${PORT}/hls/subtitles.vtt`);
  console.log('================================================================\n');

  startFfmpeg();
});

process.on('SIGINT', () => {
  if (ffmpegProcess) {
    try { ffmpegProcess.kill(); } catch (e) { }
  }
  process.exit();
});
