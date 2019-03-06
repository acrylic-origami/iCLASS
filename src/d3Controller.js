import React from 'react';
import * as d3 from 'd3';
import Q from 'q';
import Frac from 'fraction.js';
import {fromEvent, Subject} from 'rxjs';
import {debounceTime, bufferCount, map} from 'rxjs/operators';

// import DataController from './DataController';
import DataController from './FlatData';
import {BASEGRAPH_ZOOM, EPS} from './consts';

const channels = [...Array(16).keys()];
const NUM_CH = channels.length;

export default class extends React.Component {
	constructor(props) {
		super(props);
		
		this.svg = React.createRef();
		this.zoom = React.createRef();
		this.area = React.createRef();
		this.gBrushes = React.createRef();
		
		
		this.zoomFunc = () => {};
		this.orig_domain = [];
		this.resampleData = () => {};
		this.x = () => {};
		this.newBrush = () => {};
		this.updateBrushes = () => {};
		this.clearBrushes = () => {};
		this.brushes = [];
	}
	
	componentDidMount() {
		this.$svg = d3.select(this.svg.current);
		this.$area = d3.select(this.area.current);
		this.$gBrushes = d3.select(this.gBrushes.current);
		this.$zoom = d3.select(this.zoom.current);
		
		this.$zoom.on("dblclick.zoom", null);
		this.$svg.on("dblclick", this.openAnnotation);
		this.onDatasetUpdate();
	}

	componentDidUpdate(prevProps, prevState) {
		if(prevProps.dataset !== this.props.dataset) {
			this.onDatasetUpdate();
		}
		
		// When the brush list is updated from the props,
		// Clear the brushes and add new ones
		if(prevProps.brushes !== this.props.brushes) {
			this.clearBrushes();
			for(var i = 0; i < this.props.brushes.length; i++) {
				this.newBrush(this.props.brushes[i]);
			}
		}
	}

	render = () => <svg ref={this.svg} width={this.props.width} height={this.props.height}>
		<g ref={this.area}></g>
		<g ref={this.gBrushes} className="brushes"></g>
		<rect id="zoom" className="zoom" style={{ display: this.props.is_editing ? 'none' : 'block' }} width={this.props.width} height={this.props.height} ref={this.zoom} />
	</svg>
	
	openAnnotation = e => { 
		this.props.openNewAnnotationPopUp({
			x: d3.event.x,
			y: d3.event.y,
			startTime: this.x.invert(d3.event.x - 310)
		});
	};

	callZoom = zoom_times => {

		const time_width = this.orig_domain[1].getTime() - this.orig_domain[0].getTime();
		
		var new_start = zoom_times[0].getTime();
		var new_end = zoom_times[1].getTime();
		var new_width = new_end - new_start;
		
		// add a 30% buffer on each side
		new_start = new_start - new_width*0.30;
		new_end = new_end + new_width*0.30;
		new_width = new_end - new_start;

		// if smaller than a 30 second annotation, center in a 30 second window
		if(new_width <= 30000) {
			var new_buffer = (30000 - new_width)/2;
			new_start = new_start - new_buffer;
			new_end = new_end + new_buffer;
			new_width = 30000;
		}

		const start_diff = this.orig_domain[0].getTime() - new_start;


		this.$zoom.call(this.zoomFunc.transform, d3.zoomIdentity
											       .scale(time_width/new_width)
											       .translate(this.props.width*(start_diff/time_width), 0))
				  // .on("dblclick.zoom", null);

		// resample the data for new resolution
		const new_domain = [new Date(new_start), new Date(new_end)];
		this.resampleData(new_domain);
	}

