//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');
var crypto = require('crypto');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');
var request = require('request');
var qRequest = require('request-promise');
var _ = require('lodash');

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));
var messages = [];
var sockets = [];

io.on('connection', function (socket) {
    // messages.forEach(function (data) {
    //   socket.emit('message', data);
    // });

    sockets.push(socket);

    socket.on('disconnect', function () {
      sockets.splice(sockets.indexOf(socket), 1);
      updateRoster();
    });
    
    function getBbQuery(method, cb = _.identity, userParams = {}) {
      var hsj = '6422a30a-797b-4069-b74f-dd1723e9b89e';
      var hsp = 'aabfb8c4-cbe5-4362-bb6e-d4dec9681da7';
      var time = Math.floor(new Date() / 1000);
      var params = _.assign({}, userParams, {
        method: method,
        moment: time,
      });
      
      var body = http_build_query(params, '', '&');
      var hash = crypto.createHmac('sha512', hsp)
        .update(body).digest('hex');
      
      return qRequest({
        url: 'https://bitbay.net/API/Trading/tradingApi.php',
        method: 'POST',
        headers: {
          'API-Key': hsj,
          'API-Hash': hash,
        },
        body,
      })
      .then(cb);
    }
    
    socket.on('bbInfo', function() {
      getBbQuery('info', function(res, body) {
        socket.emit('bbInfo', { res, body });
      })
    });    
    
    socket.on('bbOrderbook', function() {
      getBbQuery('orderbook', function(res, body) {
        socket.emit('bbOrderbook', { res, body });
      }, { order_currency: 'BTC', payment_currency: 'PLN'  });
    });    
    
    
    socket.on('bbMarketState', function(data) {
      var promises = [];
      console.warn(data);
      
      const currenctPriceReducer = (log) => _.map(log.asks, (ask) => ask.price / ask.quantity); 
      
      var staticMarketConfig = [{
        crypto: 'BTC',
      }, {
        crypto: 'LSK',
      },{
        crypto: 'ETH',
      }, {
        crypto: 'LTC',
      }];
      
      _.forEach(staticMarketConfig, (d) => {
        promises.push(
          getBbQuery('orderbook', null, { order_currency: d.crypto, payment_currency: 'PLN' })
        );
      });
      
      Promise.all(promises)
      .then((logs) => 
        _(logs).map((log, i) => ({ 
          crypto: staticMarketConfig[i].crypto,
          values: currenctPriceReducer(JSON.parse(log)),
        })).value())
        .then((data) => socket.emit('bbMarketState', data));
    });
    
    
    socket.on('message', function (msg) {
      var text = String(msg || '');

      if (!text)
        return;

      socket.get('name', function (err, name) {
        var data = {
          name: name,
          text: text
        };

        broadcast('message', data);
        messages.push(data);
      });
    });

    socket.on('identify', function (name) {
      socket.set('name', String(name || 'Anonymous'), function (err) {
        updateRoster();
      });
    });
  });

function updateRoster() {
  async.map(
    sockets,
    function (socket, callback) {
      socket.get('name', callback);
    },
    function (err, names) {
      broadcast('roster', names);
    }
  );
}

function broadcast(event, data) {
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
}

server.listen(
  process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 3000, 
  process.env.OPENSHIFT_NODEJS_IP || process.env.IP || "0.0.0.0", function() {
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});

function http_build_query (formdata, numericPrefix, argSeparator) { // eslint-disable-line camelcase
  //  discuss at: http://locutus.io/php/http_build_query/
  // original by: Kevin van Zonneveld (http://kvz.io)
  // improved by: Legaev Andrey
  // improved by: Michael White (http://getsprink.com)
  // improved by: Kevin van Zonneveld (http://kvz.io)
  // improved by: Brett Zamir (http://brett-zamir.me)
  //  revised by: stag019
  //    input by: Dreamer
  // bugfixed by: Brett Zamir (http://brett-zamir.me)
  // bugfixed by: MIO_KODUKI (http://mio-koduki.blogspot.com/)
  //      note 1: If the value is null, key and value are skipped in the
  //      note 1: http_build_query of PHP while in locutus they are not.
  //   example 1: http_build_query({foo: 'bar', php: 'hypertext processor', baz: 'boom', cow: 'milk'}, '', '&amp;')
  //   returns 1: 'foo=bar&amp;php=hypertext+processor&amp;baz=boom&amp;cow=milk'
  //   example 2: http_build_query({'php': 'hypertext processor', 0: 'foo', 1: 'bar', 2: 'baz', 3: 'boom', 'cow': 'milk'}, 'myvar_')
  //   returns 2: 'myvar_0=foo&myvar_1=bar&myvar_2=baz&myvar_3=boom&php=hypertext+processor&cow=milk'
  var urlencode = require('urlencode')
  var value
  var key
  var tmp = []
  var _httpBuildQueryHelper = function (key, val, argSeparator) {
    var k
    var tmp = []
    if (val === true) {
      val = '1'
    } else if (val === false) {
      val = '0'
    }
    if (val !== null) {
      if (typeof val === 'object') {
        for (k in val) {
          if (val[k] !== null) {
            tmp.push(_httpBuildQueryHelper(key + '[' + k + ']', val[k], argSeparator))
          }
        }
        return tmp.join(argSeparator)
      } else if (typeof val !== 'function') {
        return urlencode(key) + '=' + urlencode(val)
      } else {
        throw new Error('There was an error processing for http_build_query().')
      }
    } else {
      return ''
    }
  }
  if (!argSeparator) {
    argSeparator = '&'
  }
  for (key in formdata) {
    value = formdata[key]
    if (numericPrefix && !isNaN(key)) {
      key = String(numericPrefix) + key
    }
    var query = _httpBuildQueryHelper(key, value, argSeparator)
    if (query !== '') {
      tmp.push(query)
    }
  }
  return tmp.join(argSeparator)
}

