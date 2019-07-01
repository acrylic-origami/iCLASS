import React from 'react';
import * as d3 from './d3';
import * as d3_multi from 'd3-selection-multi';
import Q from 'q';
import Frac from 'fraction.js';
// import {fromEvent, Subject} from 'rxjs';
// import {debounceTime, bufferCount, map} from 'rxjs/operators';

// import DataController from './DataController';
import DataController from './FlatData';
import {BASEGRAPH_ZOOM, EPS, FULL_RES_INTERVAL} from './consts';
import AnnotateView from './AnnotateView';
import {group_point_annotations} from './Util/AnnotationCollectionUtils';
import {PointBrush, OnsetBrush, OffsetBrush, RangeBrush, SeizureBrush} from './Annotations';

const channels = [...Array(16).keys()];
const NUM_CH = channels.length;
const Y_DOMAIN = [-200, 200]; // TODO make this user-adjustable via props
const OVERSCALING = 10;
const MINIMAP_HEIGHT = 100;

export default class extends React.Component {
	constructor(props) {
		super(props); // brushes are also included here
		// basic dataset dataset_meta is also included here
		
		this.data_controller = new DataController(
			this.props.patient,
			this.props.dataset_meta
		);
		
		this.wrap = React.createRef(); // for sizing
		this.svg = React.createRef();
		this.zoom = React.createRef();
		this.area = React.createRef();
		this.gBrushes = React.createRef();
		
		this.minimap_svg = React.createRef();
		this.minimap_area = React.createRef();
		
		this.minimap_canvas = React.createRef();
		this.area_canvas = React.createRef();
		
		this.state = {
			is_annotating: false,
			is_brushing: false,
			annotating_id: null,
			annotating_at: null,
			annotation_preview_id: null, // used to pan to annotations
			px_ratio: window.devicePixelRatio,
			
			width: 960,
			height: 480 // to be adjusted by size of wrapper element
		};
		
		// D3 STATE
		this.px_x_shift = 0; // should this be done through state?
		this.domain1 = [new Date(this.props.dataset_meta.tstart), new Date(this.props.dataset_meta.tstart + FULL_RES_INTERVAL * 1000)];
		// this.zoom_subj = new Subject();
		
		this.zoomFunc = null;
		this.x_ax = null;
		this.h_x_ax = null;
		this.x0 = null;
		this.y = null; // grrrr, initial null states, pending render for d3 element references
		
		// x may be needed for the props-based update
	}
	
