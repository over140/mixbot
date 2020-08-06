import './index.scss';
import './assets.scss';
import './chains.scss';
import $ from 'jquery';
import {BigNumber} from 'bignumber.js';

function Tool(router, api, loading) {
  this.router = router;
  this.api = api;
  this.loading = loading;
  this.templateTools = require('./tools.html');
  this.templateAssets = require('./assets.html');
  this.templateChains = require('./chains.html');
  this.chains = require('./chains.json');
  var chainMap = {};
  this.chains.forEach(function(chain) {
    chainMap[chain.chain_id] = chain;
  });
  this.chainMap = chainMap;

  BigNumber.config({ 
    FORMAT: {
      decimalSeparator: '.',
      groupSeparator: ',',
      groupSize: 3,
      secondaryGroupSize: 0
    }
  });
}

Tool.prototype = {

  render: function () {
    const self = this;
    $('body').attr('class', 'tool layout');
    $('#layout-container').html(self.templateTools());

    self.renderAssets();

    $('.assets.tab').on('click', function (event) {
      self.renderAssets();
      $('.chains.tab').removeClass('active');
      $(this).addClass('active');
      $(window).scrollTop(0);
    });

    $('.chains.tab').on('click', function (event) {
      self.renderChains();
      $('.assets.tab').removeClass('active');
      $(this).addClass('active');
      $(window).scrollTop(0);
    });
  },

  renderChains: function () {
    const self = this;
    $('#tools-content').html(self.loading());

    var chains = this.chains.concat();

    self.api.request('GET', '/network', undefined, function(resp) {
      if (resp.error) {
        return;
      }

      var chainMap = {};
      resp.data.chains.forEach(function(chain) {
        chainMap[chain.chain_id] = chain;
      });
      
      for (var i = 0; i < chains.length; i++) {
        var chain = chains[i];
        var chainAsset = chainMap[chain.chain_id];
        if (chainAsset) {
          const depositBlockHeight = new BigNumber(chainAsset.deposit_block_height);
          const externalBlockHeight = new BigNumber(chainAsset.external_block_height);
          chain.is_synchronized = chainAsset.is_synchronized;
          chain.threshold = chainAsset.threshold;
          chain.withdrawal_fee = chainAsset.withdrawal_fee;
          chain.withdrawal_pending_count = chainAsset.withdrawal_pending_count;
          chain.deposit_block_height = depositBlockHeight.toFormat();
          chain.is_error = !chainAsset.is_synchronized;
          chain.is_slow = depositBlockHeight < externalBlockHeight;
          chain.difference_block_height = externalBlockHeight.minus(depositBlockHeight).abs().toFormat();
          if (chainAsset.is_synchronized && chain.average_block_time) {
            const blockTime = parseInt(chain.average_block_time) * parseInt(chain.threshold)
            if (blockTime < 60) {
              chain.deposit_time = "充值预计 " + blockTime + " 秒到账";
            } else {
              const hours = Math.floor(blockTime / 60 / 60)
              const minutes = Math.floor(blockTime / 60) % 60
              const seconds = Math.floor(blockTime - minutes * 60)

              var deposit_time = "充值预计 "
              if (hours < 1) {
                deposit_time += minutes + " 分钟"
                if (seconds > 0) {
                  deposit_time += " " + seconds + " 秒"
                }
              } else {
                deposit_time += hours + " 小时"
                if (minutes > 0) {
                  deposit_time += " " + minutes + " 分钟"
                }
              }
              deposit_time += "到账";
              chain.deposit_time = deposit_time
            }
          }
        }
      }

      chains.sort(function (chainA, chainB) {
        if (chainA.is_error && !chainB.is_error) {
          return -1
        } else if (!chainA.is_error && chainB.is_error) {
          return 1
        }
        return 0;
      });

      $('#tools-content').html(self.templateChains({
        chains: chains
      }));
    });
  },

  renderAssets: function () {
    const self = this;
    $('#tools-content').html(self.loading());

    self.api.request('GET', '/network', undefined, function(resp) {
      if (resp.error) {
        return;
      }

      // Top 20 assets
      var assets = resp.data.assets;
      self.api.request('GET', '/network/assets/top', undefined, function(resp) {
        if (resp.error) {
          return;
        }
  
        // Top 100 assets
        var totalCapitalization = new BigNumber(0);
        var topAssets = resp.data
        var assetMap = {};
        topAssets.forEach(function(asset) {
          assetMap[asset.asset_id] = asset;
          if (asset.asset_id != "f5ef6b5d-cc5a-3d90-b2c0-a2fd386e7a3c" && asset.asset_id != "c94ac88f-4671-3976-b60a-09064f1811e8") {
            totalCapitalization = totalCapitalization.plus(asset.capitalization); 
          }
        });
        
        for (var i = 0; i < assets.length; i++) {
          var asset = assets[i];
          var topAsset = assetMap[asset.asset_id];
          if (topAsset) {
            const priceUsd = new BigNumber(topAsset.price_usd);
            const changeUsd = new BigNumber(topAsset.change_usd);
            if (priceUsd.isGreaterThan(1)) {
              asset.price_usd = priceUsd.toFixed(2);  
            } else {
              asset.price_usd = priceUsd.toString();
            }
            asset.amount = new BigNumber(new BigNumber(asset.amount).toFixed(0)).toFormat();
            asset.change_usd = changeUsd.multipliedBy(100).toFixed(2);
            if (changeUsd.isLessThan(0)) {
              asset.change_usd_red = true;
            }
            asset.capitalization = new BigNumber(new BigNumber(topAsset.capitalization).toFixed(2)).toFormat();
            asset.asset_icon_url = asset.icon_url;
            var chainAsset = self.chainMap[topAsset.chain_id];
            if (chainAsset) {
              asset.chain_icon_url = chainAsset.icon_url;
            }
          }
        }
        $('#tools-content').html(self.templateAssets({
          assets: assets,
          totalCapitalization: new BigNumber(new BigNumber(totalCapitalization).toFixed(0)).toFormat()
        }));
      });
    });
  }

};

export default Tool;
