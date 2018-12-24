import Frac from 'fraction.js';
import Q from 'q';

export default class {
	constructor(chunks, domain0, requestor) {
		// StampedData := Array<float, Array<float>>
		this.chunks = chunks; // Array<(zoom: int, stamped_data: StampedData)>
		this.domain0 = domain0; // Array<float, float> // time coordinates
		this.requestor = requestor; // (zoom: int, start: Frac, end: Frac) => Promise<Array<StampedData>>
		this.target = [true, []]; // has_new, zoom, chunks_to_replace
		this.is_working = false;
	}
	update(domain) { // in time coordinates
		const now_zoom = -Math.ceil(Math.log2((domain[1] - domain[0]) / (this.domain0[1] - this.domain0[0])));
		this.target = [now_zoom, domain];
		
		if(!this.is_working) {
			const that = this;
			function work() {
				const target_domain = that.target[1];
				const domain_frac = [
					new Frac(target_domain[0] - that.domain0[0]).div(that.domain0[1] - that.domain0[0]),
					new Frac(target_domain[1] - that.domain0[0]).div(that.domain0[1] - that.domain0[0])
				];
				const chunks_to_replace = [];
				let running_frac = new Frac(0);
				for(let i = 0; i < that.chunks.length; i++) {
					const chunk_zoom = that.chunks[i][0];
					const end = running_frac.add(Frac(1).div(1 << chunk_zoom));
					if(
						chunk_zoom < Math.floor(that.target[0]) && (
							(running_frac.compare(domain_frac[0]) > 0) !== (end.compare(domain_frac[0]) > 0) ||
							(running_frac.compare(domain_frac[1]) > 0) !== (end.compare(domain_frac[1]) > 0)
						)
					) {
						// intersection, replace this block with this zoom level
						chunks_to_replace.push([i, running_frac, end]); // running_frac and end are redundant, but save computation in the actual replacement logic
						// console.log([i, running_frac.valueOf(), end.valueOf()]);
						// TODO: cluster blocks for faster access to disk. Need to include a `num` in each `chunks_to_replace` to know how many to splice in a row
						// either that, or shove the for loop below into here
					}
					running_frac = end;
				}
				if(chunks_to_replace.length > 0) {
					return Q.all(chunks_to_replace.map(([i, start, end]) => {
						const new_zoom = that.chunks[i][0] + 1;
						// console.log('R', new_zoom, start, end)
						return that.requestor(new_zoom, start, end)
							.then(chunks => [i, new_zoom, chunks]);
					}))
						.then((new_chunk_groups) => {
							let running_new_chunks = 0;
							for(const [i, new_zoom, new_chunks] of new_chunk_groups) {
								// console.log(running_new_chunks, new_chunks.length);
								Array.prototype.splice.apply(that.chunks, [i + running_new_chunks, 1].concat(new_chunks.map(chunk => [new_zoom, chunk])));
								running_new_chunks += new_chunks.length - 1;
							}
							// console.log('---');
							return work();
						});
				}
				else {
					that.is_working = false;
					return Q(true);
				}
			}
			this.is_working = true;
			return work(); // the outer scope will always be responsible for updating the graph view
		}
		else {
			return Q(false);
		}
	}
	get_data() {
		return this.chunks.reduce((acc, chunk) => acc.concat(chunk[1]), []); // flatten chunks into stamped data array
	}
}