	componentDidMount() {
		this.$svg = d3.select(this.svg.current);
		this.$area = d3.select(this.area.current);
		this.$gBrushes = d3.select(this.gBrushes.current);
		this.$zoom = d3.select(this.zoom.current);
		
		this.$minimap_svg = d3.select(this.minimap_svg.current);
		this.$minimap_area = d3.select(this.minimap_area.current);
		
		this.area_ctx = this.area_canvas.current.getContext('2d');
		this.minimap_ctx = this.minimap_canvas.current.getContext('2d');
		
		this.minimap_ctx.strokeStyle = '#000 solid 1px';
		
		this.area_ctx.moveTo(0, 0);
		this.area_ctx.strokeStyle = '#000 solid 1px';
		this.area_ctx.fillStyle = '#000';
		
		this.$zoom.on("dblclick.zoom", null).on('wheel.zoom', null);
		
		
		// TODO account for initial zooms in props
		// DATA SETUP //
		
		// UI SETUP //
		const wrap_rect = this.wrap.current.getBoundingClientRect();
		(() => {
			
			// size all DOM elements foremost
			this.zoom.current.setAttribute('width', `${wrap_rect.width}px`);
			this.zoom.current.setAttribute('height', `${wrap_rect.height - MINIMAP_HEIGHT}px`);
			
			this.svg.current.setAttribute('width', `${wrap_rect.width}px`);
			this.svg.current.setAttribute('height', `${wrap_rect.height - MINIMAP_HEIGHT}px`);
			this.svg.current.style.width = `${wrap_rect.width}px`;
			this.svg.current.style.height = `${wrap_rect.height - MINIMAP_HEIGHT}px`;
			this.minimap_svg.current.style.width = `${wrap_rect.width}px`;
			
			this.area_canvas.current.width = wrap_rect.width * this.state.px_ratio * OVERSCALING;
			this.area_canvas.current.height = (wrap_rect.height - MINIMAP_HEIGHT) * this.state.px_ratio;
			this.area_canvas.current.style.width = `${wrap_rect.width * OVERSCALING}px`;
			this.area_canvas.current.style.height = `${wrap_rect.height - MINIMAP_HEIGHT}px`;
			
			this.minimap_canvas.current.width = wrap_rect.width * this.state.px_ratio;
			this.minimap_canvas.current.height =  MINIMAP_HEIGHT * this.state.px_ratio;
			this.minimap_canvas.current.style.width = `${wrap_rect.width}px`;
			this.minimap_canvas.current.style.height = `${MINIMAP_HEIGHT}px`;
			
			
			// yes, there is a race condition against this variable vs. any props change that forces a resampleData
			this.x0 = d3.scaleTime()
			            .range([0, wrap_rect.width])
			            .domain(this.domain1); // TODO: consider replacing with a representation relative to the whole dataset width
			this.x = this.x0.copy();
			
			this.y = d3.scaleLinear()
			            .range([wrap_rect.height - MINIMAP_HEIGHT, 0])
			            .domain(Y_DOMAIN); // d3.extent(channels.map(ch => flat_data.map(packet => packet[1][ch])).reduce((acc, packet) => acc.concat(packet))));

			this.x_ax = d3.axisBottom(this.x);
			this.y_ax = d3.axisLeft(this.y);
			               
			this.h_x_ax = this.$area.append('g').attr('class', 'axis axis--x').call(this.x_ax);
			this.h_y_ax = this.$area.append('g').attr('class', 'axis axis--y').call(this.y_ax);
			
			// const line = d3.line()
			//                .curve(d3.curveLinear)
			//                .x(d => this.x0(d[0]))
			//                .y(d => y(d[1]));

			// const h_lines =
			// 	channels.map(ch =>
			// 		this.$area.append('path')
			//         	.attr('class', 'line line-num-'+ch)
			//    );
			
			this.zoomFunc = d3.zoom()
			               .extent([[0, 0], [wrap_rect.width, wrap_rect.height]])
			               .on('zoom', e => {
			               	// graphics updates + propagation to parent (which will call us again in `zoom_to``)
			               	// console.log(d3.event.transform);
			               	if(d3.event.sourceEvent instanceof MouseEvent) {
				               	const new_domain = d3.event.transform.rescaleX(this.x0).domain();
				               	
				               	// gotta validate within domain bounds here too
				               	if(new_domain[0] > this.data_controller.domain0[0] && new_domain[1] < this.data_controller.domain0[1]) {
					               	this.props.onZoom(d3.event.transform);
					               }
			               	}
			               });
			
			this.$zoom.call(this.zoomFunc).on('dblclick.zoom', null).on('wheel.zoom', null);
			this.$svg.on("dblclick", () => {
				// debugger;
				this.setState(state_ => ({
					is_annotating: true,
					annotating_at: [d3.event.layerX, d3.event.layerY],
					annotating_id: null
				}));
			});
			
			// this.zoom_subj.pipe(
			// 	debounceTime(200),
			// 	map(t => t.map(d => d.getTime())) // when rate falls below 10 events per 200ms
			// 	// buffer[buffer.length - 1]
			// )
			// 	.subscribe(this.resampleData);
			// debugger;
			this.resampleData(this.domain1);
			
			window.addEventListener('resize', e => {
				const wrap_rect = this.wrap.current.getBoundingClientRect();
				this.x0.range([0, wrap_rect.width]);
				this.x.range([0, wrap_rect.width]);
				this.y.range([wrap_rect.height, 0]);
				this.zoomFunc.extent([[0, 0], [wrap_rect.width, wrap_rect.height]]);
				
				this.h_x_ax.call(this.x_ax);
				this.h_y_ax.call(this.y_ax);
			});
		})();
		
		// MINIMAP SETUP
		(() => {
			const domain0 = [new Date(this.props.dataset_meta.tstart), this.props.dataset_meta.tstart + this.props.dataset_meta.point_count / this.props.dataset_meta.Fs * 1000];
			this.minimap_x = d3.scaleTime()
			            .range([0, wrap_rect.width])
			            .domain([domain0]);
			const y = d3.scaleLog()
			            .range([0, MINIMAP_HEIGHT])
			            .domain([1E5, 1E3]); // d3.extent(channels.map(ch => flat_data.map(packet => packet[1][ch])).reduce((acc, packet) => acc.concat(packet))));

			const x_ax = d3.axisBottom(this.minimap_x),
			      y_ax = d3.axisLeft(y);
			      
			const h_x_ax = this.$minimap_area.append('g').attr('class', 'axis axis--x').call(x_ax);
			const h_y_ax = this.$minimap_area.append('g').attr('class', 'axis axis--y').call(y_ax);
			
			this.minimap_brusher = d3.brushX()
		    .extent([[0, 0], [this.minimap_svg.current.getBoundingClientRect().width, this.minimap_svg.current.getBoundingClientRect().height]]);
		   this.minimap_brush = this.$minimap_area.insert("g", '.brush')
				.attr('id', 'minimap_brush')
				.call(this.minimap_brusher);
			
			const that = this;
			
			for(let i = 0; i < this.props.dataset_meta.subsamples[0].length; i++) {
				const range = [
					this.props.dataset_meta.subsamples[0][i][0],
					this.props.dataset_meta.subsamples[1][i][0]
				]; // 5th % -- 95th %
				
				const x_px = i / this.props.dataset_meta.subsamples[0].length * wrap_rect.width;
				this.minimap_ctx.moveTo(x_px * this.state.px_ratio, y(range[0]) * this.state.px_ratio);
				this.minimap_ctx.lineTo(x_px * this.state.px_ratio, y(range[1]) * this.state.px_ratio);
			}
			this.minimap_ctx.stroke();
		})();
		
		// zoom to initial annotation if available
		if(this.props.annotation_preview_id != null)
			this.props.onZoom(this.dry_zoom_to_annotation(this.props.annotation_preview_id));
	}
	
