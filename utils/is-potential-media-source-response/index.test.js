
import test from 'ava';

import { isPotentialMediaSourceResponse } from '.';

const macro = (t, details, expected) => {
	t.is(isPotentialMediaSourceResponse(details), expected);
};

test(macro, {
	url: 'test:',
	responseHeaders: [
		{
			name: 'content-type',
			value: 'application/x-mpegURL',
		},
	],
}, true);

test(macro, {
	url: 'https://video.twimg.com/ext_tw_video/1070282234421264384/pu/pl/244x180/UgAuIUfF15dzYVnu.m3u8',
	type: 'xmlhttprequest',
}, true);
