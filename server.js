var express = require('express');
var path = require('path');
var mysql = require('mysql');
var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

//serve static files in the 
app.use('/public', express.static(path.join(__dirname + '/public')));

app.get('/', function (req, res) {
  	res.render('messages');
});

app.listen(3000, function () {
  	console.log('Example app listening on port 3000!');
});