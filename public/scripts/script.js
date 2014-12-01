$(document).ready(function() {

});
var socket = io();
//listen for messages events
// socket.on('messages', function(data) { 
// 	alert(data.hello);
// });

$('form').submit(function(e) {
	e.preventDefault();
	var message = $('#message').val();
	//emit the messages event on the server
	socket.emit('messages', message);
	$('#message').val(' ');
	return false;
});

socket.on('messages', function(data) {
	// console.log(data);
	$('#message-wrap').append($('<li>').text(data));
});

socket.on('connect', function(data) {
	$('.chat-window').prepend('Connected to Salmon!');
	$('#name-submit').on('click', function() {
		nickname = $('#username').val();
		$('.login-container').hide();
		socket.emit('join', nickname);
	});
});

socket.on('usernames', function(data) {
	for(var i = 0; i < data.length; i++) {
		$('#user-list').append($('<li>').text(data.users[i]));
	}
});