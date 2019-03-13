import Frac from 'fraction.js';
import Q from 'q';
import * as d3 from 'd3'
import { Map } from 'es6-shim';
import { FULL_RES_INTERVAL } from './consts';

export default class {
	constructor(dataset, domain0) {
		// StampedData := Array<float, Array<float>>
		this.dataset = dataset;
		this.chunks = new Map(); // Map<idx: int, StampedData>
		this.domain0 = domain0;
		this.zoom = Math.ceil(Math.log2((domain0[1] - domain0[0]) / 1000 / 30)); // FULL_RES_INTERVAL
		// this.requestor = requestor; // (zoom: int, start: Frac, end: Frac) => Promise<Array<StampedData>>
	}
	
	/* protected */
	request = (zoom, start, end) => d3.json(`data?dataset=${this.dataset}&zoom=${zoom}&start_N=${start.n}&start_D=${start.d}&end_N=${end.n}&end_D=${end.d}`);
	
	maybe_update(domain) {
		const new_chunks = this.domain_to_numerators(domain)
		                       .slice(1)
		                       .filter(v => !this.chunks.has(v));
		// console.log(new_chunks, domain);
		return new_chunks.reduce((acc, next_chunk, i) => acc.then(dataset => {
			const denom_zoom = Math.pow(2, this.zoom);
			return this.request(
				this.zoom,
				new Frac(next_chunk - 1).div(denom_zoom),
				new Frac(next_chunk).div(denom_zoom)
			).then(data => {
				dataset.push([next_chunk, data]);
				return dataset;
			});
		}), Q([]))
		                 .then(dataset => {
		                 	for(const [chunk_idx, data] of dataset)
		                 		this.chunks.set(chunk_idx, data);
		                 	return dataset.length > 0;
		                 });
	}
	
	get_data(domain) {
		return this.domain_to_numerators(domain)
		           .slice(1)
		           .filter(chunk_idx => this.chunks.has(chunk_idx))
		           .map(chunk_idx => [chunk_idx, this.chunks.get(chunk_idx)]);
	}
	
	/* protected */
	domain_to_numerators(domain) {
		const domain_frac = [
			new Frac(domain[0] - this.domain0[0], this.domain0[1] - this.domain0[0]),
			new Frac(domain[1] - this.domain0[0], this.domain0[1] - this.domain0[0])
		];
		console.log(domain_frac);
		// get all integer keys that are spanned by this range at the zoom level
		// ceil of each frac over the 1/2^zoom
		const bounds = [
			domain_frac[0].mul(Math.pow(2, this.zoom)).floor(),
			domain_frac[1].mul(Math.pow(2, this.zoom)).ceil()
		];
		return [...Array(bounds[1].valueOf() + 1).keys()].slice(bounds[0].valueOf());
	}
}