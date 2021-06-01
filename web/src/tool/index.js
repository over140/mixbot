import './index.scss';
import './assets.scss';
import './chains.scss';
import './stats.scss';
import './transactions.scss';
import './nodes.scss';
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
  this.templateNodes = require('./nodes.html');
  this.nodeFoxoneImage = require('./node-foxone.png');
  this.nodeAnonymousImage = require('./node-anonymous.png');
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

    document.title = "Mixin 数据";

    self.renderAssets();
    self.renderChains();
    self.renderStats();
    self.renderTransactions();
    self.renderNodes();

    $('.tabs').on('click', '.tab', function (event) {
      const activeClassName = this.className.split(/\s+/)[0];
      const tabs = ['chains', 'assets', 'transactions', 'nodes', 'stats'];
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

  getNodeIcon: function(host) {
    const lowerHost = host.toLowerCase();
    if (lowerHost.indexOf(".b1.run") >= 0) {
      return "https://mixin-images.zeromesh.net/VYpwrP_nI4zE6dcB2thEh3noEs5XR_o94ggwvCyZT3Lg7LU-odxp9HyG5WGcAUY6BCVkBRNmCW6HD6T2gO7mjw=s256";
    } else if (lowerHost.indexOf(".exinpool.com") >= 0) {
      return "https://mixin-images.zeromesh.net/--ccgu6VAw7MB9bALITSa_CdSAJ2DUfr7TdzumMOWV1tMYbadr4V8KtgfcgprQ9VUQMllealtsIq350BReNu34Y=s256";
    } else if (lowerHost.startsWith("http://node-candy") && lowerHost.indexOf(".f1ex.io") >= 0) {
      return "https://mixin-images.zeromesh.net/wrGUPXYeb4zw1cm9KL27ftmqEWdu2-ltzKQlRAlHe4ulneHj7IdTwgPdsX4csuxYBAuIi8_iBfMI7yX6xQmlQA=s128";
    } else if (lowerHost.startsWith("http://mixin-node") && lowerHost.indexOf(".b.watch") >= 0) {
      return "https://mixin-images.zeromesh.net/PUh63FawGz6kfizE1YtCqKi_KQ5l7UNIIu2eoNFYWw8u8BezVVxQu2noYXD5EFpVM06su6Ba92LTN2f7RBoM77o=s256";
    } else if (lowerHost.indexOf(".f1ex.io") >= 0) {
      return this.nodeFoxoneImage;
    } else if (lowerHost.indexOf(".eoslaomao.com") >= 0) {
      return "https://mixin-images.zeromesh.net/YNl_6u3y_3lrrjyyMN9O8EV2YK6gep1O2h7LyenGGkCpjBmqFHtYk2q8hi2HiBuIuRCUZimkomkK8J1WqWYzhQ=s256";
    } else if (lowerHost.indexOf(".poolin.com") >= 0) {
      return "https://mixin-images.zeromesh.net/Dh-e_i2yLp-eWJPVK2D5LSCbXOoiG5MyTuH5ZS-CHSHVaiVFyWiiugqlClsOWsnOvtLH4e7HNBzVVmS1goo_oW4=s256";
    } else if (lowerHost.indexOf("34.66.213.188") >= 0) {
      return "https://mixin-images.zeromesh.net/1HUpTRTLJg9PehbzTyMVOPSNmPiM0sr5006xTH2WQIUc3g7QwsePDvtr7YNo0ZDeK3rEx5TpqU45hTDWW2Bk1w=s256";
    } else {
      return this.nodeAnonymousImage;
    }
  },

  cutNodeVersion: function(version) {
    if (version.indexOf("-") >= 0) {
      return version.substring(0, version.indexOf("-"));
    } else {
      return version
    }
  },

  buildNode: function(node, workNode, host) {
    return {
      host: host,
      state: workNode.state,
      is_accpted: workNode.state == "ACCEPTED",
      pool: node.mint.pool,
      icon_url: this.getNodeIcon(host),
      version: this.cutNodeVersion(node.version),
      topology: new BigNumber(node.graph.topology).toFormat(),
      node_id: node.node,
      workLead: workNode.works[0],
      workSign: workNode.works[1],
      works: workNode.works[0] * 1.2 + workNode.works[1]
    };
  },

  renderNodes: function() {
    const self = this;
    $('#nodes-content').html(self.loading());

    self.api.requestURL('GET', 'https://api.mixin.space/nodes', undefined, function(resp) {
      if (resp.error) {
        return;
      }

      var totalWorks = 0;
      var nodes = resp.data;

      nodes.forEach(function(node){
        node.version = self.cutNodeVersion(node.version);
        node.is_accpted = node.state == "ACCEPTED";
        node.icon_url = self.getNodeIcon(node.host);
        const works = node.works;
        node.workLead = works[0];
        node.workSign = works[1];
        node.works = works[0] * 1.2 + works[1];
        totalWorks += node.works;
      });

      nodes.sort(function (a, b) {
        if (!a.is_accpted && b.is_accpted) {
          return -1;
        } else if (a.is_accpted && !b.is_accpted) {
          return 1;
        } else {
          const value = new BigNumber(a.works).minus(b.works);
          if (value.isZero()) {
            return 0;
          } else if (value.isNegative()) {
            return 1;
          } else {
            return -1;
          }
        }
      });
  
      const dayMint = new BigNumber(40500 * 0.9).div(365)
      const avgMint = dayMint.div(totalWorks);
  
      nodes.forEach(function(node){
        if (node.workSign > 0) {
          node.mint = avgMint.multipliedBy(node.works).toFixed(8);
        } else {
          node.mint = "0";
        }
        node.staking = new BigNumber(node.staking).toFormat();
        node.works = new BigNumber(node.works).toFormat();
        node.topology = new BigNumber(node.topology).toFormat();
      });
  
      $('#nodes-content').html(self.templateNodes({
        day_mint: dayMint.toFixed(8),
        avg_mint: dayMint.div(nodes.length).toFixed(8),
        total_nodes: nodes.length,
        nodes: nodes
      }));
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
          return true;
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
          minting_reward: new BigNumber(40500 * 0.9).div(365).div(stats.accepted_nodes).toFixed(8),
          staking_xin: new BigNumber(new BigNumber(11900).multipliedBy(stats.accepted_nodes).plus(50000).toFixed(0)).toFormat(),
          circulation_xin: new BigNumber(new BigNumber(stats.circulation_xin).toFixed(0)).toFormat()
        }));
      });
    });
  },

  renderChains: function () {
    const self = this;
    var chains = this.chains.concat();
    $('#chains-content').html(self.loading());
    
    self.api.request('GET', '/network/chains', undefined, function(resp) {
      if (resp.error) {
        return;
      }

      var chainMap = {};
      resp.data.forEach(function(chain) {
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
          chain.withdrawal_pending_count = withdrawalPendingCount.toString();
          totalWithdrawals = totalWithdrawals.plus(withdrawalPendingCount);
          chain.deposit_block_height = depositBlockHeight.toFormat();
          chain.is_error = !chainAsset.is_synchronized;
          const differenceBlockHeight = managedBlockHeight.minus(chainAsset.threshold).minus(depositBlockHeight);
          chain.difference_block_height = differenceBlockHeight.abs().toFormat();
          chain.is_slow = differenceBlockHeight.isGreaterThan(2);
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

  renderAssets: function () {
    const self = this;
    $('#assets-content').html(self.loading());

    self.api.request('GET', '/network/assets/top', undefined, function(resp) {
      if (resp.error) {
        return;
      }

      const topAssets = resp.data;
      var totalCapitalization = new BigNumber(0);
      
      for (var i = 0; i < topAssets.length; i++) {
        var asset = topAssets[i];
        const priceUsd = new BigNumber(asset.price_usd);
        const changeUsd = new BigNumber(asset.change_usd);
        const amount = new BigNumber(asset.liquidity);
        const capitalization = new BigNumber(asset.capitalization);
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
        var chainAsset = self.chainMap[asset.chain_id];
        if (chainAsset) {
          asset.chain_icon_url = chainAsset.icon_url;
        }
      }

      topAssets.sort(function (a, b) {
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
        assets: topAssets,
        totalCapitalization: new BigNumber(new BigNumber(totalCapitalization).toFixed(0)).toFormat()
      }));
    });
  }
};

export default Tool;
