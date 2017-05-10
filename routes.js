var express = require('express');
var mysql = require('mysql');
var moment = require('moment');

var pool = mysql.createPool({
  	host     : 'us-cdbr-iron-east-04.cleardb.net',
  	user     : 'b813a1e61364f2',
  	password : '2628f177',
  	database : 'heroku_f7a2513ae4d0f1b'
});



module.exports = (function() {
	var router = express.Router();

	//show login page
	router.get('/', function(req, res) {
		res.render('login');
	});

	//show register page
	router.get('/register', function(req, res) {
		res.render('register');
	});

	//add user to database
	router.post('/register', function(req, res) {
		var username = req.body.username;
		var password = req.body.password;
		pool.getConnection(function(err,connection) {
			connection.query("INSERT INTO users (username, password) VALUES ('" + username + "'" + "," + "'" + password + "'" + ")", function(err, rows) {
				if (err) {
					console.log(err);
				} else {
					console.log(rows);
				}
				res.send([rows]);
				connection.release();
			});
		});
	});

	//show login page
	router.get('/login', function(req, res) {
		res.render('login');
	});

	//post login info and check to see if user exists
	router.post('/login', function(req, res) {
		pool.getConnection(function(err, connection) {
			connection.query("SELECT * FROM users WHERE users.username = ? AND users.password = ?", 
			[req.body.username, req.body.password], function(err, rows) {
				if (err) {
					console.log(err);
				} else {
					console.log('Success querying users');
				}

				connection.release();

				if (rows.length) {
					var user = rows[0];
					req.session.userId = user.id;
					console.log(req.session);
					var username = user.username;
					var password = user.password;
					var userId = user.id;
					res.send([{'message': 'Success', 'username': username, 'password': password, 'userId': userId}]);
				} else {
					console.log('user not found');
					res.send([{'message': 'Error'}]);
				}
			});
		});
	});
	
	//Show contacts page
	router.get('/contacts/:userId', function(req, res) {
		pool.getConnection(function(err, connection) {
			var query = "SELECT * FROM users";
			var userId = req.params.userId;
			// console.log(userId);

			connection.query(query, [userId], function(err, rows) {

				if (err) {
					console.log(err);
				} else {
					console.log('success querying users');
				}

				connection.release();
				// console.log("rows " + rows);

				res.send(rows);
			});
		});
	});

	//Get conversations with user
	router.get('/conversations/:userId', function(req, res) {
		pool.getConnection(function(err, connection) {
			var query = 'SELECT message_id, message, created_at, user_id AS sender_id, recipient_id, username AS recipientName ' +
						'FROM messages ' +
						'JOIN users_has_messages ' +
						'ON users_has_messages.message_id = messages.id ' +
						'JOIN users ON users.id = users_has_messages.recipient_id ' +
						'WHERE created_at IN ( ' +
						    'SELECT MAX(created_at) ' +
						    'FROM messages ' +
						    'JOIN users_has_messages ' +
						    'ON users_has_messages.message_id = messages.id ' +
						    'WHERE users_has_messages.user_id = ? ' +
						    'GROUP BY recipient_id ' +
						') ' +
						'ORDER BY created_at DESC';

			var userId = req.params.userId;
			console.log(userId);

			connection.query(query, [userId], function(err, rows) {

				if (err) {
					console.log(err);
				} else {
					console.log('success querying messages');
				}

				connection.release();

				res.send(rows);
			});
		});
	});

	//show messages between two people
	router.get('/messages/:senderId/:recieverId', function(req, res) {
		//if session set, show messages, otherwise redirect to login
		if (req.session.userId) {
			pool.getConnection(function(err, connection) {
				connection.query("SELECT * FROM users JOIN users_has_messages ON users.id = users_has_messages.user_id JOIN messages ON messages.id = users_has_messages.message_id WHERE (users.id = " + req.params.senderId + " AND users_has_messages.recipient_id = " + req.params.recieverId + ") OR (users.id = " + req.params.recieverId + " AND users_has_messages.recipient_id = " + req.params.senderId + ") ORDER BY created_at ASC;", function(err, rows) {
					if (err) {
						console.log(err);
					} else {
						console.log('Success querying messages');
					}
					
					connection.release();
					
					var messages = [];
					
					for (var i = 0; i < rows.length; i++) {
						messages.push(rows[i]);
					}

					res.render('messages', {'messages': messages, 
						'userId': req.session.userId, 'recipientId': req.params.recieverId});	
				});
			});
		} else {
			res.redirect('/login');
		}
	});

	//Send message from user to another
	router.post('/send-message/:senderId/:reciverId', function(req, res) {
		//if session set proceed to query, otherwise redirect to login
		if (req.session.userId) {

			var message = req.body.message; 
			var userId = req.body.userId; 
			var recipientId = req.body.recipientId;
			
			pool.getConnection(function(err,connection) {	

				connection.query("INSERT INTO messages (message, created_at) VALUES ('" + message + "', '" + moment().format('YYYY-MM-DD HH:mm:ss') + "')", function(err, rows) {
					if (err) {
						console.log(err);
					} else {
						console.log('Sucess querying messages');
					}
				});	

				connection.query("INSERT INTO users_has_messages (user_id, message_id, recipient_id) VALUES ('" + userId + "', last_insert_id(), '" + recipientId + "')", function(err, rows) {
					if (err) {
						console.log(err);
					} else {
						console.log('Success querying users_has_messages');
					}
				});
				
				connection.release();
				res.send(rows);	
			});		
		} else {
			res.redirect('/login');
		}
	});

	return router;
})();