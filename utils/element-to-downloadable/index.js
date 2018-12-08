
const { prop } = require('ramda');

const sourceElementToDownloadableSource = source => ({
	src: source.src,
	type: source.type,
});

const elementToDownloadable = element => {
	if (element.tagName === 'IMG' || element.tagName === 'VIDEO' || element.tagName === 'AUDIO') {
		const sources = element.querySelectorAll('source');
		return {
			tagName: element.tagName,
			sources: [ ...sources ]
				.map(sourceElementToDownloadableSource)
				.concat({
					src: element.src,
				})
				.filter(prop('src'))
				.map(s => {
					if (!s.type) {
						delete s.type;
					}
					return s;
				}),
		};
	}
};

module.exports = {
	elementToDownloadable,
};
