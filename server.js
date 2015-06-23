var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var hbs = require('hbs');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var Parse = require('parse').Parse;
var Promise = require('bluebird');
var bcrypt = require('bcrypt');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var flash = require('connect-flash');


var port = process.env.PORT || 8080;

Parse.initialize('1uN7c1hrqZYZWERAbTkdDVhx3OzF9jbKhHGoohmz', 'OTgZLemkKLORun2WGjSMqlM8bySuSXpJkQn9gu3R');

// ROUTING
app.set('view engine', 'html');
app.engine('html', require('hbs').__express);
app.use(express.static(__dirname + '/public'));

app.use(morgan('dev')); // log every request to the console
app.use(cookieParser('flap')); // read cookies (needed for auth)
app.use(bodyParser.json()); // get info from html forms
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'ilovesaleh', resave: false, saveUninitialized: true }));
app.use(flash());

// ROUTES
app.get('/', function(req, res) {
    if (req.cookies.user) {
        res.redirect('/home');    
    } else {
        res.render('index');
    }
});

app.get('/signup', function(req, res) {
    if (req.cookies.user) {
        res.redirect('/home');
    } else {
        res.render('signup');
    }
});

app.get('/home', function(req, res) {
    if (req.cookies.user) {
        getUserInfo(req.cookies.user).then(function(result) {
            res.render('home', {data: result});    
        });
    } else {
        res.redirect('/');
    }
    
});

app.post('/login', function(req, res) {
    console.log(req.body);

    var username = req.body.username;
    var pass = req.body.password;

    var UserQuery = Parse.Object.extend("Users");
    var query = new Parse.Query(UserQuery);

    query.equalTo("username", username);
    query.first().then(function(userObj) {
        var dbpass = userObj.get('password');
        var userId = userObj.id;

        return comparehash(pass, dbpass).then(function(data) {
            if (data == null) {
                res.render('index', {message: 'Wrong username and password. Please try again. :)'});
            }

            if (data) {
                res.cookie('user', userId, { maxAge: 90000 });    
                res.redirect('/home'); 
            }
        }).catch(function(e) {
            console.log(e);

            res.render('index', {message: 'Wrong username and password. Please try again. :)'});
        });
    });

});

app.get('/logout', function(req, res) {
    res.clearCookie('user');
    res.redirect('/');
});

app.post('/signup', function(req, res) {
    var username = req.body.username;
    var birthday = new Date(req.body.birthday);
    var password = req.body.password;

    var UserQuery = Parse.Object.extend("Users");
    var query = new Parse.Query(UserQuery);

    query.equalTo("username", username);
    query.find().then(function(userObj) {
        if (userObj.length > 0) {
            res.render('signup', { message: 'User already exists. Please ' });
            return;
        } else {        
            return hashpass(password).then(function(data) {
                if (data == null) {
                    res.render('signup', {})
                }

                var newUser = new UserQuery();

                newUser.set("username", username);
                newUser.set("birthdate", birthday);
                newUser.set("password", data);

                return newUser.save();
            });
        }
    }).then(function(data) {
        if (typeof(data) === "undefined") {
            return;
        }
        
        var username = data.get('username');
        var userId = data.id;

        res.cookie('user', userId, { maxAge: 90000 });
        res.redirect('/home');     
    }, function(error) {
        console.log(error);
    })
});

function hashpass(pass) {
    if (typeof(pass) === "undefined") {
        return null;
    }

    return new Promise(function(resolve, reject) {
        bcrypt.hash(pass, 8, function(err, hash) {
            if (err) {
                reject(err);
            }

            resolve(hash);
        });
    });
}

function comparehash(pass, dbhash) {
    if (typeof(pass) === "undefined") {
        return null;
    }

    return new Promise(function(resolve, reject) {
        bcrypt.compare(pass, dbhash, function(err, res) {
            if (err) {
                reject(err);
            }

            resolve(res);
        });
    });
}

function getUserInfo(id) {
    return new Promise(function(resolve, reject) {
        var UserQuery = Parse.Object.extend("Users");
        var query = new Parse.Query(UserQuery);

        query.equalTo("objectId", id);
        query.first().then(function(data) {
            console.log(data);
            var obj = {};
            obj["username"] = data.get('username');
            obj["userId"] = data.id;

            resolve(obj);
        }, function(error) {
            console.log(error);
            reject(error);
        });
    });
}

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

server.listen(port);
console.log('The magic happens on port %d', port);