	is_visible(domain) {
		if(!Array.isArray(domain))
			domain = [domain, domain];
		
		return (this.x0(domain[0]) - this.px_offset) > 0 && (this.x0(domain[0]) - this.px_offset) < this.state.width ||
			(this.x0(domain[1]) - this.px_offset) > 0 && (this.x0(domain[1]) - this.px_offset) < this.state.width;
	}
	dry_zoom_to_annotation(id) {
		const annotation_time = this.props.annotations.get(id).get_start();
		const zoom = d3.zoomTransform(this.$zoom.node());
		if(!this.is_visible(annotation_time)) {
			const annotation_px = [
				this.x(new Date(annotation_time.getTime() - FULL_RES_INTERVAL / 2 * 1000)),
				this.x(new Date(annotation_time.getTime() + FULL_RES_INTERVAL / 2 * 1000))
			];
			return zoom.translate(-Math.round(annotation_px[0]), 0);
		}
		else {
			return zoom;
		}
	}
	
	componentDidUpdate(prevProps, prevState) {
		const that = this;
		if(this.props.annotations !== prevProps.annotations) {
			this.updateBrushes();
		}
		
		// actual canvas moving
		if(this.props.tf !== prevProps.tf) {
			// if has_zoomed is false, the new domain should be the one passed by props
			let new_domain = this.props.tf.rescaleX(this.x0).domain(); //this.props.has_zoomed ? t_domain : this.props.zoom_times;
			// constrain domain
			if(new_domain[0] < this.data_controller.domain0[0] - EPS) {
				new_domain = [ this.data_controller.domain0[0], new Date(this.data_controller.domain0[0].getTime() + FULL_RES_INTERVAL * 1000) ];
			}
			else if(new_domain[1] > this.data_controller.domain0[1] + EPS) {
				new_domain = [ new Date(this.data_controller.domain0[1].getTime() - FULL_RES_INTERVAL * 1000), this.data_controller.domain0[1] ];
			}
			
			// this is rather clumsy tbh
			this.zoomFunc.translateTo(this.$zoom, (this.x0(new_domain[0]) + this.x0(new_domain[1])) / 2, 0);
			
			// limit to dataset window

			const enclosing_domain = this.data_controller.expand_domain(new_domain);
			const did_wrap_right = (this.x0(new_domain[1]) - this.px_x_shift) * this.state.px_ratio > this.area_canvas.current.width,
			did_wrap_left = (this.x0(new_domain[0]) - this.px_x_shift) < 0;
			if(did_wrap_left || did_wrap_right) {
				this.data_controller.clear_visible();
				this.area_ctx.clearRect(0, 0, this.area_canvas.current.width, this.area_canvas.current.height);
				if(did_wrap_right) {
					// wrap around right ; new data will draw off canvas
					// for now, just assume a single data frame is in view
					// when using `this.x` to transform the x-shift in time, we assume that `this.x` is a linear scale; if logarithmic or something else funky then we have to convert that time delta to a px delta more carefully
					this.px_x_shift = this.x0(enclosing_domain[0]) - this.x0(this.domain1[0]);
				}
				else if(did_wrap_left) {
					this.px_x_shift = this.x0(enclosing_domain[1]) - this.area_canvas.current.width / this.state.px_ratio;
				}
			}

			this.x.domain(new_domain); // i hate that this is the only reason we need to lift `x` into the global object scope
			this.h_x_ax.call(this.x_ax); // same with `h_x_ax``
			
			const tf_str = `translate(${-this.x0(new_domain[0]) + this.px_x_shift}px, 0) scale(${this.props.tf.k}, 1)`;
			this.area_canvas.current.style.transform = tf_str;
			// this.$gBrushes.selectAll('.brush')
			//               .each(function() {
			//               	const annotations = this.getAttribute('data-annotation').split('-');
			//               	that.move_brush(annotations.length > 1 ? annotations.map(i => that.props.annotations.get(parseInt(i))) : that.props.annotations.get(parseInt(annotations[0])));
			//               });
			              
			this.minimap_brush.call(this.minimap_brusher.move, [this.minimap_x(new_domain[0]), this.minimap_x(new Date(new_domain[0].getTime() + FULL_RES_INTERVAL * 1000))])
		
			return this.resampleData(new_domain);
			// if(did_wrap_left || did_wrap_right) {
			// }
			// else {
			// 	this.resampleData(new_domain); // this might miiiight be a race condition against the React data plumbing
			// 	return Q();
			// }
		}
		
		// evented canvas moving
		if(this.props.annotation_preview_id != null && this.props.annotation_preview_nonce !== prevProps.annotation_preview_nonce) {
			console.log(this.props.annotation_preview_id);
			this.props.onZoom(this.dry_zoom_to_annotation(this.props.annotation_preview_id));
		}
		
		if(this.props.annotating_id != null && this.props.annotating_nonce !== prevProps.annotating_nonce) {
			// this.zoom_to(d3.transform.)
			this.props.onZoom(this.dry_zoom_to_annotation(this.props.annotating_id));
			this.setState({
				is_annotating: true,
				annotating_id: this.props.annotating_id,
				annotating_at: [this.x(this.props.annotations.get(this.props.annotating_id).get_start()), 100],
			});
		}
	}
	
