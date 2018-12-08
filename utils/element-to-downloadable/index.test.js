
import test from 'ava';

import { JSDOM } from 'jsdom';

import { elementToDownloadable } from '.';

const macro = (t, html, expected) => {
	const dom = new JSDOM(html);
	const element = dom.window.document.querySelector('body > *');
	t.deepEqual(elementToDownloadable(element), expected);
};

test(macro, `
<video autoplay="" loop="" class="" style="max-width: 100%; min-height: 788px;" src="//i.imgur.com/pKthuCi.mp4"></video>
`, {
	tagName: 'VIDEO',
	sources: [ {
		src: '//i.imgur.com/pKthuCi.mp4',
	} ],
});

test(macro, `
<video preload="auto" playsinline="" poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">
	<source src="https://scontent-arn2-1.cdninstagram.com/vp/7c479b82755136b96bd4e4a035a7610a/5C0DA7F4/t50.12441-16/48170730_264376447551485_3483276043479845630_n.mp4?_nc_ht=scontent-arn2-1.cdninstagram.com" type="video/mp4; codecs=&quot;avc1.4D401E, mp4a.40.2&quot;">
	<source src="https://scontent-arn2-1.cdninstagram.com/vp/49df2c9fc916f32f16eaf6839d4b9186/5C0D90A0/t50.12441-16/47310246_1621096164702192_1740846305485601153_n.mp4?_nc_ht=scontent-arn2-1.cdninstagram.com" type="video/mp4; codecs=&quot;avc1.42E01E, mp4a.40.2&quot;">
</video>
`, {
	tagName: 'VIDEO',
	sources: [ {
		src: 'https://scontent-arn2-1.cdninstagram.com/vp/7c479b82755136b96bd4e4a035a7610a/5C0DA7F4/t50.12441-16/48170730_264376447551485_3483276043479845630_n.mp4?_nc_ht=scontent-arn2-1.cdninstagram.com',
		type: 'video/mp4; codecs="avc1.4D401E, mp4a.40.2"',
	}, {
		src: 'https://scontent-arn2-1.cdninstagram.com/vp/49df2c9fc916f32f16eaf6839d4b9186/5C0D90A0/t50.12441-16/47310246_1621096164702192_1740846305485601153_n.mp4?_nc_ht=scontent-arn2-1.cdninstagram.com',
		type: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
	} ],
});
