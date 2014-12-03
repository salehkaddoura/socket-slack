var socket = io();
var messages =  false;

//PASS THE NAME OF THE USER TO THE SERVER
$('#set-name').submit(function(e) {
	e.preventDefault();
	var nickname = $('#username').val();
	socket.emit('join', nickname, function(data) {
	// console.log(data);
	if(data) {
		$('.login-container').hide();
		$('.chat-window').prepend('Connected to Salmon!');
	} else {
		alert('This name is already taken!');
	}
	});
	$('#username').val(' ');
});

//SEND EACH MESSAGE TO THE SERVER
$('#send-message').submit(function(e) {
	e.preventDefault();
	var message = $('#message').val();
	//emit the messages event on the server
	socket.emit('messages', message);
	$('#message').val(' ');
});

//GET THE RESPONSE FROM THE SERVER AND DISPLAY THE MESSAGES ON THE CLIENT
socket.on('messages', function(data) {
	// console.log(data);
	$('#message-wrap').append('<li>' + data.nick + ': ' + data.msg + '</li>');
});

socket.on('whisper', function(data) {
	console.log(data);
	$('#message-wrap').append('<li>' + data.nick + ': ' + data.msg + '</li>');
});

//EVERYTIME A USER JOINS DISPLAY ALL PREVIOUS MESSAGES ON THE CLIENT
socket.on('allMessages', function(data) {
	if (!messages) {
		messages = true;
		for (var i = 0; i < data.nick.length; i++) {
			var user = data.nick[i];
			var message = data.msg[i];
			$('#message-wrap').append('<li>' + user + ': ' + message + '</li>');
		};
	};
	// console.log('all msgs: ' + data);
});

//EVERYTIME A USER JOINS DISPLAY ALL USERNAMES ON THE CLIENT
socket.on('usernames', function(data) {
	// console.log(data);
	var names = '';
	for(var i = 0; i < data.length; i++) {
		names += data[i] + '<br/>';
	}
	$('#user-list').html(names);
});

socket.on('leave', function(data) {
	$('#message-wrap').append(data + ' has left the room!<br/>');
});

socket.on('newuser', function(data) {
	$('#message-wrap').append(data + ' has joined the room!<br/>');
});