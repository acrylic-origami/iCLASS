import React from 'react';
import * as d3 from 'd3';

export default class extends React.Component {
	constructor(props) {
		super(props);

		this.d_minimap_svg = React.createRef();
		this.d_minimap_area = React.createRef();

		this.$d_minimap_svg = d3.select(this.d_minimap_svg.current);
		this.$d_minimap_area = d3.select(this.d_minimap_area.current);
	}

	componentDidMount() {
		this.$d_minimap_svg = d3.select(this.d_minimap_svg.current);
		this.$d_minimap_area = d3.select(this.d_minimap_area.current);

		this.onDatasetUpdate();
	}

	render = () =>
		<div>
			<svg ref={this.d_minimap_svg} width={this.props.width} height={this.props.height}>
				<g ref={this.d_minimap_area}></g>
			</svg>
		</div>

	onDatasetUpdate = () => {
		// d_MINIMAP SETUP
		(() => {
			const domain0 = [new Date(this.props.datasets[0].start), (new Date(this.props.datasets[this.props.datasets.length - 1].end))];

			const x = d3.scaleTime()
			            .range([0, +this.$d_minimap_svg.attr('width')])
			            .domain(domain0);

			const y = d3.scaleLog()
			            .range([+this.$d_minimap_svg.attr('height'), 0])
			            .domain([0, this.props.height]);

			const x_ax = d3.axisBottom(x),
			      y_ax = d3.axisLeft(y);
			      
			const h_x_ax = this.$d_minimap_area.append('g').attr('class', 'axis axis--x').call(x_ax);
			const h_y_ax = this.$d_minimap_area.append('g').attr('class', 'axis axis--y').call(y_ax);
			
			const that = this;
			this.$d_minimap_area.selectAll('rect')
			                  .data(this.props.datasets)
			                  .enter()
			                  .append('rect')
			                  .each(function (d, i) {
			                  	console.log(d.start);
			                  	console.log(new Date(d.start));
			                  	console.log(x(new Date(d.start)));
			                  	console.log(x(new Date(d.end)) - x(new Date(d.start)));
			                  	d3.select(this).attrs({
				                  	'class': 'd_minimap-chart-ele',
				                  	'x': x(new Date(d.start)),
				                  	'y': 0,
				                  	'width': x(new Date(d.end)) - x(new Date(d.start)),
				                  	'height': that.props.height,
				                  	'fill': 'blue'
				                  })
			                  });
		})();
	}
}