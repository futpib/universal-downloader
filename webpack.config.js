
const path = require('path');

const CopyWebpackPlugin = require('copy-webpack-plugin');

const dist = path.join(path.resolve(__dirname), 'dist');

module.exports = {
	entry: {
		background: './background.js',
		content: './content.js',
	},

	output: {
		path: dist,
		filename: '[name].js',
	},

	resolve: {
		alias: {
			path: 'path-browserify',
		},
	},

	plugins: [
		new CopyWebpackPlugin([
			{ from: 'manifest.json', to: dist },
			{ from: '*.html', to: dist },
			{ from: '*.css', to: dist },
		]),
	],

	devtool: 'sourcemap',
};
