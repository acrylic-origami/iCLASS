import React from 'react';
import * as d3 from 'd3';
import Q from 'q';
import Frac from 'fraction.js';
import {fromEvent, Subject} from 'rxjs';
import {debounceTime, bufferCount, map} from 'rxjs/operators';

import TiledData from './TiledData';
import {BASEGRAPH_ZOOM, EPS} from './consts';

const channels = [...Array(8).keys()];

export default class extends React.Component {
	constructor(props) {
		super(props);
		
		this.svg = React.createRef();
		this.zoom = React.createRef();
		this.area = React.createRef();
		this.gBrushes = React.createRef();
	}
	
	componentDidMount() {
		this.$svg = d3.select(this.svg.current);
		this.$area = d3.select(this.area.current);
		this.$gBrushes = d3.select(this.gBrushes.current);
		this.$zoom = d3.select(this.zoom.current);
		this.onDatasetUpdate();
	}
	componentDidUpdate(prevProps, prevState) {
		if(prevProps.dataset !== this.props.dataset) {
			this.onDatasetUpdate();
		}
	}
	render = () => <svg ref={this.svg} width={this.props.width} height={this.props.height}>
		<g ref={this.area}></g>
		<g ref={this.gBrushes} className="brushes"></g>
		<rect id="zoom" className="zoom" style={{ display: this.props.is_editing ? 'none' : 'block' }} width={this.props.width} height={this.props.height} ref={this.zoom} />
	</svg>
	
	onDatasetUpdate = () => Q.all([
			d3.json(`dataset_meta?dataset=${this.props.dataset}`),
			d3.json(`data?dataset=${this.props.dataset}&zoom=${BASEGRAPH_ZOOM}&start_N=0&start_D=1&end_N=1&end_D=1`)
		], console.log)
			.then(([{ point_count, Fs, tstart }, data]) => {
				
				// TODO account for initial zooms in props
				
				// DATA SETUP //
				const domain0 = [new Date(tstart), new Date(tstart + point_count / Fs * 1000)];
				const data_controller = new TiledData(
					data.map(chunk => [BASEGRAPH_ZOOM, chunk]),
					domain0.map(d => d.getTime()),
					(zoom, start, end) => d3.json(`data?dataset=${this.props.dataset}&zoom=${zoom}&start_N=${start.n}&start_D=${start.d}&end_N=${end.n}&end_D=${end.d}`)
				);
				const flat_data = data.reduce((acc, chunk) => acc.concat(chunk), []);
				
				// UI SETUP //
				const x = d3.scaleTime()
				            .range([0, +this.$svg.attr('width')])
				            .domain(domain0),
				      x0 = x.copy(),
				      y = d3.scaleLinear()
				            .range([+this.$svg.attr('height'), 0])
				            .domain(d3.extent(channels.map(ch => flat_data.map(packet => packet[1][ch])).reduce((acc, packet) => acc.concat(packet))));

				const x_ax = d3.axisBottom(x),
				      y_ax = d3.axisLeft(y);
				               
				const h_x_ax = this.$area.append('g').attr('class', 'axis axis--x').call(x_ax);
				const h_y_ax = this.$area.append('g').attr('class', 'axis axis--y').call(y_ax);

				const channel_offset = (y.domain()[1]-y.domain()[0])/(channels.length + 2); // +2 leaves gap at bottom and top
				const offset = i => (i + 0.5 - channels.length / 2) * channel_offset;
				
				const line = d3.line()
				               .curve(d3.curveMonotoneX)
				               .x(d => x0(new Date(d[0])))
				               .y(d => y(d[1]));

				const h_lines =
					channels.map(ch =>
						this.$area.append('path')
							.data([flat_data.map(packet => [packet[0], packet[1][ch] / (channels.length + 2) + offset(ch)])])
				          .attr('class', 'line line-num-'+ch)
				          .attr('d', line)
				   );
				
				const zoom_subj = new Subject();
				const zoom = d3.zoom()
				               .extent([[0, 0], [+this.$svg.attr('width'), +this.$svg.attr('height')]]) // TODO replace with dynamic bbox
				               .on('zoom', e => {
				               	// I think 
				               	// h_line.attr('d', line);
				               	const tf = d3.event.transform;
				               	const new_domain = tf.rescaleX(x0).domain();
				               	zoom_subj.next(new_domain);
				               	x.domain(new_domain);

				               	h_lines.forEach(h_line => {
				               		const tf_str = `translate(${tf.x} 0) scale(${tf.k} 1)`;
					               	h_line.attr('transform', tf_str) // assuming non-scaling stroke; much better performance
					               	this.$gBrushes.attr('transform', tf_str)
					               	// h_line.attr('d', line) // without non-scaling stroke, quite wasteful
				               	}); //Object.assign({}, , { y: 1 }))); // scale only X
				               	h_x_ax.call(x_ax);

				               	// update brushes
				               	// updateBrushes();
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
										h_lines[i].data([data.map(packet => [packet[0], packet[1][channels[i]] / (channels.length + 2) + offset(channels[i])])])
										          .attr('d', line);
									}
								}
							}, console.log).catch(console.log)
					});

				/***** MULTIPLE BRUSHES ******/

				// We initially generate a SVG group to keep our brushes' DOM elements in:
				this.$zoom.call(zoom);
				
				// We also keep the actual d3-brush functions and their IDs in a list:
				const brushes = [];
				
				const that = this;
				
				function newBrush() {
					var brush = d3.brushX()
					    .extent([[0, 0], [x((x.domain())[1]), +that.$svg.attr('height')]])
					    .on("start", brushstart)
					    .on("brush", brushed)
					    .on("end", brushend);
					    
					that.props.onAddBrush(brush);

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
					    }
					}
				}

				function updateBrushes() {
					const brushSelection = that.$gBrushes
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
				  	const brushSelection = that.$gBrushes
					    .selectAll('.brush')
					    .data(brushes, function (d){return d.id});

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
			}, console.log).catch(console.log);
}