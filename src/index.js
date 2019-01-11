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
const maybe_dataset = 'EDMSE_pat_FR_1096_050.mat';
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
		const brushList = document.getElementById('brush-list');

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

				               	// update brushes
				               	updateBrushes();
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

				/***** MULTIPLE BRUSHES ******/

				// We initially generate a SVG group to keep our brushes' DOM elements in:
				const gBrushes = svg.append('g')
					.attr("class", "brushes");

				svg.append("rect")
				   .attr("class", "zoom")
				   .attr("id", "zoom")
				   .attr("width", +svg.attr('width'))
				   .attr("height", +svg.attr('height'))
				   .call(zoom);

				// We also keep the actual d3-brush functions and their IDs in a list:
				const brushes = [];
				const brushCount = 0;

				function newBrush() {
					console.log("newBrush()");

					var brush = d3.brushX()
					    .extent([[0, 0], [x((x.domain())[1]), +svg.attr('height')]])
					    .on("start", brushstart)
					    .on("brush", brushed)
					    .on("end", brushend);

					brushes.push({id: brushes.length, brush: brush, times: []});

				  	function brushstart() {
				    	// your stuff here
				    	console.log("brushstart()");
					};

					function brushed() {
				    	// your stuff here
				    	console.log("brushed() ");
					}

					function brushend() {
				    	// Figure out if our latest brush has a selection
				    	const lastBrushID = brushes[brushes.length - 1].id;
				    	const lastBrush = document.getElementById('brush-' + lastBrushID);
				    	const lastSelection = d3.brushSelection(lastBrush);

				    	// If it does, that means we need another one
				    	if (lastSelection && lastSelection[0] !== lastSelection[1]) {
				      		// Add brush to DOM list
				     		brushList.innerHTML += "<div class=\"seizure-wrap\" id=\"seizure-" + lastBrushID + "\">Seizure " + lastBrushID + "</div>";
				      		// Add brush to graph
				      		newBrush();
				    	}

				    	// Always draw brushes
				    	drawBrushes();

				    	// store/update the value of the selection for the current brush
				    	const brushId = brushes.findIndex(x => x.brush == brush);

				    	const extent = brush.extent().call();
				    	const extWidth = extent[1][0] - extent[0][0];
				    	const brushElem = document.getElementById('brush-' + brushId);
				    	const selection = d3.brushSelection(brushElem);

				    	// if a selection exists, store the selected time
				    	if (selection && selection[0] !== selection[1]) {
					    	const selWidth = selection[1] - selection[0];
					    	const tRange = x.domain();
					    	const timeWidth = tRange[1] - tRange[0];
					    	const selStart = new Date((selection[0]/extWidth)*timeWidth + tRange[0].getTime());
					    	const selEnd = new Date((selection[1]/extWidth)*timeWidth + tRange[0].getTime());
					    	// update brushes array with new start and end times
					    	brushes[brushId].times = [selStart, selEnd];

					    	// push changes servserside
					    }
					}
				}

				function updateBrushes() {
					console.log("updateBrushes()");

					const brushSelection = gBrushes
					    .selectAll('.brush')
					    .data(brushes, function (d){return d.id});

					// moves the brushes to the correct location on the x axis
					brushSelection.each(function(brushObject) {
				    	// set some default values of the brushes using the x timescale

				    	// update the brushes according to reflect their selected time
						if(brushes[brushObject.id].times.length == 2 && brushes[brushObject.id].times !== []) {
							brushObject.brush.move(d3.select(this), [
								x(brushes[brushObject.id].times[0]),
								x(brushes[brushObject.id].times[1])
							]);
						}

					});

				}

				function drawBrushes() {
				  	const brushSelection = gBrushes
					    .selectAll('.brush')
					    .data(brushes, function (d){return d.id});

					console.log("drawBrushes()");

					// Set up new brushes only
				  	brushSelection.enter()
					    .insert("g", '.brush')
					    .attr('class', 'brush')
					    .attr('id', function(brush){ return "brush-" + brush.id; })
					    .each(function(brushObject) {
					    	//call the brush
					    	brushObject.brush(d3.select(this));
					    });

					/* REMOVE POINTER EVENTS ON BRUSH OVERLAYS
					 *
					 * This part is abbit tricky and requires knowledge of how brushes are implemented.
					 * They register pointer events on a .overlay rectangle within them.
					 * For existing brushes, make sure we disable their pointer events on their overlay.
					 * This frees the overlay for the most current (as of yet with an empty selection) brush to listen for click and drag events
					 * The moving and resizing is done with other parts of the brush, so that will still work.
					 */
				  	brushSelection
					    .each(function (brushObject){
					      d3.select(this)
 					        .selectAll('.overlay')
					        .style('pointer-events', function() {
					          var brush = brushObject.brush;
					          if (brushObject.id === brushes.length-1 && brush !== undefined) {
					            return 'all';
					          } else {
					            return 'none';
					          }
					        });
					    });

					// remove brushes that no longer exist on the selection
				  	brushSelection.exit()
				    	.remove();
				}

				newBrush();
				drawBrushes();

				// Simple button for toggling zoom/edit
				const ezToggle = document.getElementById('edit-zoom-toggle');
				const zoomRect = document.getElementById('zoom');
				ezToggle.addEventListener("click", function() {
					if (zoomRect.style.display === "none") {
						zoomRect.style.display = "block";
						ezToggle.textContent = "Edit";
					} else {
						zoomRect.style.display = "none";
						ezToggle.textContent = "Done";
					}
				});

			}, console.log).catch(console.log);
	});
}
else {
	// dataset selection screen
}