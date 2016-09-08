var app = require('express')();
var path = require('path');
var session = require('express-session');
var mysql = require('mysql');
var moment = require('moment');
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


app.post('/register', function(req,res) {
	console.log("username: " + req.body.username);
	console.log("password: " + req.body.password);
	var username = req.body.username;
	var password = req.body.password;
	pool.getConnection(function(err,connection) {
		connection.query("INSERT INTO users (username, password) VALUES ('" + username + "'" + "," + "'" + password + "'" + ")", function(err, rows) {
			if (err) {
				console.log(err);
			} else {
				console.log(rows);
			}
			connection.release();
		});
	});
});



app.get('/login', function(req, res) {
	res.render('login');
});

app.post('/login', function(req,res) {
	var username = req.body.username;
	var password = req.body.password;
	
	pool.getConnection(function(err, connection) {
		connection.query("SELECT * FROM users WHERE users.username = " + "'" + username + "'" + "AND users.password = " + "'" + password + "'", function(err, rows) {
			if (err) {
				console.log(err);
			} else {
				console.log(rows);
			}

			//user found
			if (rows.length) {
				console.log('user found');
				req.session.userId = rows[0].id;
				console.log(req.session.userId);
				res.redirect('/contacts');
			} else {
				console.log('user not found');
				res.send('error user not found');
			}

		});
	});
});

app.get('/contacts', function(req, res) {
	res.render('contacts');
});

//Get messages between two users
app.get('/messages/:senderId/:recieverId', function(req, res) {
	pool.getConnection(function(err, connection) {
		connection.query("SELECT * FROM users JOIN users_has_messages ON users.id = users_has_messages.user_id JOIN messages ON messages.id = users_has_messages.message_id WHERE (users.id = " + req.params.senderId + " AND users_has_messages.recipient_id = " + req.params.recieverId + ") OR (users.id = " + req.params.recieverId + " AND users_has_messages.recipient_id = " + req.params.senderId + ") ORDER BY created_at ASC;", function(err, rows) {
			if (err) {
				console.log(err);
			} else {
				console.log(rows);
			}
			
			connection.release();
			
			var messages = [];
			
			for (var i = 0; i < rows.length; i++) {
				messages.push(rows[i]);
			}

			res.send({'messages': messages});	
		});
	});
});

//Send message from user to another
app.post('/send-message/:senderId/:reciverId', function(req, res) {
	console.log(req);
	res.end();
});

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
