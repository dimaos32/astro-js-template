import { styleText } from 'node:util';

const UNKNOWN_SOURCE = 'project logger';

const COLORS = {
  info: {
    time: 'gray',
    source: 'blue',
    message: 'white',
  },
  success: {
    time: 'gray',
    source: 'blue',
    message: 'green',
  },
  warn: {
    time: ['yellow', 'bold'],
    source: 'yellow',
    message: 'white',
  },
  error: {
    time: ['red', 'bold'],
    source: 'red',
    message: 'white',
  },
};

function formatTime() {
  const now = new Date();
  return now.toLocaleTimeString();
}

function colorize(part, type, text) {
  const style = COLORS[type]?.[part];
  if (!style) return text;

  if (Array.isArray(style)) {
    return style.reduce((colored, s) => styleText(s, colored), text);
  }
  return styleText(style, text);
}

function createLogger(source = UNKNOWN_SOURCE) {
  const log = (type, message) => {
    const timeStr = formatTime();
    const coloredTime = colorize('time', type, timeStr);
    const coloredSource = colorize('source', type, `[${source}]`);
    const coloredMessage = colorize('message', type, message);

    // eslint-disable-next-line no-console
    console.log(`${coloredTime} ${coloredSource} ${coloredMessage}`);
  };

  return {
    info: (message) => log('info', message),
    success: (message) => log('success', message),
    warn: (message) => log('warn', message),
    error: (message) => log('error', message),
  };
}

export { createLogger };
