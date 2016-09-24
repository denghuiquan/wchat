$(function() {
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // Initialize varibles
  var $window = $(window);
  
  // Prompt for setting a username
  var username;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $($('textarea.message-input')[0]).focus();

  var socket = io();

  function addParticipantsMessage (data) {
    var message = '';
    if (data.numUsers === 1) {
      message += "there's 1 participant";
    } else {
      message += "there are " + data.numUsers + " participants";
    }
    log(message);
  }

  // Sets the client's username
  function setUsername () {
    username = cleanInput($usernameInput.val().trim());

    // If the username is valid
    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // Tell the server your username
      socket.emit('add user', username);
    }
  }

  // Sends a chat message
  function sendMessage () {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: username,
        message: message
      });
      // tell server to execute 'new message' and send along one parameter
      socket.emit('new message', message);
    }
  }

  // Log a message
  function log (message, options) {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  // Adds the visual chat message to the message list
  function addChatMessage (data, options) {
    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  // Adds the visual chat typing message
  function addChatTyping (data) {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  function removeChatTyping (data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  function addMessageElement (el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Prevents input from having injected markup
  function cleanInput (input) {
    return $('<div/>').text(input).text();
  }

  // Updates the typing event
  function updateTyping () {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages (data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // Gets the color of a username through our hash function
  function getUsernameColor (username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }
/*
  $inputMessage.on('input', function() {
    updateTyping();
  });

  // Click events

  // Focus input when clicking anywhere on login page
  $loginPage.click(function () {
    $currentInput.focus();
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(function () {
    $inputMessage.focus();
  });
*/
  // Socket events

  // Whenever the server emits 'login', log the login message
  socket.on('login', function (data) {
    connected = true;
    // Display the welcome message
    var message = "Welcome to Socket.IO Chat – ";
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', function (data) {
    addChatMessage(data);
  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('user joined', function (data) {
    log(data.username + ' joined');
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user left', function (data) {
    log(data.username + ' left');
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on('typing', function (data) {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', function (data) {
    removeChatTyping(data);
  });
});

// 申明App模块，与ng-app绑定对应, 申明对Angular-route的依赖，引入router组件
var app = angular.module('wchatApp', ['ngRoute']).
  // angularJS提供了一个run Block的启动模块，即当整个应用启动时第一个执行的块
  // 这里适合写一些初始化工作，所以登录验证可以写在这里 
  run(function ($window, $rootScope, $http, $location) {
    $http({
      url: '/api/validate',
      method: 'GET'
    }).success(function (user){
      $rootScope.me = user;
      $location.path('/');
    }).error(function (data){
      $location.path('/login');
    })

    // 提供logout的控制器
    $rootScope.logout = function(){
      $http({
        url: '/api/logout',
        method: 'GET'
      }).success(function(){
        $rootScope.me = null;
        $location.path('/login');
      })
    }

    // 通过监听来自子域LoginCtrl的login事件，更新$rootScope的用户信息
    $rootScope.$on('login', function (evt, me){
      $rootScope.me = me;
    })
  }
);

// 将Socket.io封装为一个名为socket的AngularJS服务
// 每次与服务端通信后，根据数据变化，更新视图
app.factory('socket', function ($rootScope){
  var socket = io.connect('http://localhost:3000');
  return{
    on: function (eventName, callback){
      socket.on(eventName, function (){
        var args = arguments;
        $rootScope.$apply( function(){
          callback.apply(socket, args);
        });
      })
    },
    emit: function (eventName, data, callback){
      socket.emit(eventName, data, function (){
        var args = arguments;
        $rootScope.$apply(function (){
          if (callback) {
            callback.apply(socket, args);
          };
        })
      }) 
    }
  }
});

app.controller('RoomCtrl', function($scope, socket){
  $scope.messages = [];
  // 请求获取服务器端的所有消息
  socket.emit('getAllMessages');
  // 更新数据到数据模型
  socket.on('allMessages', function (messages){
    $scope.messages = messages;
  });
  // 接收到新消息加到数据模型messages数组中
  socket.on('messageAdded', function (message){
    $scope.messages.push(message);
  })
});

app.controller('MessageCreatorCtrl', function($scope, socket){
  $scope.newMessage = '';

  $scope.createMessage = function (){
    if ($scope.newMessage == '') {
      return;
    };
    socket.emit('createMessage', $scope.newMessage);
    $scope.newMessage = '';
  }
})

app.directive('autoScrollToBottom', function(){
  return {
    link: function (scope, element, attrs){
      scope.$watch(
        function (){
          return element.children().length;
        }, function (){
          element.animate({
            scrollTop: element.prop('scrollHeight')
          }, 1000);
        }
      );
    }
  }
})

app.directive('ctrlEnterBreakLine', function(){
  return { 
    link: function (scope, element, attrs){
      var ctrlDown = false;
      element.bind('keydown', function (evt){
        if (evt.which === 17) {
          ctrlDown = true;
          setTimeout(function (){
            ctrlDown = false
          }, 1000)
        };
        if (evt.which === 13) {
          if (!ctrlDown) {
            element.val(element.val());
          } else{
            scope.$apply(function (){
              scope.$eval(attrs.ctrlEnterBreakLine);
            });
            evt.preventDefault();
          };
        };
      })
    }
  }
})

app.filter('to_trusted', ['$sce', function ($sce) {
  return function (text) {
      return $sce.trustAsHtml(text);
  }
}]);

app.directive('parser',['$sce', function(){
  return {
    require: '?ngModel',
    restrict: 'A',    
    link: function (scope, element, attrs, ngModel, $sce){
      // view -> model
      ngModel.$parsers.unshift(function (v) {
          // 将view中的换行符"\r\n"替换为<br/>换行元素,空格替换为"&nbsp;"
          v = v.replace(/\&/g, '&amp;').replace(/ /g, '&nbsp;').replace(/</gi, '&lt;').replace(/>/gi, '&gt;').replace(/(\r)*\n/g, '<br/>');
          
          return v ? v : '';
      });
    }
  }
}])