
// build a server that can server files from the public directory

var http = require('http');
var fs = require('fs');
var path = require('path');

var server = http.createServer(function (req, res) {
  console.log(req.url);

  var filename = path.join(__dirname, "public", req.url);
  console.log(filename);

  fs.exists(filename, function(exist) {
  	if (!exists) {
  		res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end("File does not exist " + req.url);
  	} else {
  		fs.readFile(filename, function(err, data) {
		    if (err) {
		      res.writeHead(200, {'Content-Type': 'text/plain'});
		      res.end("Unable to read file " + req.url);
		    } else {
		      res.writeHead(200, {'Content-Type': 'text/html'});
		      res.end(data.toString());
		    }
		  });
  	}
  });
});


server.listen(3000, '127.0.0.1');
