import fs from 'fs';
import path from 'path';
import { OUTBOUND_SERVER_LOG_ENABLED } from '../config/config.js';

const LOG_FILE_PATH = path.resolve('./outboundserver.log'); // or use path.join(process.cwd(), ...)

export function logMessage(...args) {
  const timestamp = new Date().toISOString();
  console.log('Loggings', LOG_FILE_PATH);

  const message = args.map(arg => {
    try {
      return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
    } catch {
      return '[Unserializable Argument]';
    }
  }).join(' ');
  

  const fullMessage = `[${timestamp}] ${message}\n`;

  if (OUTBOUND_SERVER_LOG_ENABLED) {
    fs.appendFile(LOG_FILE_PATH, fullMessage, (err) => {
      if (err) {
        console.log('[Log Fallback]', fullMessage.trim());
        console.error('[Logger Error] Failed to write to log file:', err.message);
      }
    });
  } else {
    console.log(fullMessage.trim());
  }
}

// Test it once
logMessage("Logger test: should write this to outboundserver.log");
