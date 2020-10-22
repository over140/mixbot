import './index.scss';
import './assets.scss';
import './chains.scss';
import './stats.scss';
import './transactions.scss';
import $, { contains } from 'jquery';
import {BigNumber} from 'bignumber.js';
import TimeUtils from '../utils/time.js';

function Tool(router, api, loading) {
  this.router = router;
  this.api = api;
  this.loading = loading;
  this.templateTools = require('./index.html');
  this.templateAssets = require('./assets.html');
  this.templateChains = require('./chains.html');
  this.templateStats = require('./stats.html');
  this.templateTransactions = require('./transactions.html');
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

    self.renderAssets();
    self.renderChains();
    self.renderStats();
    self.renderTransactions();

    $('.tabs').on('click', '.tab', function (event) {
      const activeClassName = this.className.split(/\s+/)[0];
      const tabs = ['chains', 'assets', 'transactions', 'stats'];
      for (var i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        if (tab === activeClassName) {
          $('.' + tab + '.tab').addClass('active');
          $('.' + tab + '.tools.list').addClass('active');
        } else {
          $('.' + tab + '.tab').removeClass('active');
          $('.' + tab + '.tools.list').removeClass('active');
        }
      }
      $(window).scrollTop(0);
    });
  },

  simpleHash: function (hash) {
    if (hash && hash.length > 28) {
      return hash.substring(0, 8) + "......" + hash.substring(hash.length - 6, hash.length);
    }
    return hash
  },

  fetchTransactions: function (callback, offset, transactions) {
    const self = this;
    if (!offset) {
      offset = TimeUtils.rfc3339(new Date())
    }
    self.api.request('GET', '/external/transactions?limit=500&offset=' + offset, undefined, function(resp) {
      if (resp.error) {
        return;
      }
      if (transactions) {
        transactions = transactions.concat(resp.data);
      } else {
        transactions = resp.data;
      }
      if (resp.data.length >= 500) {
        const lastTransaction = resp.data[resp.data.length - 1];
        self.fetchTransactions(callback, lastTransaction.created_at, transactions);
      } else {
        callback(transactions);
      }
    });
  },

  renderTransactions: function () {
    const self = this;
    $('#transactions-content').html(self.loading());

    self.api.request('GET', '/network/assets/top', undefined, function(resp) {
      if (resp.error) {
        return;
      }

      var topAssets = resp.data
      var assetMap = {};
      topAssets.forEach(function(asset) {
        assetMap[asset.asset_id] = asset;
      });
      var totalCapitalization = new BigNumber(0);

      self.fetchTransactions(function(transactions) {
        if (resp.error) {
          return;
        }

        var groups = [];
        var trasactionGroups = {};
        for (var i = 0; i < transactions.length; i++) {
          var transaction = transactions[i];
          var asset = assetMap[transaction.asset_id];
          var chainAsset = self.chainMap[transaction.chain_id];
          if (transaction.asset_id === transaction.chain_id && !asset) {
            asset = chainAsset;
            asset.price_usd = 0;
          }
          if (asset && chainAsset) {
            var trasactionGroup = trasactionGroups[transaction.asset_id];
            if (trasactionGroup) {
              trasactionGroup.amount = new BigNumber(trasactionGroup.amount).plus(transaction.amount);
              trasactionGroup.number++;
            } else {
              var group = {
                chain_icon_url: chainAsset.icon_url,
                asset_icon_url: asset.icon_url,
                asset_id: transaction.asset_id,
                symbol: asset.symbol,
                price_usd: asset.price_usd,
                amount: transaction.amount,
                number: 1
              };
              trasactionGroups[transaction.asset_id] = group;
              groups.push(group);
            }
            totalCapitalization = totalCapitalization.plus(new BigNumber(transaction.amount).multipliedBy(asset.price_usd));
          }
        }

        groups.forEach(function(trasactionGroup){
          trasactionGroup.capitalization = new BigNumber(new BigNumber(trasactionGroup.amount).multipliedBy(trasactionGroup.price_usd).toFixed(2)).toFormat();
          trasactionGroup.amountStr = new BigNumber(new BigNumber(trasactionGroup.amount).toFixed(8)).toFormat();
        });

        groups.sort(function (a, b) {
          const aCapitalization = new BigNumber(a.amount).multipliedBy(a.price_usd);
          const bCapitalization = new BigNumber(b.amount).multipliedBy(b.price_usd);
          const value = new BigNumber(aCapitalization).minus(bCapitalization);
          if (value.isZero()) {
            return 0;
          } else if (value.isNegative()) {
            return 1;
          } else {
            return -1;
          }
        });

        $('#transactions-content').html(self.templateTransactions({
          totalCapitalization: new BigNumber(totalCapitalization.toFixed(0)).toFormat(),
          totalTransactions: transactions.length,
          transactions: groups
        }));
      });
    });
  },

  renderStats: function () {
    const self = this;
    $('#stats-content').html(self.loading());

    self.api.request('GET', '/network', undefined, function(resp) {
      if (resp.error) {
        return;
      }

      const network = resp.data;
      self.api.requestURL('GET', 'https://api.blockchair.com/mixin/stats', undefined, function(resp) {
        if (resp.error) {
          self.api.notifyError('error', resp.error);
          return; 
        }
        const stats = resp.data;
        $('#stats-content').html(self.templateStats({
          snapshots_count: new BigNumber(network.snapshots_count).toFormat(),
          assets_count: new BigNumber(network.assets_count).toFormat(),
          peak_throughput: network.peak_throughput,
          mintings: stats.mintings,
          best_snapshot_height: new BigNumber(stats.best_snapshot_height).toFormat(),
          accepted_nodes: stats.accepted_nodes,
          market_price_usd: stats.market_price_usd,
          minting_reward: new BigNumber(45000 * 0.9).div(365).div(stats.accepted_nodes).toFixed(8),
          circulation_xin: new BigNumber(new BigNumber(stats.circulation_xin).toFixed(0)).toFormat()
        }));
      });
    });
  },

  renderChains: function () {
    const self = this;
    var chains = this.chains.concat();
    $('#chains-content').html(self.loading());
    
    self.api.request('GET', '/network', undefined, function(resp) {
      if (resp.error) {
        return;
      }

      var chainMap = {};
      resp.data.chains.forEach(function(chain) {
        chainMap[chain.chain_id] = chain;
      });

      var totalWithdrawals = new BigNumber(0);
      
      for (var i = 0; i < chains.length; i++) {
        var chain = chains[i];
        var chainAsset = chainMap[chain.chain_id];
        if (chainAsset) {
          const depositBlockHeight = new BigNumber(chainAsset.deposit_block_height);
          const managedBlockHeight = new BigNumber(chainAsset.managed_block_height);
          chain.is_synchronized = chainAsset.is_synchronized;
          chain.threshold = chainAsset.threshold;
          chain.withdrawal_fee = chainAsset.withdrawal_fee;
          var withdrawalPendingCount = new BigNumber(chainAsset.withdrawal_pending_count);
          if (chain.chain_id === "990c4c29-57e9-48f6-9819-7d986ea44985") {
            withdrawalPendingCount = withdrawalPendingCount.minus(1);
          }
          chain.withdrawal_pending_count = withdrawalPendingCount.toString();
          totalWithdrawals = totalWithdrawals.plus(withdrawalPendingCount);
          chain.deposit_block_height = depositBlockHeight.toFormat();
          chain.is_error = !chainAsset.is_synchronized;
          chain.is_slow = depositBlockHeight < managedBlockHeight;
          chain.difference_block_height = managedBlockHeight.minus(depositBlockHeight).abs().toFormat();
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

      $('#chains-content').html(self.templateChains({
        totalChains: chains.length,
        totalWithdrawals: totalWithdrawals.toString(),
        chains: chains
      }));
    });
  },

  requestAssetData: function (callback) {
    const self = this;
    var result = {};
    function checkResult() {
      if (result.circulatingSupply && result.topAssets && result.assets) {
        callback(result);
      }
    }
    self.api.requestURL('GET', 'https://box-api.xue.cn/funds', undefined, function(resp) {
      if (resp.error || !resp.data || resp.data.length < 1) {
        return; 
      }
      const circulatingSupply = resp.data[0].circulating_supply;
      if (circulatingSupply) {
        result.circulatingSupply = circulatingSupply
        window.localStorage.setItem('box_circulating_supply', circulatingSupply);
      } else {
        result.circulatingSupply = window.localStorage.getItem('box_circulating_supply');
      }
      checkResult();
    });

    self.api.request('GET', '/network', undefined, function(resp) {
      if (resp.error) {
        return;
      }
      result.assets = resp.data.assets;
      checkResult();
    });

    self.api.request('GET', '/network/assets/top', undefined, function(resp) {
      if (resp.error) {
        return;
      }
      result.topAssets = resp.data;
      checkResult();
    });
  },

  renderAssets: function () {
    const self = this;
    $('#assets-content').html(self.loading());

    self.requestAssetData(function(data) {
      const boxCirculatingSupply = data.circulatingSupply;
      const topAssets = data.topAssets;
      var assets = data.assets;

      var totalCapitalization = new BigNumber(0);
      var assetMap = {};
      topAssets.forEach(function(asset) {
        assetMap[asset.asset_id] = asset;
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
          if (asset.asset_id === "f5ef6b5d-cc5a-3d90-b2c0-a2fd386e7a3c" || asset.asset_id === "c94ac88f-4671-3976-b60a-09064f1811e8") {
            capitalization = amount.multipliedBy(priceUsd);
          }
          totalCapitalization = totalCapitalization.plus(capitalization); 

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

      $('#assets-content').html(self.templateAssets({
        assets: assets,
        totalCapitalization: new BigNumber(new BigNumber(totalCapitalization).toFixed(0)).toFormat()
      }));
    });
  }
};

export default Tool;
