import ReactDOM from 'react-dom';
import React from 'react';
import Nav from './Nav';



setTimeout(() => {
	ReactDOM.render(<Nav />, document.getElementById('main'));
}, 10);

