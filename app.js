var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

//ROUTING
app.use(express.static(__dirname + '/public'));

var userMessages = {
    nick: [],
    msg: []
};

var userList = {};
var userId = [];
var rooms = ['General', 'Random', 'Dev'];

//CONSOLE LOG CONNECT AND DISCONNECT TO SERVER
io.on('connection', function(client) {
    console.log('Client connected.....')
    client.on('disconnect', function(data) {
        if(!client.nickname) return;
        delete userList[client.nickname];
        io.emit('leave', client.nickname);
        updateUserNames();
        console.log('Client disconnected....');
    });
});

io.on('connection', function(client) {
    var nickname;
    var message;
    //ON CLIENT JOIN UPDATE ACTIVE USER LIST AND EMIT MESSAGES TO USER WHO JOINED
    client.on('join', function(data, callback) {
        // io.emit('roomsList', rooms);
        // console.log('data:' + data);
        // console.log('id: ' + client.id);
        if(data in userList) {
            callback(false);
        } else {
            // Assigning each user to the General Room on Join
            client.room = 'General';
            client.join('General');
            io.emit('newuser', 'SERVER:', data + ' has connected to ' + client.room);
            io.emit('updaterooms', rooms, client.room);
            // Adding each user to the userList Object
            client.nickname = data;
            userList[client.nickname] = client;
            userId.push(client.id);
            // Updating the user name list and displaying all previous messages to each new user
            updateUserNames(data);
            updateMessages();
            callback(true);
        }
    });
    //ON EVERY SENT MESSAGE STORE THE DATA IN THE userMessages{} AND EMIT THE DATA BACK TO THE CLIENT
    client.on('messages', function(data, callback) {
        // console.log(data);
        var msgArr = [];
        var msg = data.trim();
        if(msg.substring(0,2) === '/w') {
            msgArr = msg.split(' ');
            var newMsg = msgArr.splice(2, msgArr.length - 1);
            newMsg = newMsg.join(' ');
            var name = msgArr[1];
            if(name in userList) {
                console.log('name found');
                userList[name].emit('whisper', {nick: client.nickname, msg: newMsg});
                userList[client.nickname].emit('whisper', {nick: client.nickname, msg: newMsg});
            } else {
                console.log('user not found');
            }
        } else {
            console.log(data);
            var name = client.nickname;
            storeMessage(name, msg);
            io.sockets.in(client.room).emit('messages', {nick: name, msg: msg});
        }
    });

    client.on('switchRoom', function(room, callback) {
        client.leave(client.room);
        client.join(room);
        client.emit('newuser', 'SERVER: ', 'you have connected to ' + room);
        client.room = room;
        io.emit('updaterooms', rooms, client.room);
    });
});

function storeMessage(name, msg) {
    userMessages.nick.push(name);
    userMessages.msg.push(msg);
}

function updateUserNames(name) {
    console.log(userList);
    io.emit('usernames', {nick: Object.keys(userList)});
    
}

function updateMessages() {
    console.log(userMessages);
    io.emit('allMessages', {nick: userMessages.nick, msg: userMessages.msg});
}

server.listen(3000)