	onDatasetUpdate = () => Q.all([
			d3.json(`dataset_meta?dataset=${this.props.dataset}`),
			d3.json(`data?dataset=${this.props.dataset}&zoom=${BASEGRAPH_ZOOM}&start_N=0&start_D=1&end_N=1&end_D=1`)
		], console.log)
			.then(([{ point_count, Fs, tstart }, data]) => {
				
				// TODO account for initial zooms in props
				
				// DATA SETUP //
				const domain0 = [new Date(tstart), new Date(tstart + point_count / Fs * 1000)];
				const domain1 = [new Date(tstart), new Date(tstart + 30E3)]; // TODO clean this
				this.orig_domain = domain0;
				const data_controller = new DataController(
					this.props.dataset,
					domain0.map(d => d.getTime())
				);
				const flat_data = data.reduce((acc, chunk) => acc.concat(chunk), []);
				
				// UI SETUP //
				this.x = d3.scaleTime()
				            .range([0, +this.$svg.attr('width')])
				            .domain(domain1);
				const x0 = this.x.copy();
				const y = d3.scaleLinear()
				            .range([+this.$svg.attr('height'), 0])
				            .domain(d3.extent(channels.map(ch => flat_data.map(packet => packet[1][ch])).reduce((acc, packet) => acc.concat(packet))));

				const x_ax = d3.axisBottom(this.x),
				      y_ax = d3.axisLeft(y);
				               
				const h_x_ax = this.$area.append('g').attr('class', 'axis axis--x').call(x_ax);
				const h_y_ax = this.$area.append('g').attr('class', 'axis axis--y').call(y_ax);

				const channel_offset = (y.domain()[1]-y.domain()[0])/(NUM_CH + 2); // +2 leaves gap at bottom and top
				const offset = i => (i + 0.5 - NUM_CH / 2) * channel_offset;
				
				const line = d3.line()
				               .curve(d3.curveMonotoneX)
				               .x(d => x0(new Date(d[0])))
				               .y(d => y(d[1]));

				const h_lines =
					channels.map(ch =>
						this.$area.append('path')
							.data([flat_data.map(packet => [packet[0], packet[1][ch] / (NUM_CH + 2) + offset(ch)])])
				        	.attr('class', 'line line-num-'+ch)
				        	.attr('d', line)
				   );
				
				const zoom_subj = new Subject();
				
				this.zoomFunc = d3.zoom()
				               .extent([[0, 0], [+this.$svg.attr('width'), +this.$svg.attr('height')]])
				               .on('zoom', e => {
				               	// I think 
				               	// h_line.attr('d', line);
				               	const tf = d3.event.transform;
				               	// if has_zoomed is false, the new domain should be the one passed by props
				               	const new_domain =  tf.rescaleX(x0).domain();//this.props.has_zoomed ? t_domain : this.props.zoom_times;
				               	zoom_subj.next(new_domain);
				               	this.x.domain(new_domain);
				               	h_lines.forEach(h_line => {
				               		const tf_str = `translate(${tf.x} 0) scale(${tf.k} 1)`;;
					               	h_line.attr('transform', tf_str); // assuming non-scaling stroke; much better performance
					               	// this.$gBrushes.attr('transform', tf_str);
					               	// this.$gBrushes.selectAll('.handle').attr('width', 6/tf.k);
					               	// h_line.attr('d', line) // without non-scaling stroke, quite wasteful
				               	}); //Object.assign({}, , { y: 1 }))); // scale only X
				               	h_x_ax.call(x_ax);

				               	// update brushes through x()
				               	this.updateBrushes();

				               });

				// force resampling of data when zoom is done manually
				this.resampleData = new_domain => {
					data_controller.maybe_update(new_domain)
						.then(did_update => {
							if(did_update) {
								const data = data_controller.get_data(new_domain);
								// destroy the boundaries between chunks and use graph interpolate
								const flat_data = data.reduce((acc, d) => {
									acc.push.apply(acc, d[1][0]);
									return acc;
								}, []);
								// debugger;
								for(let i = 0; i < NUM_CH; i++) {
									// debugger;
									h_lines[i].data([flat_data.map(packet => [packet[0], packet[1][channels[i]] / (NUM_CH + 2) + offset(channels[i])])])
											  .attr('d', line);
								}
							}
						}, console.log).catch(console.log)
				};
				
				zoom_subj.pipe(
					bufferCount(10),
					debounceTime(200),
					map(buffer => buffer[buffer.length - 1].map(d => d.getTime())) // when rate falls below 10 events per 200ms
				)
					.subscribe(this.resampleData.bind(this));

				this.$zoom.call(this.zoomFunc).on("dblclick.zoom", null);
				this.resampleData(domain1);
				// this.zoomFunc.event(this.$zoom);

				/***** BRUSHES ******/			
				
				const that = this;

				this.newBrush = (data) => {

					var brush = d3.brushX()
					    .extent([[0, 0], [that.x((that.x.domain())[1]), +that.$svg.attr('height')]])
					    .on("start", brushstart)
					    .on("brush", brushed)
					    .on("end", brushend);

					this.brushes.push(brush);

					const gBrush = that.$gBrushes
									   .insert("g", '.brush')
					    			   .attr("class", "brush")
					    			   .attr('id', "brush-" + data.ids[0])
					    			   .call(brush)
					    			   .call(brush.move, data.times.map(that.x));

					// If point, add brush, delete handles, add title (after)
					// If range, add brush, add custom handles with titles
					if(data.type == "point") {
						gBrush.attr("class", "brush point");

						// Move the brush to the startTime + a fixed width
						gBrush.call(brush.move, [that.x(data.times[0]), that.x(data.times[0]) + 2]);

						// Remove the handles so can't be resized
						gBrush.selectAll('.brush>.handle').remove();

						// add titles
					
					} else if (data.type == "range") {
						gBrush.attr("class", "brush range");

						// Move the brush to the startTime and endTime
						gBrush.call(brush.move, data.times.map(that.x));
						
						// add titles as custom handles
					}

					// remove all brush overlays
					d3.selectAll('.brush>.overlay').remove();

				  	function brushstart() {
				    	// your stuff here
					};

					function brushed() {
				    	// your stuff here
					}

					function brushend() {
				    	// store/update the value of the new brush selection
				    	const brushElem = document.getElementById('brush-' + data.ids[0]);
				    	const selection = d3.brushSelection(brushElem);

				    	// if a selection exists, store the selected time
				    	if (selection && selection[0] !== selection[1]) {
					    	// update that.brushes array with new start and end times
					    	const selStart = that.x.invert(selection[0])
					    	const selEnd = that.x.invert(selection[1]);
					    	
					    	if (data.type == "point") {
					    		that.props.updateAnnotation([{id: data.ids[0], time: new Date(selStart)}]);
					    	} else { // range
								that.props.updateAnnotation([
									{id: data.ids[0], time: new Date(selStart)},
									{id: data.ids[1], time: new Date(selEnd)}
								]);
					    	}
					    }
					}
				}

				this.updateBrushes = () => {
					// manually moves each brush to the correct location on the x axis
					that.$gBrushes.selectAll('.brush')
								  .each((brushObject, index) => {

								const brush_data = that.props.brushes[index];

								const brushElem = d3.select(document.getElementById('brush-' + brush_data.ids[0]));

								if(brush_data.type == "point") {
									brushElem.call(this.brushes[index].move,
															[that.x(brush_data.times[0]), that.x(brush_data.times[0]) + 2]);
								} else {
									brushElem.call(this.brushes[index].move, brush_data.times.map(that.x));
								}

					});
				}

				this.clearBrushes = () => {
					that.brushes.length = 0;

					const brushSelection = that.$gBrushes
					    .selectAll('.brush')
					    .remove();
				};

			}, console.log).catch(console.log);
}