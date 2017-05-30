var app = require('express')();
var path = require('path');
var session = require('express-session');
var mysql = require('mysql');
var moment = require('moment');
var bodyParser = require('body-parser');
var server = require('http').Server(app);
var io = require('socket.io')(server);
var routes = require('./routes.js');

/* For logging objects in console */
const util = require('util');


//connect to heroku database
var pool = mysql.createPool({
  	host     : 'us-cdbr-iron-east-04.cleardb.net',
  	user     : 'b813a1e61364f2',
  	password : '2628f177',
  	database : 'heroku_f7a2513ae4d0f1b',
  	charset  : 'utf8mb4'
});

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.set('port', process.env.PORT || 8888);

//serve static files in the public folder
app.use('/public', require('express').static(path.join(__dirname + '/public')));
// app.use('/js', express.static(__dirname + '/public'));


//middleware for passing data bewteen routes
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//use session middleware
app.use(session({
	secret: 'keyboard cat', 
	cookie: {maxAge: 86400000},	//24hrs
	resave: false,
	saveUninitialized: false
}));

server.listen(app.get('port'), function() {
	console.log('listening on port:', app.get('port'));
});

//mount routes
app.use('/', routes);

//current connected sockets
var currentConnections = {};
var onlineUsers = [];

//socket events
io.on('connection', function(socket) {

	console.log('client: ' + socket.id + ' connected');
	//store socket
	currentConnections[socket.id] = {'socket': socket, 'userId': null};

	//Grab the clients userId to associcate it with its socket
	//change event to userCameOnline
	socket.on('sendUserId', function(data) {
		var userId = data.userId
		var otherUserId = data.otherUserId;

		console.log('otherUserId: ' + otherUserId);

		//Iterate through the connected sockets object looking for matching socket IDs
		for (socketId in currentConnections) {
			if (socketId == socket.id) {
				console.log('socket found -> link userId to socket');
				//set the userId in the connections Object to the userId 
				//passed in from the clients socket
				currentConnections[socketId].userId = userId;
				onlineUsers.push({userId: userId});
			}
		}
		
		console.log(onlineUsers);
		io.emit('usersOnline', onlineUsers);
	});

	//Client is typing a message
	socket.on('isTyping', function(data) {
		var recipientId = data.recipientId;
		console.log('isTyping to: ' + data.recipientId);
		//Iterate through the connected sockets boejct looking for the recipientId
		for (socketId in currentConnections) {
			if (recipientId == currentConnections[socketId].userId) {
				console.log('recipient found');
				io.to(socketId).emit('showChatBubbles');
			}
		}
	});
	
	socket.on('sendMessage', function(data) {
	    var message = data.message;
	    var userId = data.userId;
	    var recipientId = data.recipientId;

	    console.log('senderId: ' + userId);
	    console.log('recipientId: ' + recipientId);


	    var senderSocketId = socket.id;
	    var recipientSocketId;

	    console.log('current time: ' + moment().utcOffset(-420).format('YYYY-MM-DD HH:mm:ss'));

	    pool.getConnection(function(err,connection) {
	    	var query = "INSERT INTO messages (message, created_at) " +
	    				"VALUES (?, NOW())";

			connection.query("INSERT INTO messages (message, created_at) VALUES ('" + message + "', '" + moment().utcOffset(-420).format('YYYY-MM-DD HH:mm:ss') + "')", function(err, rows) {
				if (err) {
					console.log(err);
				} else {
					console.log('Sucess querying messages');

					connection.query("INSERT INTO users_has_messages (user_id, message_id, recipient_id) VALUES ('" + userId + "', last_insert_id(), '" + recipientId + "')", function(err, rows) {
						if (err) {
							console.log(err);
						} else {
							console.log('Success querying users_has_messages');
						}

						for (socketId in currentConnections) {
							console.log(socketId);
							
							if (currentConnections[socketId].userId == recipientId) {
								console.log('recipient is online');
								recipientSocketId = socketId;
								console.log(senderSocketId);
								console.log(recipientSocketId);
								//update recipient page
								io.to(socketId).emit('updateMessageArea', {'message': message});
							}
						}
						connection.release();	
					});
				}
			});	
		});		
	});

	socket.on('sendPhoto', function(data) {
		console.log('sendPhoto');
		console.log(data);
		var fileName = data.fileName;
		var recipientId = data.recipientId;
		var filePath = "img/" + fileName;
		
		for (socketId in currentConnections) {
			if (currentConnections[socketId].userId == recipientId) {
				console.log('sendPhoto: recipient is online');
				io.to(socketId).emit('updatePhotoMessage', {'filePath': filePath});
			}
		}
	});

	socket.on('userWentOffline', function(data) {
		console.log('userWentOffline: ' + data.userId);

		for (var i = 0; i < onlineUsers.length; i++) {
			if (onlineUsers[i].userId === data.userId) {
				console.log('found userId to delete');
				onlineUsers.splice(i, 1);
				console.log('onlineUsers: ' + util.inspect(onlineUsers, false, null));
			}
		}
	});
  	
  	socket.on('disconnect', function() {
  		console.log('client: ' + socket.id + ' disconnected');
  		delete currentConnections[socket.id];
  	});
});


