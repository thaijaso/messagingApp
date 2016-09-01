var app = require('express')();
var path = require('path');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var server = require('http').Server(app);
var io = require('socket.io')(server);

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
app.use(bodyParser());

server.listen(app.get('port'), function() {
	console.log('listening on port:', app.get('port'));
});

app.get('/', function (req, res) {
  	
  	pool.getConnection(function(err,connection) {
  		connection.query('SELECT * FROM messages;', function(err, rows) {
  			var allMessages = [];
  			
  			if (err) {
				console.log(err);
			} else {

				for(var i = 0; i < rows.length; i++) {
					var row = rows[i];
					allMessages.push(row.message);

				}
			}

			connection.release();

			var messageObj = {'allMessages': allMessages};

			res.render('messages', messageObj);
  		});
  	});
});

app.get('/register', function(req, res) {
	res.render('register');
});

io.on('connection', function(socket){
	
	socket.on('send-message', function(data) {
	    var message = data.message;

	    pool.getConnection(function(err, connection) {
			connection.query('INSERT INTO messages (message) VALUES ("' + message + '")  ;', function(err, rows) {
				
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
