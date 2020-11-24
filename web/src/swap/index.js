import './index.scss';
import $ from 'jquery';
import {BigNumber} from 'bignumber.js';

function Swap(router, api, loading) {
  this.router = router;
  this.api = api;
  this.loading = loading;
  this.templateAssets = require('./index.html');
}

Swap.prototype = {

  price: function(x, y, spentX) {
    const bnX = new BigNumber(x);
    const bnY = new BigNumber(y);
    const bnK = bnX.multipliedBy(bnY);
    return bnK.dividedBy(bnX.minus(spentX)).minus(bnY);
  },

  bigPrice: function(orders, tradeQuantity) {
    var totalMoney = new BigNumber(0);
    var arrlen = orders.length
    for (var i = 0; i < arrlen; i++) {
      const order = orders[i];
      const price = new BigNumber(order.price);

      if (tradeQuantity.minus(order.quantity).isGreaterThan(0)) {
        tradeQuantity = tradeQuantity.minus(order.quantity);
        totalMoney = totalMoney.plus(price.multipliedBy(order.quantity));
      } else {
        totalMoney = totalMoney.plus(price.multipliedBy(tradeQuantity));
        break;
      }

      if (i == arrlen - 1) {
        console.info('orders not enough');
        return undefined;
      }
    }
    return totalMoney
  },

  requestData: function (callback) {
    const self = this;
    var result = {};
    function checkResult() {
      if (result.BigONEUSDT && result.BigONEEOS && result.BigONEBTC && result.topAssets && result.ExinSwap && result.FoxSwapEOS && result.FoxSwapBTC) {
        callback(result);
      }
    }
    self.api.requestURL('POST', 'https://bigone.donate.cafe', { "url": "https://www.bigonezh.com/api/v3/asset_pairs/XIN-USDT/depth?limit=300" }, function(resp) {
      if (!resp.data) {
        self.api.notifyError('error', resp.error);
        return; 
      }
      console.info("=== BigONE XIN-USDT");
      result.BigONEUSDT = resp.data;
      checkResult();
    });
    self.api.requestURL('POST', 'https://bigone.donate.cafe', { "url": "https://www.bigonezh.com/api/v3/asset_pairs/XIN-EOS/depth?limit=200" }, function(resp) {
      if (resp.error) {
        self.api.notifyError('error', resp.error);
        return; 
      }
      console.info("=== BigONE XIN-EOS");
      result.BigONEEOS = resp.data;
      checkResult();
    });
    self.api.requestURL('POST', 'https://bigone.donate.cafe', { "url": "https://www.bigonezh.com/api/v3/asset_pairs/XIN-BTC/depth?limit=200" }, function(resp) {
      if (!resp.data) {
        self.api.notifyError('error', resp.error);
        return; 
      }
      console.info("=== BigONE XIN-BTC");
      result.BigONEBTC = resp.data;
      checkResult();
    });
    self.api.requestURL('GET', 'https://mixin-api.zeromesh.net/network/assets/top', undefined, function(resp) {
      if (!resp.data) {
        self.api.notifyError('error', resp.error);
        return; 
      }
      console.info("=== Mixin Top Assets");
      result.topAssets = resp.data;
      checkResult();
    });
    self.api.requestURL('GET', 'https://app.exinswap.com/api/v1/pairs', undefined, function(resp) {
      if (!resp.data) {
        self.api.notifyError('error', resp.error);
        return; 
      }
      console.info("=== ExinSwap XIN-USDT");
      result.ExinSwap = resp.data.filter(function(pair){
        return pair.asset0.uuid == "4d8c508b-91c5-375b-92b0-ee702ed2dac5" && pair.asset1.uuid == "c94ac88f-4671-3976-b60a-09064f1811e8";
      })[0];
      checkResult();
    });
    self.api.requestURL('GET', 'https://f1-uniswap-api.firesbox.com/api/pairs/c94ac88f-4671-3976-b60a-09064f1811e8/6cfe566e-4aad-470b-8c9a-2fd35b49c68d', undefined, function(resp) {
      if (!resp.data) {
        self.api.notifyError('error', resp.error);
        return; 
      }
      result.FoxSwapEOS = resp.data;
      console.info("=== 4swap XIN-EOS");
      checkResult();
    });
    self.api.requestURL('GET', 'https://f1-uniswap-api.firesbox.com/api/pairs/c94ac88f-4671-3976-b60a-09064f1811e8/c6d0c728-2624-429b-8e0d-d9d19b6592fa', undefined, function(resp) {
      if (!resp.data) {
        self.api.notifyError('error', resp.error);
        return; 
      }
      console.info("=== 4swap XIN-BTC");
      result.FoxSwapBTC = resp.data;
      checkResult();
    });
  },

  subPrice: function(price, number) {
    if (price) {
      return price.toFixed(number);
    }
    return price;
  },

  //async 
  render: function () {
    const self = this;
    $('body').attr('class', 'swap layout');
    $('#layout-container').html(self.loading());

    self.requestData(function(data) {
      const BigONEUSDT = data.BigONEUSDT;
      const bigoneBuyUsdtOne = self.bigPrice(BigONEUSDT.asks, new BigNumber(1));
      const bigoneSellUsdtOne = self.bigPrice(BigONEUSDT.bids, new BigNumber(1));
      const bigoneBuyUsdtTen = self.bigPrice(BigONEUSDT.asks, new BigNumber(10));
      const bigoneSellUsdtTen = self.bigPrice(BigONEUSDT.bids, new BigNumber(10));
      const bigoneBuyUsdtHundred = self.bigPrice(BigONEUSDT.asks, new BigNumber(100));
      const bigoneSellUsdtHundred = self.bigPrice(BigONEUSDT.bids, new BigNumber(100));
  
      const BigONEEOS = data.BigONEEOS;
      const bigoneBuyEosOne = self.bigPrice(BigONEEOS.asks, new BigNumber(1));
      const bigoneSellEosOne = self.bigPrice(BigONEEOS.bids, new BigNumber(1));
      const bigoneBuyEosTen = self.bigPrice(BigONEEOS.asks, new BigNumber(10));
      const bigoneSellEosTen = self.bigPrice(BigONEEOS.bids, new BigNumber(10));
  
      const BigONEBTC = data.BigONEBTC;
      const bigoneBuyBtcOne = self.bigPrice(BigONEBTC.asks, new BigNumber(1));
      const bigoneSellBtcOne = self.bigPrice(BigONEBTC.bids, new BigNumber(1));
      const bigoneBuyBtcTen = self.bigPrice(BigONEBTC.asks, new BigNumber(10));
      const bigoneSellBtcTen = self.bigPrice(BigONEBTC.bids, new BigNumber(10));
  
      const topAssets = data.topAssets;
      var assetMap = {};
      topAssets.forEach(asset => {
        assetMap[asset.asset_id] = asset;
      });
      const priceBTC = new BigNumber(assetMap["c6d0c728-2624-429b-8e0d-d9d19b6592fa"].price_usd);
      const priceEOS = new BigNumber(assetMap["6cfe566e-4aad-470b-8c9a-2fd35b49c68d"].price_usd);
      const priceXIN = new BigNumber(assetMap["c94ac88f-4671-3976-b60a-09064f1811e8"].price_usd);
  
      const ExinSwap  = data.ExinSwap;
      const FoxSwapEOS = data.FoxSwapEOS;
      const FoxSwapBTC = data.FoxSwapBTC;
      
      const foxSwapEosOne = self.price(FoxSwapEOS.quote_amount, FoxSwapEOS.base_amount, 1);
      const foxSwapEosTen = self.price(FoxSwapEOS.quote_amount, FoxSwapEOS.base_amount, 10);
      const foxSwapEosHundred = self.price(FoxSwapEOS.quote_amount, FoxSwapEOS.base_amount, 100);
      const foxSwapBTCOne = self.price(FoxSwapBTC.quote_amount, FoxSwapBTC.base_amount, 1);
      const foxSwapBTCTen = self.price(FoxSwapBTC.quote_amount, FoxSwapBTC.base_amount, 10);
      const foxSwapBTCHundred = self.price(FoxSwapBTC.quote_amount, FoxSwapBTC.base_amount, 100);
  
      $('#layout-container').html(self.templateAssets({
        price_btc: priceBTC.toFixed(2),
        price_eos: priceEOS.toFixed(2),
        price_xin: priceXIN.toFixed(2),
        bigone_buy_usdt_one: bigoneBuyUsdtOne.toFixed(2),
        bigone_sell_usdt_one: bigoneSellUsdtOne.toFixed(2),
        bigone_buy_usdt_ten: self.subPrice(bigoneBuyUsdtTen, 2),
        bigone_sell_usdt_ten: self.subPrice(bigoneSellUsdtTen, 2),
        bigone_buy_usdt_hundred: self.subPrice(bigoneBuyUsdtHundred, 2),
        bigone_sell_usdt_hundred: self.subPrice(bigoneSellUsdtHundred, 2),
        
        bigone_buy_eos_one: bigoneBuyEosOne.toFixed(2),
        bigone_buy_eos_usdt_one: bigoneBuyEosOne.multipliedBy(priceEOS).toFixed(2),
        bigone_sell_eos_one: bigoneSellEosOne.toFixed(2),
        bigone_sell_eos_usdt_one: bigoneSellEosOne.multipliedBy(priceEOS).toFixed(2),
        bigone_buy_eos_ten: bigoneBuyEosTen.toFixed(2),
        bigone_buy_eos_usdt_ten: bigoneBuyEosTen.multipliedBy(priceEOS).toFixed(2),
        bigone_sell_eos_ten: bigoneSellEosTen.toFixed(2),
        bigone_sell_eos_usdt_ten: bigoneSellEosTen.multipliedBy(priceEOS).toFixed(2),
  
        bigone_buy_btc_one: bigoneBuyBtcOne.toFixed(4),
        bigone_buy_btc_usdt_one: bigoneBuyBtcOne.multipliedBy(priceBTC).toFixed(2),
        bigone_sell_btc_one: bigoneSellBtcOne.toFixed(4),
        bigone_sell_btc_usdt_one: bigoneSellBtcOne.multipliedBy(priceBTC).toFixed(2),
        bigone_buy_btc_ten: bigoneBuyBtcTen.toFixed(4),
        bigone_buy_btc_usdt_ten: bigoneBuyBtcTen.multipliedBy(priceBTC).toFixed(2),
        bigone_sell_btc_ten: bigoneSellBtcTen.toFixed(4),
        bigone_sell_btc_usdt_ten: bigoneSellBtcTen.multipliedBy(priceBTC).toFixed(2),
  
        exin_swap_one: self.price(ExinSwap.asset1Balance, ExinSwap.asset0Balance, 1).toFixed(2),
        exin_swap_ten: self.price(ExinSwap.asset1Balance, ExinSwap.asset0Balance, 10).toFixed(2),
        exin_swap_hundred: self.price(ExinSwap.asset1Balance, ExinSwap.asset0Balance, 100).toFixed(2),
        fox_swap_eos_one: foxSwapEosOne.toFixed(2),
        fox_swap_eos_usdt_one: foxSwapEosOne.multipliedBy(priceEOS).toFixed(2),
        fox_swap_eos_ten: foxSwapEosTen.toFixed(2),
        fox_swap_eos_usdt_ten: foxSwapEosTen.multipliedBy(priceEOS).toFixed(2),
        fox_swap_eos_hundred: foxSwapEosHundred.toFixed(2),
        fox_swap_eos_usdt_hundred: foxSwapEosHundred.multipliedBy(priceEOS).toFixed(2),
        fox_swap_btc_one: foxSwapBTCOne.toFixed(4),
        fox_swap_btc_usdt_one: foxSwapBTCOne.multipliedBy(priceBTC).toFixed(2),
        fox_swap_btc_ten: foxSwapBTCTen.toFixed(4),
        fox_swap_btc_usdt_ten: foxSwapBTCTen.multipliedBy(priceBTC).toFixed(2),
        fox_swap_btc_hundred: foxSwapBTCHundred.toFixed(4),
        fox_swap_btc_usdt_hundred: foxSwapBTCHundred.multipliedBy(priceBTC).toFixed(2),
      }));
    });
  },

};

export default Swap;
