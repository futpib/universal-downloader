
const path = require('path');
const { URL } = require('whatwg-url');

const maxUrlLength = 2 ** 11;

const m3uExtensions = new Set([
	'.m3u',
	'.m3u8',
]);

const isPotentialMediaSourceRequest = details => {
	const { url, type } = details;

	if (url.length > maxUrlLength) {
		return false;
	}

	const { protocol, pathname } = new URL(url);

	if (protocol === 'data:') {
		return false;
	}

	const extname = path.extname(pathname);

	if (type === 'xmlhttprequest' && m3uExtensions.has(extname)) {
		return true;
	}

	return false;
};

module.exports = {
	isPotentialMediaSourceRequest,
	m3uExtensions,
	maxUrlLength,
};
