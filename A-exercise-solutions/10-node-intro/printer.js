var fs = require('fs');

exports.print = function (filename) 
{
	fs.readFile(filename, function(err, data) {
	    if (err) {
	        console.log("Unable to read file test.txt");
	    } else {
	        console.log("File Contents:");
	        console.log(data.toString());
	    }
	});
};