
import { randomBytes } from 'crypto';

import test from 'ava';

import { isPotentialMediaSourceRequest } from '.';

const macro = (t, details, expected) => {
	const start = Date.now();
	t.is(isPotentialMediaSourceRequest(details), expected);
	const end = Date.now();
	t.true(end - start < 100, 'check took too long');
};

test('.m3u8', macro, {
	url: 'https://video.twimg.com/ext_tw_video/1070282234421264384/pu/pl/654x480/ynoieR2lJrjRHF9j.m3u8',
	type: 'xmlhttprequest',
}, true);

test('long data url', macro, {
	url: 'data:' + randomBytes(2 ** 23).toString('base64'),
	type: 'xmlhttprequest',
}, false);

test('long http url', macro, {
	url: 'http://test/' + randomBytes(2 ** 23).toString('base64'),
	type: 'xmlhttprequest',
}, false);
