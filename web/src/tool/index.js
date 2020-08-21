import './index.scss';
import './assets.scss';
import './chains.scss';
import './stats.scss';
import $ from 'jquery';
import {BigNumber} from 'bignumber.js';

function Tool(router, api, loading) {
  this.router = router;
  this.api = api;
  this.loading = loading;
  this.templateTools = require('./index.html');
  this.templateAssets = require('./assets.html');
  this.templateChains = require('./chains.html');
  this.templateStats = require('./stats.html');
  this.chains = require('../api/chains.json');
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
    $('#tools-content').html(self.loading());

    $('.assets.tab').on('click', function (event) {
      if (!self.network) {
        return
      }
      self.renderAssets(false);
      $('.chains.tab').removeClass('active');
      $('.stats.tab').removeClass('active');
      $(this).addClass('active');
      $(window).scrollTop(0);
    });

    $('.chains.tab').on('click', function (event) {
      if (!self.network) {
        return
      }
      self.renderChains();
      $('.assets.tab').removeClass('active');
      $('.stats.tab').removeClass('active');
      $(this).addClass('active');
      $(window).scrollTop(0);
    });

    $('.stats.tab').on('click', function (event) {
      if (!self.network) {
        return
      }
      self.renderStats();
      $('.chains.tab').removeClass('active');
      $('.assets.tab').removeClass('active');
      $(this).addClass('active');
      $(window).scrollTop(0);
    });

    self.api.request('GET', '/network', undefined, function(resp) {
      if (resp.error) {
        return;
      }
      
      self.network = resp.data;
      self.renderAssets(true);
    });
  },

  renderStats: function () {
    const self = this;
    var network = self.getNetwork();

    self.fetchStats(function(stats) {
      $('#tools-content').html(self.templateStats({
        snapshots_count: new BigNumber(network.snapshots_count).toFormat(),
        assets_count: new BigNumber(network.assets_count).toFormat(),
        peak_throughput: network.peak_throughput,
        mintings: stats.mintings,
        best_snapshot_height: new BigNumber(stats.best_snapshot_height).toFormat(),
        accepted_nodes: stats.accepted_nodes,
        market_price_usd: stats.market_price_usd,
        circulation_xin: new BigNumber(new BigNumber(stats.circulation_xin).toFixed(0)).toFormat()
      }));
    });
  },

  fetchStats: function (callback) {
    const self = this;
    if (self.stats) {
      callback(self.stats);
    } else {
      $('#tools-content').html(self.loading());
      self.api.requestURL('GET', 'https://api.blockchair.com/mixin/stats', undefined, function(resp) {
        if (resp.error) {
          self.api.notifyError('error', resp.error);
          return; 
        }
        self.stats = resp.data;
        callback(self.stats);
      });
    }
  },

  renderChains: function () {
    const self = this;
    var network = self.getNetwork();
    var chains = this.chains.concat();
    
    var chainMap = {};
    network.chains.forEach(function(chain) {
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
  },

  getNetwork: function () {
    const jStr = JSON.stringify(this.network);
    return JSON.parse(jStr);
  },

  renderAssets: function (firstLoading) {
    const self = this;
    var network = self.getNetwork();
    if (!firstLoading) {
      $('#tools-content').html(self.loading());
    }

    var boxCirculatingSupply = window.localStorage.getItem('box_circulating_supply');
    if (!boxCirculatingSupply) {
      boxCirculatingSupply = "24046809";
    }
    self.api.requestURL('GET', 'https://box-api.xue.cn/funds', undefined, function(resp) {
      if (resp.error || !resp.data || resp.data.length < 1) {
        return; 
      }
      const circulatingSupply = resp.data[0].circulating_supply;
      if (circulatingSupply) {
        boxCirculatingSupply = circulatingSupply
        window.localStorage.setItem('box_circulating_supply', circulatingSupply);
      }
    });

    // Top 20 assets
    var assets = network.assets;
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

      var boxAsset = assetMap["f5ef6b5d-cc5a-3d90-b2c0-a2fd386e7a3c"];
      if (boxAsset) {
        boxAsset.amount = boxCirculatingSupply;
        assets = [boxAsset, ...assets];
      }
      
      for (var i = 0; i < assets.length; i++) {
        var asset = assets[i];
        var topAsset = assetMap[asset.asset_id];
        if (topAsset) {
          const priceUsd = new BigNumber(topAsset.price_usd);
          const changeUsd = new BigNumber(topAsset.change_usd);
          const amount = new BigNumber(asset.amount);
          var capitalization = new BigNumber(topAsset.capitalization);
          if (asset.asset_id === "f5ef6b5d-cc5a-3d90-b2c0-a2fd386e7a3c") {
            capitalization = amount.multipliedBy(priceUsd);
          }

          if (priceUsd.isGreaterThan(1)) {
            asset.price_usd = priceUsd.toFixed(2);  
          } else {
            asset.price_usd = priceUsd.toString();
          }
          asset.amount = new BigNumber(amount.toFixed(0)).toFormat();
          asset.change_usd = changeUsd.multipliedBy(100).toFixed(2);
          if (changeUsd.isLessThan(0)) {
            asset.change_usd_red = true;
          }
          asset.org_capitalization = capitalization.toString();
          asset.capitalization = new BigNumber(capitalization.toFixed(0)).toFormat();
          asset.asset_icon_url = asset.icon_url;
          var chainAsset = self.chainMap[topAsset.chain_id];
          if (chainAsset) {
            asset.chain_icon_url = chainAsset.icon_url;
          }
        }
      }

      assets.sort(function (a, b) {
        const value = new BigNumber(a.org_capitalization).minus(b.org_capitalization)
        if (value.isZero()) {
          return 0;
        } else if (value.isNegative()) {
          return 1;
        } else {
          return -1;
        }
      });

      $('#tools-content').html(self.templateAssets({
        assets: assets,
        totalCapitalization: new BigNumber(new BigNumber(totalCapitalization).toFixed(0)).toFormat()
      }));
    });
  }

};

export default Tool;
