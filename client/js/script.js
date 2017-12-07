/* global angular, io, _ */
(function (angular) {
  var socket = io.connect();

  var MainController = function ($scope, $http) {
    //$http.
    $scope.isLoading = false;
    $scope.wallets = [{
      name: 'Voyti',
      id: 'voyti0',
      amountInvested: 6135.00,
      contents: [{
        crypto: 'BTC',
        amount: 0,
      }, {
        crypto: 'LSK',
        amount: 66.02153717,
      }, {
        crypto: 'ETH',
        amount: 3.00139998,
      }, {
        crypto: 'LTC',
        amount: 6.14942384,
      }],
    },  {
      
      name: 'Justi',
      id: 'voyti2',
      amountInvested: 1200.00,
      contents: [{
        crypto: 'PLN',
        amount: 650.50,
      }, {
        crypto: 'BTC',
        amount: 0.01185185,
      }, {
        crypto: 'LSK',
        amount: 16.46131687,
      }, {
        crypto: 'ETH',
        amount: 0.14740242,
      }, {
        crypto: 'LTC',
        amount: 0,
      }],
    }, {
      name: 'Mama',
      id: 'voyti1',
      amountInvested: 3000.00,
      contents: [{
        crypto: 'PLN',
        amount: 1601.31,
      }, {
        crypto: 'BTC',
        amount: 0.02917525,
      }, {
        crypto: 'LSK',
        amount: 36.01008282,
      }, {
        crypto: 'ETH',
        amount: 0.61887026,
      }, {
        crypto: 'LTC',
        amount: 0,
      }],

    }];
    
    socket.on('bbInfo', function(res) {
      console.log('bbInfo res', res);
    });
    
    socket.on('bbOrderbook', function(res) {
      console.log('bbOrderbook res', res);
      
    });
    
    socket.on('bbMarketState', function(res) {
      console.log('bbMarketState res', res);
      $scope.marketData = res;
      $scope.isLoading = false;
      $scope.$digest();
    });
    
    $scope.getInfo = function() {
      socket.emit('bbInfo');
    };    
    
    $scope.getOrderbook = function() {
      socket.emit('bbOrderbook');
    };    
    
    $scope.getMarketState = function() {
      socket.emit('bbMarketState');
      $scope.isLoading = true;
    };
    
    $scope.removeWallet = function(id) {
      _.remove($scope.wallets, { id });
    }
    
    $scope.addWallet = function() {
      $scope.wallets.push({
        name: 'New wallet',
        id: _.uniqueId(),
        contents: [{
          crypto: 'BTC',
          amount: 0,
        }, {
          crypto: 'LSK',
          amount: 0,
        }, {
          crypto: 'ETH',
          amount: 0,
        }, {
          crypto: 'LTC',
          amount: 0,
        }]
      });
    }
    
    $scope.getCryptoValue = function(crypto, amount) {
      return _.find($scope.marketData, { crypto }).values[0] * amount;
    };
    
    $scope.getWalletValue = function(walletContents) {
      return _(walletContents)
      .map((content) => $scope.getCryptoValue(content.crypto, content.amount))
      .sum();
    }
  };
  
  angular.module('bitbayKeeper',[])
  .controller('MainController', MainController);
})(angular);