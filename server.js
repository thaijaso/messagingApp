var express = require('express');
var path = require('path');
var mysql = require('mysql');
var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.set('port', process.env.PORT || 8888);

//serve static files in the 
app.use('/public', express.static(path.join(__dirname + '/public')));

app.get('/', function (req, res) {
  	res.render('messages');
});

var server = app.listen(app.get('port'), function() {
	console.log('listening on port: ', app.get('port'));
});