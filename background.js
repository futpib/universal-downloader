/* global browser, navigator */

const path = require('path');
const { URL } = require('whatwg-url');

const {
	partition,
	last,
	uniq,
	minBy,
	reduce,
	flatten,
} = require('ramda');

const { LRUMap } = require('lru_map');

const cuid = require('cuid');

const parseDomain = require('parse-domain');

const { isPotentialMediaSourceRequest } = require('./utils/is-potential-media-source-request');
const { isPotentialMediaSourceResponse } = require('./utils/is-potential-media-source-response');

const minimumBy = (f, ...args) => reduce(minBy(f), ...args);

const REMEMBERED_BLOBS_LIMIT = 16;

const blobSources = {
	requestsByTabId: new Map(),
	responsesByTabId: new Map(),

	handleSendHeaders(details) {
		if (!this.requestsByTabId.has(details.tabId)) {
			this.requestsByTabId.set(details.tabId, new LRUMap(REMEMBERED_BLOBS_LIMIT * 4));
		}
		if (!isPotentialMediaSourceRequest(details)) {
			return;
		}
		const requests = this.requestsByTabId.get(details.tabId);
		requests.set(details.requestId, details);
	},

	handleCompleted(details) {
		if (!this.responsesByTabId.has(details.tabId)) {
			this.responsesByTabId.set(details.tabId, new LRUMap(REMEMBERED_BLOBS_LIMIT * 4));
		}
		if (!isPotentialMediaSourceResponse(details)) {
			return;
		}
		const responses = this.responsesByTabId.get(details.tabId);
		responses.set(details.requestId, details);
	},

	handleNavigationCommitted(details) {
		this.requestsByTabId.delete(details.tabId);
	},

	handleTabRemoved(tabId) {
		this.requestsByTabId.delete(tabId);
	},

	_findBlobMediaSourceGeneric(map, tabId, timeStamp) {
		const requests = map.get(tabId);

		if (!requests) {
			return undefined;
		}

		const values = [ ...requests.values() ];

		const min = minimumBy(r => r ? Math.abs(r.timeStamp - timeStamp) : Infinity, undefined, values);

		return min;
	},

	_findBlobMediaSourceRequest(tabId, timeStamp) {
		return this._findBlobMediaSourceGeneric(this.requestsByTabId, tabId, timeStamp);
	},

	_findBlobMediaSourceResponse(tabId, timeStamp) {
		return this._findBlobMediaSourceGeneric(this.responsesByTabId, tabId, timeStamp);
	},

	findBlobMediaSourceUrls(tabId, timeStamp) {
		return uniq([
			this._findBlobMediaSourceRequest(tabId, timeStamp),
			this._findBlobMediaSourceResponse(tabId, timeStamp),
		].filter(Boolean).map(r => r.url));
	},
};

browser.webRequest.onSendHeaders.addListener(details => {
	blobSources.handleSendHeaders(details);
}, { urls: [ '<all_urls>' ] }, [ 'requestHeaders' ]);

browser.webRequest.onCompleted.addListener(details => {
	blobSources.handleCompleted(details);
}, { urls: [ '<all_urls>' ] }, [ 'responseHeaders' ]);

browser.webNavigation.onCommitted.addListener(details => {
	blobSources.handleNavigationCommitted(details);
});

browser.tabs.onRemoved.addListener(tabId => {
	blobSources.handleTabRemoved(tabId);
});

const rootMenuId = browser.menus.create({
	title: 'Universal &downloader',
	contexts: [ 'all' ],
	visible: false,
});

const remote = {
	ports: new Map(),

	listeners: [],

	postMessage(tabId, message) {
		if (!this.ports.has(tabId)) {
			const port = browser.tabs.connect(tabId);
			this.ports.set(tabId, port);
			this.listeners.forEach(listener => port.onMessage.addListener(listener));
			port.onDisconnect.addListener(() => this.ports.delete(tabId));
		}
		const port = this.ports.get(tabId);
		return port.postMessage(message);
	},

	addListener(listener) {
		this.listeners.push(listener);
		[ ...this.ports.values() ].forEach(p => p.onMessage.addListener(listener));
	},

	removeListener(listener) {
		this.listeners = this.listeners.filter(l => l !== listener);
		[ ...this.ports.values() ].forEach(p => p.onMessage.removeListener(listener));
	},
};

