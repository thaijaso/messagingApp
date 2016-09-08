var app = require('express')();
var path = require('path');
var session = require('express-session');
var mysql = require('mysql');
var moment = require('moment');
var bodyParser = require('body-parser');
var server = require('http').Server(app);
var io = require('socket.io')(server);
var routes = require('./routes.js');

//connect to heroku database
var pool = mysql.createPool({
  	host     : 'us-cdbr-iron-east-04.cleardb.net',
  	user     : 'b813a1e61364f2',
  	password : '2628f177',
  	database : 'heroku_f7a2513ae4d0f1b'
});

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.set('port', process.env.PORT || 8888);

//serve static files in the public folder
app.use('/public', require('express').static(path.join(__dirname + '/public')));

//middleware for passing data bewteen routes
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//use session middleware
app.use(session({
	secret: 'keyboard cat', 
	cookie: {maxAge: 60000},
	resave: true,
	saveUninitialized: false
}));

server.listen(app.get('port'), function() {
	console.log('listening on port:', app.get('port'));
});

//mount routes
app.use('/', routes);



//socket events
io.on('connection', function(socket){

	console.log('client connected');
	
	socket.on('send-message', function(data) {
	    var message = data.message;

	    pool.getConnection(function(err, connection) {
			connection.query("INSERT INTO messages (message, created_at) VALUES (" + "'" + message + "'" + ", " + "'" + moment().format('YYYY-MM-DD HH:mm:ss') + "'" + ")  ;", function(err, rows) {
				
				if (err) {
					console.log(err);
				} else {
					console.log(rows);
				}
				
				connection.release();

				io.emit('update-message-area', {'message': message});
			});
		});
	});
  	
  	socket.on('disconnect', function(){

  	});
});
