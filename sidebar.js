/* global window */

const r = require('r-dom');

const { render } = require('react-dom');

const Root = () => r.div('asdfasdf');

render(r(Root), window.document.getElementById('content'));
