const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'src-tauri', 'tauri.conf.json');
const rawConfig = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(rawConfig);

const thumbprint = process.env.TAURI_WINDOWS_CERT_THUMBPRINT;
const timestampUrl = process.env.TAURI_WINDOWS_TIMESTAMP_URL || 'http://timestamp.digicert.com';

if (thumbprint) {
  config.tauri = config.tauri || {};
  config.tauri.bundle = config.tauri.bundle || {};
  config.tauri.bundle.windows = config.tauri.bundle.windows || {};
  config.tauri.bundle.windows.certificateThumbprint = thumbprint;
  config.tauri.bundle.windows.timestampUrl = timestampUrl;
} else {
  console.warn('TAURI_WINDOWS_CERT_THUMBPRINT not set; skipping Windows code signing.');
}

fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
