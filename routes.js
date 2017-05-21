var express = require('express');
var mysql = require('mysql');
var moment = require('moment');
const multer = require('multer');
const upload = multer({ dest: 'public/img/' });
const fs = require('fs');


var pool = mysql.createPool({
  	host     : 'us-cdbr-iron-east-04.cleardb.net',
  	user     : 'b813a1e61364f2',
  	password : '2628f177',
  	database : 'heroku_f7a2513ae4d0f1b',
  	charset  : 'utf8mb4'
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
			var query = "SELECT id AS userId, username, password, profileImgPath FROM users";
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
		console.log('HEREEEEE');

		pool.getConnection(function(err, connection) {
			var query = 'SELECT message_id AS messageId, message, created_at AS createdAt, user_id AS senderId, recipient_id AS recipientId, users.username AS senderName, users2.username AS recipientName,  users2.profileImgPath AS recipientProfileImgPath, users.profileImgPath AS senderProfileImgPath ' +
						'FROM messages ' +
						'JOIN users_has_messages ON users_has_messages.message_id = messages.id ' +
						'JOIN users ON users.id = users_has_messages.user_id ' +
						'JOIN users AS users2 ON users2.id = users_has_messages.recipient_id ' +
						'WHERE users_has_messages.user_id = ? ' +
						'OR users_has_messages.recipient_id = ? ' +
						'GROUP by message_id ' +
						'ORDER BY created_at DESC';
			
			var userId = req.params.userId;
			console.log(userId);

			connection.query(query, [userId, userId], function(err, rows) {

				if (err) {
					console.log(query);
					console.log(err);
				} else {
					console.log('success querying messages');
				}

				connection.release();

				var convoMap = {}; // Use this object to identify unique conversations the user is having
				var convos = []; // send as the JSON response, should be orders by latest convo

				// Generate the latest conversations since i couldn't write one nice SQL query
				// To get the latest message for each conversation :(
				for (var i = 0; i < rows.length; i++) {
					var senderId = rows[i].senderId
					var recipientId = rows[i].recipientId;

					if (senderId != userId) {
						if (!(senderId in convoMap)) { // here we check to see if the senderId is not in the map
							convoMap[senderId] = rows[i];
							convos.push(rows[i]);
						}
					}

					if (recipientId != userId) { // here we check to see if the recipientId is not in the map
						if (!(recipientId in convoMap)) {
							convoMap[recipientId] = rows[i];
							convos.push(rows[i]);
						}
					}
				}

				res.send(convos);
			});
		});
	});

	//show messages between two people
	router.get('/messages/:senderId/:recipientId', function(req, res) {
		pool.getConnection(function(err, connection) {
			var query = 'SELECT message_id AS messageId, message, users.username AS senderName, users2.username AS recipientName, users.id AS senderId, users2.id AS recipientId ' + 
						'FROM users ' +
						'JOIN users_has_messages ON users.id = users_has_messages.user_id ' +
						'JOIN users AS users2 ON users2.id = users_has_messages.recipient_id ' +
						'JOIN messages ON messages.id = users_has_messages.message_id ' +
						'WHERE (users.id = ? AND users_has_messages.recipient_id = ?) ' +
						'OR (users.id = ? AND users_has_messages.recipient_id = ?) ' +
						'ORDER BY created_at ASC';

			var senderId = req.params.senderId;
			var recipientId = req.params.recipientId;

			connection.query(query, [senderId, recipientId, recipientId, senderId], function(err, rows) {
				if (err) {
					console.log(err);
				} else {
					console.log('Success querying messages');
				}
				
				connection.release();
				

				res.send(rows); // is that ok?	
			});
		});
	});



	//Send message from user to another
	router.post('/send-message/:senderId/:recipientId', function(req, res) {
		var message = req.body.message; 
		var senderId = req.params.senderId; 
		var recipientId = req.params.recipientId;

		console.log(message);
		console.log(senderId);
		console.log(recipientId);
		
		pool.getConnection(function(err,connection) {	
			connection.query("INSERT INTO messages (message, created_at) VALUES ('" + message + "', '" + moment().format('YYYY-MM-DD HH:mm:ss') + "')", function(err, rows) {
				if (err) {
					console.log(err);
				} else {
					console.log('Sucess querying messages');

					connection.query("INSERT INTO users_has_messages (user_id, message_id, recipient_id) VALUES ('" + senderId + "', last_insert_id(), '" + recipientId + "')", function(err, rows) {
						if (err) {
							console.log(err);
						} else {
							console.log('Success querying users_has_messages');
							connection.release();
							res.send(rows);	
						}
					});
				}
			});	
		});		
	});


	// post a profile picture
	router.post('/upload-photo/:userId', upload.single('avatar'), function(req, res) {
        console.log(req.file);
        var tempPath = req.file.path;
        var targetPath = 'public/img/' + req.file.originalname;

        var userId = req.params.userId;

        console.log(userId);

        // console.log

        var src = fs.createReadStream(tempPath);
        var dest = fs.createWriteStream(targetPath);
        src.pipe(dest);

        src.on('end', function() {
            pool.getConnection(function(err, connection) {
                if (err) {
                    console.log(err);
                    res.send(err);
                }

                var filePath = 'img/' + req.file.originalname;

                var query = connection.query("UPDATE users SET profileImgPath = ? WHERE id = ?", [filePath, userId], function(err, rows) {

                    if (err) {
                        console.log(err);
                        res.send(err);
                    }

                    connection.release();
                    res.send([rows]);

                });
                console.log(query.sql);
            });
        });

        src.on('error', function(err) {
            res.send('error');
        });
});

		//get user information (used for profile image)
	router.get('/getUserInfo/:userId', function(req, res) {
		pool.getConnection(function(err, connection) {
			var query = "SELECT * FROM users WHERE users.id = ?";
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
	


	return router;
})

();