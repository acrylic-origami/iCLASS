import * as d3 from 'd3';
import Q from 'q';
import Frac from 'fraction.js';
import {fromEvent, Subject} from 'rxjs';
import {debounceTime, bufferCount, map} from 'rxjs/operators';

import TiledData from './TiledData';
import {BASEGRAPH_ZOOM, EPS} from './consts';

const channels = [0]; // TEMP

const params = new URLSearchParams(document.location.search.substring(1));
const hash = document.location.hash.substring(1);

const maybe_annotation = params.get('annotation');
// const maybe_dataset = params.get('dataset');
const maybe_dataset = 'EDMSE_pat_FR_1096_002.mat';

if(maybe_annotation != null || maybe_dataset != null) {
	const F_initial_range = (() => {
		const maybe_start = params.get('start');
		const maybe_range = params.get('range');
		
		if(maybe_annotation != null) {
			return d3.json(`annotation?id=${maybe_annotation}`).then([d.dataset, [d.start, d.range]]);
		}
		else if(maybe_start != null && maybe_range != null) {
			return Q([maybe_dataset, [parseFloat(start), parseFloat(range)]]);
		}
		else {
			return d3.json(`dataset_meta?dataset=${maybe_dataset}`).then(d => [maybe_dataset, [0, d.point_count / d.Fs - EPS]]);
			// TODO URGENT make this case work
			// F_meta.then({ point_count, Fs } => D.resolve([maybe_dataset, [0, point_count / Fs]])); // beware of numerical inaccuracy!
		}
	})();
	window.addEventListener('load', e => {
		const svg = d3.select('svg');
		const area = svg.append('g');

		F_initial_range.then(
			([dataset, [start, range]]) => Q.all([
				d3.json(`dataset_meta?dataset=${dataset}`),
				d3.json(`data?dataset=${dataset}&zoom=${BASEGRAPH_ZOOM}&start_N=0&start_D=1&end_N=1&end_D=1`)
			]),
			console.log
		)
			.then(([{ point_count, Fs, tstart }, data]) => {
				// DATA SETUP //
				const domain0 = [new Date(tstart), new Date(tstart + point_count / Fs * 1000)];
				const data_controller = new TiledData(
					data.map(chunk => [BASEGRAPH_ZOOM, chunk]),
					domain0.map(d => d.getTime()),
					(zoom, start, end) => d3.json(`data?dataset=${maybe_dataset}&zoom=${zoom}&start_N=${start.n}&start_D=${start.d}&end_N=${end.n}&end_D=${end.d}`)
				);
				const flat_data = data.reduce((acc, chunk) => acc.concat(chunk), []);
				
				// UI SETUP //
				const x = d3.scaleTime()
				            .range([0, +svg.attr('width')])
				            .domain(domain0),
				      x0 = x.copy(),
				      y = d3.scaleLinear()
				            .range([+svg.attr('height'), 0])
				            .domain(d3.extent(channels.map(ch => flat_data.map(packet => packet[1][ch])).reduce((acc, packet) => acc.concat(packet))));

				const x_ax = d3.axisBottom(x),
				      y_ax = d3.axisLeft(y);
				               
				const h_x_ax = area.append('g').attr('class', 'axis axis--x').call(x_ax);
				const h_y_ax = area.append('g').attr('class', 'axis axis--y').call(y_ax);

				const line = d3.line()
				               .curve(d3.curveMonotoneX)
				               .x(d => x(new Date(d[0])))
				               .y(d => y(d[1]));

				const h_lines =
					channels.map(ch =>
						area.append('path')
				          .data([flat_data.map(packet => [packet[0], packet[1][ch]])])
				          .attr('class', 'line')
				          .attr('d', line)
				   );
				
				const zoom_subj = new Subject();
				const zoom = d3.zoom()
				               .extent([[0, 0], [+svg.attr('width'), +svg.attr('height')]]) // TODO replace with dynamic bbox
				               .on('zoom', e => {
				               	// I think 
				               	// h_line.attr('d', line);
				               	const tf = d3.event.transform;
				               	const new_domain = tf.rescaleX(x0).domain();
				               	zoom_subj.next(new_domain);
				               	x.domain(new_domain);
				               	h_lines.forEach(h_line =>
					               	// h_line.attr('transform', `translate(${tf.x} 0) scale(${tf.k} 1)`) // assuming non-scaling stroke; much better performance
					               	h_line.attr('d', line) // without non-scaling stroke, quite wasteful
				               	); //Object.assign({}, , { y: 1 }))); // scale only X
				               	h_x_ax.call(x_ax);
				               });
				zoom_subj.pipe(
					bufferCount(10),
					debounceTime(200),
					map(buffer => buffer[buffer.length - 1].map(d => d.getTime())) // when rate falls below 10 events per 200ms
				)
					.subscribe(new_domain => {
						data_controller.update(new_domain)
							.then(did_update => {
								if(did_update) {
									const data = data_controller.get_data();
									for(let i = 0; i < channels.length; i++) {
										h_lines[i].data([data.map(packet => [packet[0], packet[1][channels[i]]])])
										          .attr('d', line);
									}
								}
							}, console.log).catch(console.log)
					});
				svg.append("rect")
				   .attr("class", "zoom")
				   .attr("width", +svg.attr('width'))
				   .attr("height", +svg.attr('height'))
				   .call(zoom);
			}, console.log).catch(console.log);
	});
}
else {
	// dataset selection screen
}