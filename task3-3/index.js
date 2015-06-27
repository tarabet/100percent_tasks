/*global gameUrls*/
var state = {
  itemX: [],
  itemO: [],
  liId: [],
  volume: '',
  currentMove: '',
  result: ''
};
window.addEventListener('load', function handle() {
  'use strict';
  var s = new WebSocket(gameUrls.list);
  var startButton = document.querySelector('.createGame');
  var ul = document.querySelector('.existing-games');
  var divEr = document.querySelectorAll('.status-message');
  var divField = document.querySelector('.field');
  var newGame = document.querySelector('.newGame');
  var stop = true;
  var clicked = true;
  var i;
  var j;
  var cells;
  var gameId;
  var playerId;
  var side;
  var letter;
  function doRequest(method, url, data, headers, callback) {
    var x = new XMLHttpRequest();
    x.open(method, url);
    if (headers) {
      headers.forEach(function head(item) {
        x.setRequestHeader(item.name, item.value);
      });
    }
    x.send(data);
    x.addEventListener('readystatechange', function readyList() {
      if (x.readyState === x.DONE) {
        callback(x);
      }
    });
  }
  function tryCatch(status, type, text) {
    if (status !== 200) {
      switch (type) {
        case 'newGame':
          divEr[0].innerHTML = 'Ошибка создания игры';
          startButton.disabled = false;
          break;
        case 'start':
          if (status === 410) {
            divEr[0].innerHTML = 'Ошибка старта игры: другой игрок не ответил';
          } else divEr[0].innerHTML = 'Неизвестная ошибка старта игры';
          break;
        case 'win':
          divEr[1].innerHTML = text;
          stop = false;
          break;
        case 'move':
          if (text) divEr[1].innerHTML = text;
          else divEr[1].innerHTML = 'Неизвестная ошибка';
          stop = false;
          break;
        default:
      }
    }
  }
  function clickEnemy(xoro) {
    var enemy;
    if (side === 'x') enemy = 'o';
    else enemy = 'x';
    for (i = 0; i < cells.length; i++) {
      if (Array.prototype.indexOf.call(document.querySelectorAll('.cell'), cells[i]) === parseInt(xoro, 10) - 1) {
        cells[i].classList.add(enemy);
        return;
      }
    }
  }
  function waitMove() { // когда не наш ход
    if (stop === true) {
      doRequest('GET', gameUrls.move, null, [{'name': 'Game-ID', 'value': gameId},
        {'name': 'Player-ID', 'value': playerId}, {
          'name': 'Content-Type',
          'value': 'application/json'
        }], function waitedMove(x) {
        tryCatch(x.status);
        if (x.status === 200) {
          clickEnemy(JSON.parse(x.responseText).move);
          clicked = true;
        }
        else waitMove();
        if (JSON.parse(x.responseText).win) tryCatch(400, 'win', JSON.parse(x.responseText).win);
      });
    }
  }
  divField.addEventListener('click', function clickPlay(event) {
    var ar = Array.prototype.indexOf.call(document.querySelectorAll('.cell'), event.target) + 1;
    var moves = {move: ar};
    if (event.target.classList.contains('x') || event.target.classList.contains('o') || stop === false || clicked === false) {
      return;
    }
    doRequest('POST', gameUrls.move, JSON.stringify(moves), [{'name': 'Game-ID', 'value': gameId},
      {'name': 'Player-ID', 'value': playerId}, {
        'name': 'Content-Type',
        'value': 'application/json'
      }], function click(x) {
      tryCatch(x.status, 'move', JSON.parse(x.responseText).message);
      if (x.status === 200) {
        if (JSON.parse(x.responseText).win) tryCatch(400, 'win', JSON.parse(x.responseText).win);
        event.target.classList.add(side);
        clicked = false;
        if (JSON.parse(x.responseText).win) divEr.innerHTML = JSON.parse(x.responseText).win;
        waitMove();
      }
    });
    for (i = 0; i < cells.length; i++) {
      if (cells[i].classList.contains('x')) {
        if (state.itemX.indexOf(i) === -1) {
          state.itemX.push(i);
        }
      }
      if (cells[i].classList.contains('o')) {
        if (state.itemO.indexOf(i) === -1) {
          state.itemO.push(i);
        }
      }
    }
  });
  function drawField() {
    if (state.itemX.length === state.itemO.length && letter === 'x' ||
      state.itemX.length !== state.itemO.length && letter === 'o' ) { // Проверяем что сейчас наш ход
      clicked = true;
    } else {
      waitMove();
    }
  }
  function startGame(lr) {
    var divIn;
    var divOut;
    letter = lr;
    document.querySelector('.startGame').style.display = 'none';
    document.querySelector('.mainGame').style.display = 'block';
    divField.innerHTML = '';
    for (i = 1; i <= 10; i++) {
      divOut = document.createElement('div');
      divOut.className = 'row';
      divField.appendChild(divOut);
      for (j = 1; j <= 10; j++) {
        divIn = document.createElement('div');
        divIn.className = 'cell';
        divOut.appendChild(divIn);
      }
    }
    cells = document.querySelectorAll('.cell');
    drawField();
  }
  function liListen(li, id) {
    li.addEventListener('click', function addGame() {
      gameId = id;
      s.send(JSON.stringify({'register': id}));
    });
  }
  function ulUpdate() {
    var li;
    ul.innerHTML = '';
    for (i = 0; i < state.liId.length; i++) {
      li = document.createElement('li');
      li.innerHTML = state.liId[i];
      ul.appendChild(li);
      liListen(li, state.liId[i]);
    }
  }
  s.addEventListener('message', function Mes(event) { // Обработка подключения к вебсокету
    var data = JSON.parse(event.data);
    var commandStart;
    if (data.action === 'add') {
      state.liId.push(data.id);
      ulUpdate();
    }
    if (data.action === 'remove') {
      state.liId.splice([state.liId.indexOf(data.id)], 1);
      ulUpdate();
    }
    if (data.action === 'startGame') {
      playerId = data.id;
      divEr.textContent = 'Ожидаем начала игры';
      startButton.disabled = 'disabled';
      commandStart = {'player': playerId, 'game': gameId}; // player: 'PLAYER_ID', game: 'GAME_ID'
      doRequest('POST', gameUrls.gameReady, JSON.stringify(commandStart),
        [{'name': 'Content-Type', 'value': 'application/json'}], function readyPlay(x) {
          tryCatch(x.status, 'start');
          if (JSON.parse(x.responseText).side && JSON.parse(x.responseText).side === 'x' ||
            JSON.parse(x.responseText).side && JSON.parse(x.responseText).side === 'o' ) {
            side = JSON.parse(x.responseText).side;
            startGame(side);
          }
        });
    }
    if (data.action === 'message') {
      divEr.textContent = 'У вас ошибка. ТекстКод ошибки: ' + data.error;
    }
  });
  newGame.addEventListener('click', function surrend() {
    doRequest('PUT', gameUrls.surrender, null, [{'name': 'Game-ID', 'value': gameId},
      {'name': 'Player-ID', 'value': playerId}, {
        'name': 'Content-Type',
        'value': 'application/json'
      }], function sur(x) {
      tryCatch(x.status);
      if (x.status) {
        if (x.status === '200') {
          document.querySelector('.mainGame').style.display = 'none';
          document.querySelector('.startGame').style.display = 'block';
        } else {
          // errorMes(JSON.parse(x.responseText).message);
        }
      }
    });
    document.querySelector('.startGame').style.display = 'block';
    document.querySelector('.mainGame').style.display = 'none';
    ulUpdate();
  });
  startButton.addEventListener('click', function startedGame() {
    var reg;
    doRequest('POST', gameUrls.newGame, null, null, function newerGame(x) {
      tryCatch(x.status, 'newGame');
      gameId = JSON.parse(x.responseText).yourId;
      if (gameId) {
        divEr[0].innerHTML = gameId;
        startButton.disabled = 'disabled';
        reg = {'register': gameId};
        s.send(JSON.stringify(reg));
      }
    });
  });
});