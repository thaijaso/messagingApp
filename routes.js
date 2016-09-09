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

	//show all messages in the database
	router.get('/', function(req, res) {
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

				var messageObj = {'messages': allMessages};

				res.render('messages', messageObj);
	  		});
	  	});
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
				connection.release();
			});
		});
	});

	//show login page
	router.get('/login', function(req, res) {
		res.render('login');
	});

	//verify user and set session
	router.post('/login', function(req, res) {
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
	
	//Show contacts page
	router.get('/contacts', function(req, res) {
		pool.getConnection(function(err, connection) {
			connection.query("SELECT * FROM users", function(err, rows) {
				if (err) {
					console.log(err);
				} else {
					console.log(rows);
				}
				connection.release();

				//if session is set, go to contacts page, otherwise login
				if (req.session.userId) {
					res.render('contacts', {'users': rows, 'userId': req.session.userId});
				} else {
					res.redirect('/login');
				}
				
			});
		});
	});

	//show messages between two people
	router.get('/messages/:senderId/:recieverId', function(req, res) {
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

				res.render('messages', {'messages': messages});	
			});
		});
	});

	//Send message from user to another
	router.post('/send-message/:senderId/:reciverId', function(req, res) {
		var message = req.body.message; 
		var userId = req.body.userId; 
		var recipientId = req.body.recipientId;
		//TODO: Query the db to insert a message. Will require 2 inserts. 
		//QUERIES BELOW: 
			//INSERT INTO messages (message, created_at)
			// VALUES ('jason -> shema3', now());

			// INSERT INTO users_has_messages (user_id, message_id, recipient_id)
			// VALUES (2, last_insert_id(), 12);	

			//"INSERT INTO users (username, password) VALUES ('" + username + "'" + "," + "'" + password + "'" + ")", function(err, rows) {
			pool.getConnection(function(err,connection) {	

				connection.query("INSERT INTO messages (message, created_at) VALUES ('" + message + "', '" + moment().format('YYYY-MM-DD HH:mm:ss') + "')", function(err, rows) {
					if (err) {
						console.log(err);
					} else {
						console.log(rows);
					}
				});	

				connection.query("INSERT INTO users_has_messages (user_id, message_id, recipient_id) VALUES ('" + userId + "', last_insert_id(), '" + recipientId + "')", function(err, rows) {
					if (err) {
						console.log(err);
					} else {
						console.log(rows);
					}
				});
			connection.release();	
			});		
		res.end();
	});

	return router;
})();