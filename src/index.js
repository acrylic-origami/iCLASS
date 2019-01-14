import ReactDOM from 'react-dom';
import React from 'react';
import MainController from './MainController';
import * as d3 from 'd3';
import {EPS} from './consts';

const params = new URLSearchParams(document.location.search.substring(1));
const hash = document.location.hash.substring(1);

const maybe_annotation = params.get('annotation');
// const maybe_dataset = params.get('dataset');
const maybe_dataset = 'EDMSE_pat_FR_1096_003.mat';
if(maybe_annotation != null || maybe_dataset != null) {
	const F_initial_range = (() => {
		const maybe_start = params.get('start');
		const maybe_range = params.get('range');
		if(maybe_annotation != null) {
			return d3.json(`annotation?id=${maybe_annotation}`).then(d => ({
				dataset: d.dataset,
				start: d.start,
				range: d.range
			}));
		}
		else if(maybe_start != null && maybe_range != null) {
			return Q({
				dataset: maybe_dataset,
				start: parseFloat(start),
				range: parseFloat(range)
			});
		}
		else {
			return d3.json(`dataset_meta?dataset=${maybe_dataset}`).then(d => ({
				dataset: maybe_dataset,
				start: 0,
				end: d.point_count / d.Fs - EPS
			}));
			// TODO URGENT make this case work
			// F_meta.then({ point_count, Fs } => D.resolve([maybe_dataset, [0, point_count / Fs]])); // beware of numerical inaccuracy!
		}
	})();
	window.addEventListener('load', () => {
		F_initial_range.then(initial =>
			ReactDOM.render(<MainController {...initial} />, document.getElementById('main'))
		);
	});
}
else {
	// TODO dataset selection screen
}