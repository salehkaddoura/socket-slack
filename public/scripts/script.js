var socket = io();
var messages =  false;

//PASS THE NAME OF THE USER TO THE SERVER
$('#set-name').submit(function(e) {
	e.preventDefault();
	var nickname = $('#username').val();
	socket.emit('join', nickname, function(data) {
	// console.log(data);
	if(data) {
		$('.login-container-wrap').hide();
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
	console.log(data);
	$('#message-wrap').append('<li><span class="user-identifier">' + data.nick + '</span>' + ' ' + data.msg + '</li>');
});

socket.on('whisper', function(data) {
	console.log('whisper:' + data);
	$('#message-wrap').append('<li class="whisper"><span class="user-identifier">' + data.nick + '</span>' + ' ' + data.msg + '</li>');
});

//EVERYTIME A USER JOINS DISPLAY ALL PREVIOUS MESSAGES ON THE CLIENT
socket.on('allMessages', function(data) {
	if (!messages) {
		messages = true;
		for (var i = 0; i < data.nick.length; i++) {
			var user = data.nick[i];
			var message = data.msg[i];
			$('#message-wrap').append('<li><span class="user-identifier">' + user + '</span>' + ' ' + message + '</li>');
		};
	};
	// console.log('all msgs: ' + data);
});

//EVERYTIME A USER JOINS DISPLAY ALL USERNAMES ON THE CLIENT
socket.on('usernames', function(data) {
	// console.log(data.nick.length);
	var names = '';
	for(var i = 0; i < data.nick.length; i++) {
		names += '<li>' + data.nick[i] + '</li>';
	}
	$('#user-list').html(names);
});

socket.on('leave', function(data) {
	$('#message-wrap').append(data + ' has left the room!<br/>');
});

socket.on('newuser', function(data) {
	$('#message-wrap').append(data + ' has joined the room!<br/>');
});
