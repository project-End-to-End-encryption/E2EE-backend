import { UAParser } from 'ua-parser-js';

export const getDeviceInfo = (userAgent = '') => {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    let deviceType = 'unknown';

    if (result.device.type === 'mobile') {
        deviceType = 'mobile';
    } else if (result.device.type === 'tablet') {
        deviceType = 'tablet';
    } else if (!result.device.type) {
        // UAParser normally doesn't provide a device type for desktops
        deviceType = 'desktop';
    }

    return {
        browser: result.browser.name || 'unknown',
        browserVersion: result.browser.version || 'unknown',

        os: result.os.name || 'unknown',
        osVersion: result.os.version || 'unknown',

        deviceType
    };
};