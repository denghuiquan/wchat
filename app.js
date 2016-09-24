/**
 * Created by Administrator on 2015/11/22 0022.
 */
var express = require('express');
var app = express();
var path = require('path');

var port = process.env.PORT || 3000;

var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var Controllers = require('./controllers');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(cookieParser());
app.use(session({
  secret: 'wchat',
  resave: true,
  saveUninitialized: false,
  cookie: {
    maxAge: 60*1000
  }
}));

// 提供的api
app.get('/api/validate', function (req, res){
  var _userId = req.session._userId;
  if (_userId) {
    Controllers.User.findUserById(_userId, function (err, user){
      if (err) {
        res.json(401, {
          msg: err
        })
      } else{
        res.json(user)
      };
    })
  } else{
    res.json(401, null)
  };
})


app.post('/api/login', function (req, res){
  var email = req.body.email;
  if (email) {
    Controllers.User.findByEmailOrCreate(email, function (err, user){
      if (err) {
        res.json(500, {
          msg: err
        })
      } else{
        req.session._userId = user._id;
        res.json(user);
      };
    })
  } else{
    res.json(403);
  };
})

app.get('/api/logout', function (req, res){
  req.session._userId = null;
  res.json(401);
})


// 除了提供HTTP的登录验证之外，还需对Socket请求进行登录验证；Socket.io提供了认证的接口
var signedCookieParser = cookieParser('wchat');
var MongoStore = require('connect-mongo')(session);

// 使用Expresss的Session数据是存储在内存中的，服务器重启数据会消失，需要使用MongoDB将Session数据固化下来
var sessionStore = new MongoStore({
  url: 'mongodb://localhost/wchat'
});

app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(session({
  secret: 'wchat',
  resave: true,
  saveUninitialized: false,
  cookie: {
    maxAge: 60*1000*60
  },
  store: sessionStore
}));

// 配置静态资源路径
app.use(express.static(path.join(__dirname, '/public')));
app.use(function (req, res){
    res.sendFile(path.join(__dirname, './public/index.html'));
});

var server = app.listen(port, function () {
    console.log('wchat is on port '+ port +'!');
});

var io = require('socket.io').listen(server);

// 手动解析客户端的Session数据
io.set('authorization', function (handshakeData, accept) {
  signedCookieParser(handshakeData, {}, function (err){
    if (err) {
      accept(err, false);
    } else{
      sessionStore.get(handshakeData.signedCookies['connect.sid'], function (err, session){
        if (err) {
          accept(err.message, false);
        } else{
          handshakeData.session = session;
          if (session._userId) {
            accept(null, true);
          } else{
            accept('No login');
          };
        };
      })
    };
  })
})



// 消息记录
var messages = [];

io.sockets.on('connection', function (socket) {
	
	socket.emit('connected',"注意注意，前方高能！");
  console.log('a user connected');
  socket.on('connected', function (data) {
    console.log(data);
  });

  socket.on('getAllMessages', function(){
    socket.emit('allMessages', messages);
  });

	socket.on('createMessage', function(message){
    messages.push(message);
    // 通知应用同时所有客户端有新消息add
    io.sockets.emit('messageAdded', message);
  });

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});