const infoByBlobUrl = new LRUMap(REMEMBERED_BLOBS_LIMIT);

remote.addListener(message => {
	if (message.type !== 'CORRELATE_MEDIA_SOURCE_OBJECT_URL') {
		return;
	}

	infoByBlobUrl.set(message.payload.url, message.payload);
});

let shownMenuId = null;

const submenuItemIdToInfo = new Map();

browser.menus.onShown.addListener(async (menuShownInfo, tab) => {
	const id = cuid();

	shownMenuId = id;

	remote.postMessage(tab.id, {
		type: 'CONTEXT_MENU_SHOWN',
		payload: menuShownInfo,
		meta: { id },
	});

	const message = await new Promise((resolve, reject) => {
		const listener = message => {
			if (message.type !== 'CONTEXT_MENU_DOWNLOADABLE_ELEMENTS') {
				return;
			}

			remote.removeListener(listener);

			if (message.meta.id !== id) {
				reject();
				return;
			}

			resolve(message);
		};

		remote.addListener(listener);
	});

	if (shownMenuId !== id) {
		return;
	}

	if (message.payload.length === 0) {
		await browser.menus.update(rootMenuId, {
			visible: false,
		});
	} else {
		await Promise.all([ ...submenuItemIdToInfo.keys() ].map(i => {
			submenuItemIdToInfo.delete(i);
			return browser.menus.remove(i);
		}));

		const addedItems = await Promise.all(flatten(
			message.payload.map(downloadable => downloadableToSubmenuItemInfo(menuShownInfo, tab, downloadable))
		).map(info => new Promise(resolve => {
			const id = browser.menus.create({
				title: info.title,
				parentId: rootMenuId,
			}, resolve);
			submenuItemIdToInfo.set(id, info);
		})));

		await browser.menus.update(rootMenuId, {
			visible: addedItems.length > 0,
		});
	}

	if (shownMenuId !== id) {
		return;
	}

	await browser.menus.refresh();
});

browser.menus.onHidden.addListener(() => {
	shownMenuId = null;
});

const isBlobSource = s => (new URL(s.src)).protocol === 'blob:';

const getDownloadOptions = (menuShownInfo, tab, downloadable) => {
	const [ blobs, urls ] = partition(isBlobSource, downloadable.sources);

	if (urls.length > 0) {
		const url = urls[0].src;

		const url_ = new URL(url);
		const pageUrl_ = new URL(menuShownInfo.pageUrl);

		const { hostname, pathname } = pageUrl_;
		const leafname = last(url_.pathname.split('/'));
		const filename = [
			hostname,
			...pathname.split('/'),
			leafname,
		].filter(Boolean).join('_');

		return {
			downloadOptions: {
				url,
				filename,
			},
		};
	}

	const url = blobs[0].src;
	const { timeStamp } = infoByBlobUrl.get(url) || {};
	if (!timeStamp) {
		return;
	}

	const mediaSourceUrls = blobSources.findBlobMediaSourceUrls(tab.id, timeStamp);

	return { mediaSourceUrls };
};

const downloadableToSubmenuItemInfo = (menuShownInfo, tab, downloadable) => {
	const { mediaSourceUrls, downloadOptions } = getDownloadOptions(menuShownInfo, tab, downloadable);
	if (downloadOptions) {
		const { hostname, pathname } = new URL(downloadOptions.url);
		const { domain } = parseDomain(hostname);
		const extname = path.extname(pathname);
		return {
			title: `&${downloadable.tagName} (${extname} ${domain})`,
			downloadOptions,
		};
	}
	return mediaSourceUrls.map(mediaSourceUrl => ({
		title: `&${downloadable.tagName} (copy m3u link)`,
		mediaSourceUrl,
	}));
};

browser.menus.onClicked.addListener(menuClickedInfo => {
	const submenuItemInfo = submenuItemIdToInfo.get(menuClickedInfo.menuItemId);

	if (!submenuItemInfo) {
		return;
	}

	const { mediaSourceUrl, downloadOptions } = submenuItemInfo;

	if (downloadOptions) {
		browser.downloads.download(downloadOptions);
	} else if (mediaSourceUrl) {
		navigator.clipboard.writeText(mediaSourceUrl);
	}
});
