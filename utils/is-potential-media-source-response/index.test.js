
import { randomBytes } from 'crypto';

import test from 'ava';

import { isPotentialMediaSourceResponse } from '.';

const macro = (t, details, expected) => {
	const start = Date.now();
	t.is(isPotentialMediaSourceResponse(details), expected);
	const end = Date.now();
	t.true(end - start < 100, 'check took too long');
};

test('content type', macro, {
	url: 'test:',
	responseHeaders: [
		{
			name: 'content-type',
			value: 'application/x-mpegURL',
		},
	],
}, true);

test('.m3u8', macro, {
	url: 'https://video.twimg.com/ext_tw_video/1070282234421264384/pu/pl/244x180/UgAuIUfF15dzYVnu.m3u8',
	type: 'xmlhttprequest',
	responseHeaders: [],
}, true);

test('long data url', macro, {
	url: 'data:' + randomBytes(2 ** 23).toString('base64'),
	type: 'xmlhttprequest',
	responseHeaders: [],
}, false);

test('long http url', macro, {
	url: 'http://test/' + randomBytes(2 ** 23).toString('base64'),
	type: 'xmlhttprequest',
	responseHeaders: [],
}, false);