	/* protected */
	move_brush(annotation) {
		const brush = d3.brushX()
		    .extent([[0, 0], [this.x0(this.data_controller.domain0[1]), this.area_canvas.current.height / this.state.px_ratio]])
		    .on("start", _ => this.setState({ is_brushing: true }))
		    // .on("brush", function() { console.log(arguments, this); })
		    .on("end", () => {
    	 		console.log('A', annotation, Array.isArray(annotation));
		    	if(Array.isArray(annotation)) {
		    		switch(annotation.length) {
						case 2:
							for(let j = 0; j < annotation.length; j++) {
							 	const annotation_ = Object.assign(Object.create(Object.getPrototypeOf(annotation[j])), annotation[j]);
							 	annotation_.update_with_selection(d3.event.selection.slice(j, j+1).map(s => this.x.invert(s)));
							 	annotation[j] = annotation_; // meh mutation hack
							}
							break;
					}
		    	}
		    	else {
			    	const annotation_ = Object.assign(Object.create(Object.getPrototypeOf(annotation)), annotation);
			    	annotation_.update_with_selection(d3.event.selection.map(s => this.x.invert(s)));
			    	annotation = annotation_;
		    	}
		    	
	    	 	if(this.state.is_brushing && d3.event.sourceEvent instanceof MouseEvent) {
	    	 		console.log('B', annotation, Array.isArray(annotation));
	    	 		if(Array.isArray(annotation)) {
	    	 			for(const a of annotation)
			    			this.props.onAnnotate(a); // let the logic upstairs also deal with the type of brush this is
	    	 		}
		    		else
		    			this.props.onAnnotate(annotation);
	    	 	}
	    		
		    	this.setState({ is_brushing: false }); // needed to prevent recursive updates from onAnnotate -> updateBrushes -> on('end')
		    });
		   
		if(Array.isArray(annotation)) {
			const $gBrush = d3.select(`g#brush-${annotation.map(a => a.id).join('-')}`);
			
			switch(annotation.length) {
				case 2:
					
					$gBrush.attr("class", "brush range");

					// Move the brush to the startTime and endTime
					if($gBrush.select('rect').size() === 0)
						$gBrush.call(brush)
					
					// debugger;
					$gBrush.call(brush.move, [ annotation[0].get_start(), annotation[1].get_start() ].map(this.x));
					break;
				default:
					// let your imagination run wild here
					break;
			}
		}
		else { 
			// switch(annotation.constructor) {
			// 	case PointBrush:
			const $gBrush = d3.select(`g#brush-${annotation.id}`);

			// Move the brush to the startTime + a fixed width
			// console.log(this.domain1, annotation.get_start(), this.x0(annotation.get_start()), this.x0(annotation.get_start()) + 2, brush_(annotation).extent);
			if($gBrush.select('rect').size() === 0)
				$gBrush.call(brush)
			
			// debugger;	
			$gBrush.call(brush.move, [this.x(annotation.get_start()), this.x(annotation.get_start()) + 2]);
			
			$gBrush.selectAll('.brush>.handle').remove();
			$gBrush.attr("class", "brush point");
					// Remove the handles so can't be resized
					// break;
			// }
		}
		d3.selectAll('.brush > .overlay').remove();
	}
	
