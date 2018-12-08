
const path = require('path');
const { URL } = require('whatwg-url');

const m3uExtensions = new Set([
	'.m3u',
	'.m3u8',
]);

const isPotentialMediaSourceRequest = details => {
	const { url, type } = details;
	const { pathname } = new URL(url);
	const extname = path.extname(pathname);

	if (type === 'xmlhttprequest' && m3uExtensions.has(extname)) {
		return true;
	}

	return false;
};

module.exports = { isPotentialMediaSourceRequest, m3uExtensions };
