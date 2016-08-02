(function () {
   'use strict';
   // this function is strict...

  var express = require('express');
  var nightmare = require('nightmare')();
  var proxy = require('express-http-proxy');
  var cheerio = require('cheerio');
  var url = require('url');
  var apicache = require('apicache').options({ debug: true }).middleware;
  var process = require('process');
  
  var app = express();
  var args = { url : 'https://openlearnware.tu-darmstadt.de', port : '3000'};

  console.log(process.argv);
  var getArgPos = (k) => process.argv.indexOf('--' + k);

  for(let k in args) {
    if(getArgPos(k) !== -1) {
  		args[k] = process.argv[getArgPos(k)+1];
    }
  }	

  function getDOM(path) {

    return nightmare // open browser
    .goto(args.url + path) // goto requested url
    .wait() // wait for all js loaded
    .evaluate(function() {
  	return document.getElementsByTagName('html')[0].outerHTML; // return entire DOM
    });

  }

  // forward requests for static files
  app.use(['/assets/*','/vendor/*', '/olw-rest-db/*'], apicache('1 hours'), proxy(args.url, {
    forwardPath: function(req, res) {
  		return url.parse(req.baseUrl).path;
  	}
  }));

  // proxy all requests on openlearnware
  app.get('/**', apicache('1 hours'), function (req, res) {

    // request path
    var path = url.parse(req.url).path || '';

    // get DOM
    getDOM(path).then(function(dom) {

  	   // Remove all script tags
  	   var $ = cheerio.load(dom);
  	   $('script').remove();

  	   // response with modified html
  	   res.send($.html());
    }, function(e) {
  	   res.send(e);
    });

  });

  var server = app.listen(args.port, function () {

    var host = server.address().address;
    var port = server.address().port;
    console.log("Example app listening at http://%s:%s", host, port);
  });

}());