const fs = require('fs');
const path = require('path');

// Simple logger that writes to a file and console
const logFile = path.join(__dirname, 'logs', 'app.log');

if (!fs.existsSync(path.dirname(logFile))) {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
}

function log(level, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

    // Write to file
    fs.appendFileSync(logFile, logEntry);

    // Also log to console
    console.log(logEntry.trim());
}

module.exports = {
    info: (message) => log('info', message),
    warn: (message) => log('warn', message),
    error: (message) => log('error', message)
};