	/* protected */
	updateBrushes() {
		// If point, add brush, delete handles, add title (after)
		// If range, add brush, add custom handles with titles
		// group_point_annotations(this.props.annotations.toList()).forEach(this.move_brush.bind(this));
		// debugger;
	}

	render = () => <div ref={this.wrap} className="d3wrap">
		{ !this.state.is_annotating ? null :
			<AnnotateView
				annotation={this.props.annotations.get(this.state.annotating_id) /* for existing annotations */}
				startTime={this.x.invert(this.state.annotating_at[0])}
				screenPosY={100}
				screenPosX={this.state.annotating_at[0]}
				onSubmit={annotation => {
					const annotating_id = this.state.annotating_id;
					this.props.onAnnotate(annotation);
					this.setState(state_ => {
						const ret = { is_annotating: false }
						if(state_.annotating_id === annotating_id)
							ret.annotating_id = null;
						
						return ret;
					});
				}}
				onCancel={() => this.setState({ is_annotating: false })}
				annot_id={this.props.annot_id}
			/>
		}
		<div className="plot-container">
			<canvas className="plot" ref={this.area_canvas} />
		</div>
		<svg className="plot" ref={this.svg}>
			<g ref={this.area}></g>
			<g className="brushes" ref={this.gBrushes}>
				{group_point_annotations(this.props.annotations.toList()).map((a, i) => {
					const bulk_id = Array.isArray(a) ? a.map(a_ => a_.id).join('-') : a.id;
					return <g
						id={`brush-${bulk_id}`}
						key={bulk_id}
						className='brush'
						data-annotation={bulk_id}
					/>
				})}
			</g>
			<rect id="zoom" className="zoom" style={{ display: this.props.is_editing ? 'none' : 'block' }} ref={this.zoom} />
		</svg>
		<canvas ref={this.minimap_canvas} id="minimap_canvas" style={{ height:`${MINIMAP_HEIGHT}px` }}></canvas>
		<svg ref={this.minimap_svg} height={MINIMAP_HEIGHT} id="minimap_svg">
			<g ref={this.minimap_area} />
		</svg>
	</div>

	// force resampling of data when zoom is done manually
	resampleData = new_domain => {
		// console.log(new_domain);
		const channel_offset = (this.y.domain()[1]-this.y.domain()[0])/(NUM_CH + 2); // +2 leaves gap at bottom and top
		const offset = i => (i + 0.5 - NUM_CH / 2) * channel_offset;
		
		const enclosing_domain = this.data_controller.expand_domain(new_domain);
		this.data_controller.get_data(new_domain)
			.then(data => {
				// draw the data
				// const COLORS = ['#F00', '#0F0', '#00F', '#0FF', '#F0F'];
				if(data.length > 0) {
					// console.log(data[0][0][0], x(data[0][0][0]), data[data.length - 1][data[data.length - 1].length - 1][0], x(data[data.length - 1][data[data.length - 1].length - 1][0]), data.length);
					for(let ch = 0; ch < data[0][0][1].length; ch++) {
						for(let chunk_idx = 0; chunk_idx < data.length; chunk_idx++) {
							const chunk = data[chunk_idx];
							// this.area_ctx.strokeStyle = COLORS[chunk_idx];
							let first_point = true;
							this.area_ctx.beginPath();
							for(const [t, sample] of chunk) {
								(first_point ? this.area_ctx.moveTo : this.area_ctx.lineTo).call(
									this.area_ctx,
									(this.x0(t) - this.px_x_shift) * this.state.px_ratio, (this.y(sample[ch] / (NUM_CH + 2) + offset(channels[ch])) * this.state.px_ratio)
								);
								first_point = false;
							}
							// if(px_x_shift > 0)
							// 	debugger;
							this.area_ctx.stroke();
						}
					}
				}
			}).catch(console.log)
	}
}