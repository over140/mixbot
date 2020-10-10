import './index.scss';
import $ from 'jquery';
import {BigNumber} from 'bignumber.js';

function ExchangeRate(router, api) {
  this.router = router;
  this.api = api;
  this.templateAssets = require('./index.html');
}

ExchangeRate.prototype = {

  render: function () {
    const self = this;
    document.title = '汇率小工具';
    $('body').attr('class', 'rate layout');
    $('#layout-container').html(self.templateAssets());

    var baseCurrency = self.getMixinContext().currency;
    if (!baseCurrency) {
      baseCurrency = 'USD';
    }
    $('#fromCurrency option[value='+baseCurrency+']').attr('selected','selected');
    var targetCurreny = 'CNY'
    if (baseCurrency === 'CNY') {
      targetCurreny = 'USD'
    }
    $('#toCurrency option[value='+targetCurreny+']').attr('selected','selected');
    $('#more-loading').attr('src', require('../explorer/loading.gif'));
    
    self.fetchRates(baseCurrency, targetCurreny);

    $('#fromCurrency').on('change', function() {
      console.info(this.value);
      self.fetchRates(this.value, targetCurreny);
    });

    $('#exchange').on('click', function() {
      self.renderExchangeValue();
    });
  },

  fetchRates: function (baseCurrency, targetCurreny) {
    const self = this;
    $('.loading').show()
    $('#result').html('');
    $('#currentCurrency').html('');
    $('#exchangeResult').html('');
    self.api.requestURL('POST', 'https://bigone.donate.cafe', { "url": 'https://api.exchangerate-api.com/v4/latest/' + baseCurrency }, function(resp) {
      if (resp.error) {
        self.api.notifyError('error', '数据抓取失败');
        return;
      }

      const rates = resp.rates;
      self.rates = rates;
      $('#currentCurrency').html('当前汇率：' + rates[targetCurreny]);

      const currencies = ['USD', 'CNY', 'JPY', 'EUR', 'KRW', 'HKD', 'GBP', 'AUD', 'MYR'];
      var currenciesOutputText = '';
      for (var i = 0; i < currencies.length; i++) {
        const currency = currencies[i];
        if (currency !== baseCurrency) {
          currenciesOutputText += '1 ' + baseCurrency + ' = ' + rates[currency] + ' ' + currency + '<br/>';
        }
      }
      $('.loading').hide()
      $('#result').html(currenciesOutputText);
      self.renderExchangeValue();
    });
  },

  renderExchangeValue: function () {
    if (!this.rates) {
      return;
    }
    const fromCurrency = $('#fromCurrency').val();
    const toCurrency = $('#toCurrency').val();
    const amount = $('#amount').val();
    const value = new BigNumber(this.rates[toCurrency]).multipliedBy(amount).toFixed(2);

    $('#exchangeResult').html(amount + ' ' + fromCurrency + ' = ' + value + ' ' + toCurrency);
  },

  getMixinContext: function () {
    let ctx = {};
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.MixinContext) {
      ctx = JSON.parse(prompt('MixinContext.getContext()'))
      ctx.platform = ctx.platform || 'iOS'
    } else if (window.MixinContext && (typeof window.MixinContext.getContext === 'function')) {
      ctx = JSON.parse(window.MixinContext.getContext())
      ctx.platform = ctx.platform || 'Android'
    }
    return ctx
  }

};

export default ExchangeRate;
