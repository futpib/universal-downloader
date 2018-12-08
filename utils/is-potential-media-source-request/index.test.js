
import test from 'ava';

import { isPotentialMediaSourceRequest } from '.';

const macro = (t, details, expected) => {
	t.is(isPotentialMediaSourceRequest(details), expected);
};

test(macro, {
	url: 'https://video.twimg.com/ext_tw_video/1070282234421264384/pu/pl/654x480/ynoieR2lJrjRHF9j.m3u8',
	type: 'xmlhttprequest',
}, true);
