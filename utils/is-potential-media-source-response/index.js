
const path = require('path');
const { URL } = require('whatwg-url');
const { m3uExtensions } = require('../is-potential-media-source-request');

const m3uContentTypes = new Set([
	'application/x-mpegURL',
]);

const isPotentialMediaSourceResponse = details => {
	const { url, type } = details;
	const { pathname } = new URL(url);
	const extname = path.extname(pathname);

	if (type === 'xmlhttprequest' && m3uExtensions.has(extname)) {
		return true;
	}

	const contentTypeHeader = details.responseHeaders
		.find(({ name }) => name.toLowerCase() === 'content-type');

	if (contentTypeHeader && m3uContentTypes.has(contentTypeHeader.value)) {
		return true;
	}

	return false;
};

module.exports = { isPotentialMediaSourceResponse };
