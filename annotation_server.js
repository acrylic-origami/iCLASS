module.exports = {
  annotToCSV: (annotations) => {
    const createCsvWriter = require('csv-writer').createObjectCsvWriter;  
	
	const csvWriter = createCsvWriter({  
	  path: 'out.csv',
	  header: [
	    {id: 'type', title: 'type'},
	    {id: 'startTime', title: 'startTime'},
	    {id: 'notes', title: 'notes'}
	  ]
	});

	csvWriter  
	  .writeRecords(annotations)
	  .then(()=> console.log('The CSV file was written successfully'));
  },
  loadAnnotations: () => {
    return new Promise(resolve => {
    	const csv = require('csv-parser');  
		const fs = require('fs');

		console.log('loadAnnotations');

		const results = [];

		fs.createReadStream('out.csv')  
		  .pipe(csv())
		  .on('data', (row) => {
		  	console.log('push row');
		    results.push(row);
		  })
		  .on('end', () => {
		  	console.log('return results');
		    resolve(results);
		  });
	});
  }
};