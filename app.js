var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

//ROUTING
app.use(express.static(__dirname + '/public'));


/*LISTEN FOR CONNECTIONS
io.on('connection', function(client) {
	console.log('Client Connected...');
	emit a messages event on the client
	client.emit('messages', { hello: 'world' });
});
*/

/*listen for messages events
io.on('connection', function(client) {
	client.on('messages', function(data) {
		console.log(data);
	});
});
*/

//broadcast messages to all clients connected
// io.on('connection', function(client) {
// 	client.on('messages', function(data) {
// 		console.log('message: ' + data);
// 		io.emit('messages', data);
// 	});
// });
var messages = [];
var userList = [];

var storeMessage = function(name, data) {
	messages.push({name: name, data:data});
	if(messages.length > 20) {
		messages.shift();
	}
}

var storeUsername = function(user) {
	userList.push({user: user});
};

//adding usernames
io.on('connection', function(client) {
	client.on('join', function(name) {
		client.nickname = name;
		console.log(name + ' joined the chat');
		storeUsername(name);
		messages.forEach(function(message) {
			io.emit('messages', message.name + ": " + message.data);
		});

		
		io.emit('usernames', name);
		console.log(userList);
	});
	client.on('messages', function(data) {
		var nickname = client.nickname;
		console.log(nickname + ' said: ' + data);
		io.emit('messages', nickname + ': ' + data);
		storeMessage(nickname, data);
	});

	client.on('disconnect', function() {
		console.log('user disconnected')
	});
});

server.listen(3000)



