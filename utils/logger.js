// utils/logger.js

const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, '../logs/app.log');

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFilePath, logMessage, 'utf8');
}

module.exports = { log };
