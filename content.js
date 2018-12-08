/* global browser, window, exportFunction */

const { elementToDownloadable } = require('./utils/element-to-downloadable');

let lastClickEvent = null;

window.addEventListener('click', e => {
	lastClickEvent = e;
}, true);

const background = {
	queue: [],

	handleConnect(port) {
		this.port = port;
		this.queue.forEach(m => this.port.postMessage(m));
	},

	postMessage(message) {
		if (this.port) {
			this.port.postMessage(message);
		} else {
			this.queue.push(message);
		}
	},
};

browser.runtime.onConnect.addListener(port => {
	background.handleConnect(port);
	port.onMessage.addListener(message => {
		if (message.type !== 'CONTEXT_MENU_SHOWN') {
			return;
		}

		const { id } = message.meta;

		const contextMenuTarget = browser.menus.getTargetElement(message.payload.targetElementId);

		if (lastClickEvent.target !== contextMenuTarget) {
			return;
		}

		const elements = window.document.elementsFromPoint(lastClickEvent.x, lastClickEvent.y);

		port.postMessage({
			type: 'CONTEXT_MENU_DOWNLOADABLE_ELEMENTS',
			payload: elements.map(elementToDownloadable).filter(d => d && d.sources.length > 0),
			meta: { id },
		});
	});
});

const { createObjectURL } = window.URL;
exportFunction(function (object, ...rest) {
	const url = createObjectURL.call(this, object, ...rest);
	if (object instanceof window.MediaSource) {
		try {
			background.postMessage({
				type: 'CORRELATE_MEDIA_SOURCE_OBJECT_URL',
				payload: {
					timeStamp: Date.now(),
					url,
				},
			});
		} catch (error) {
			console.warn(error);
		}
	}
	return url;
}, window.URL, { defineAs: 'createObjectURL' });
