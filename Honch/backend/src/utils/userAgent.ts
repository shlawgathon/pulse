import UAParser from 'ua-parser-js';

export function parseUserAgent(userAgent: string) {
  const parser = new UAParser(userAgent);
  const browser = parser.getBrowser().name || 'Unknown';
  const os = parser.getOS().name || 'Unknown';
  const deviceType = parser.getDevice().type || 'desktop';
  return {
    browser,
    os,
    device: deviceType,
  };
}
