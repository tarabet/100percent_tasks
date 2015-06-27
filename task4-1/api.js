/*global crudURL*/
(function n() {
  'use strict';
  var head = {'name': 'Content-Type', 'value': 'application/json'};
  var us;
  var list = [];
  var err = false;

  function doRequest(method, url, data, headers, callback) {
    var z = new XMLHttpRequest();
    z.open(method, url);
    if (headers) {
      headers.forEach(function head(item) {
        z.setRequestHeader(item.name, item.value);
      });
    }
    z.send(data);
    z.addEventListener('readystatechange', function readyList() {
      if (z.readyState === z.DONE) {
        callback(z);
      }
    });
  }

  function User(item) {
    if (item) {
      if (item.id) this.id = item.id;
      if (item.location) this.location = item.location;
      if (item.name) this.name = item.name;
      if (item.phone) this.phone = item.phone;
      if (item.role) this.role = item.role;
      if (item.strikes) this.strikes = item.strikes;
      return this;
    }
  }

  User.prototype.save = function sav(fun) {
    var prom = this;
    if (!this.id) {
      doRequest('POST', crudURL, JSON.stringify(prom), [head], function dNew(x) {
        if (parseInt(x.status, 10) > 400) err = 1;
        prom.id = JSON.parse(x.responseText).id;
        fun(err);
      });
    } else {
      doRequest('PUT', crudURL + '/' + this.id, JSON.stringify(prom), [head], function dSav(x) {
        if (parseInt(x.status, 10) > 400) err = 1;
        fun(err);
      });
    }
  };

  User.prototype.remove = function rem(fun) {
    doRequest('DELETE', crudURL + '/' + this.id, null, [head], function u(x) {
      if (parseInt(x.status, 10) > 400) err = 1;
      fun(err);
    });
  };

  function Student() {
    User.apply(this, arguments);
  }

  Student.prototype = new User();

  Student.prototype.getStrikesCount = function getStrikes() {
    return parseInt(this.strikes, 10);
  };

  function Support() {
    User.apply(this, arguments);
  }

  Support.prototype = new User();

  function Admin() {
    User.apply(this, arguments);
  }

  Admin.prototype = new User();
  Admin.prototype.save = function savAd(fun) {
    var a = document.createElement('a');
    a.href = crudURL;
    var urlRight = a.protocol + '//' + a.host + '/refreshAdmins';
    doRequest('GET', urlRight, null, [head], null);
    User.prototype.save.apply(this, arguments);
  };

  User.load = function r(fun) {
    var answer;
    doRequest('GET', crudURL, null, [head], function load(x) {
      if (parseInt(x.status, 10) > 400) err = 1;
      answer = JSON.parse(x.responseText);
      answer.forEach(function y(item) {
        if (item.role === 'Student') us = new Student(item);
        if (item.role === 'Support') us = new Support(item);
        if (item.role === 'Administrator' || item.role === 'Admin') us = new Admin(item);
        list.push(us);
      });
      fun(err, list);
    });
  };

  window.User = User;
  window.Support = Support;
  window.Admin = Admin;
  window.Student = Student;
})();