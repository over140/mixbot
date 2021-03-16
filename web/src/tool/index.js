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
  var nodes = JSON.parse(window.localStorage.getItem('nodes'));
  var nodeMap = {};
  if (nodes) {
    nodes.forEach(function(node) {
      nodeMap[node.host] = node;
    });
  }
  this.nodeMap = nodeMap;
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
    } else if (lowerHost.startsWith("http://node-box") && lowerHost.indexOf(".f1ex.io") >= 0) {
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
      node: node.node,
      workLead: workNode.works[0],
      workSign: workNode.works[1],
      works: workNode.works[0] * 1.2 + workNode.works[1]
    };
  },

  buildCacheNode: function(node) {
    const nodeId = node.node;
    var workNode = tempConsensus.filter(function(node){
      return node.node == nodeId;
    })[0];

    if (!workNode) {
      return;
    }

    node.workLead = workNode.works[0];
    node.workSign = workNode.works[1];
    node.works = workNode.works[0] * 1.2 + workNode.works[1];
    return node;
  },

  fetchRemoteNodes: function(callback) {
    console.info("==========fetchRemoteNodes===========");
    const self = this;
    const checkNodes = [
      "http://node-box.f1ex.io:8239",
      "http://mixin-node-01.b1.run:8239",
      "http://mixin-node-02.b1.run:8239",
      "http://mixin-node-03.b1.run:8239",
      "http://mixin-node-04.b1.run:8239",
      "http://mixin-node-05.b1.run:8239",
      "http://mixin-node-07.b1.run:8239",
      "http://34.82.92.203:8239",
      "http://mixin-node0.exinpool.com:8239",
      "http://mixin-node1.exinpool.com:8239",
      "http://mixin-node2.exinpool.com:8239",
      "http://node-candy.f1ex.io:8239",
      "http://node-box-2.f1ex.io:8239",
      "http://node-42.f1ex.io:8239",
      "http://mixin-node0.eoslaomao.com:1443",
      "http://mixin-node1.eoslaomao.com:1443",
      "http://35.188.242.130:8239",
      "http://35.245.207.174:8239",
      "http://35.185.16.229:8239",
      "http://35.227.72.6:8239",
      "https://mixin-node.poolin.com",
      "http://35.237.226.29:8239",
      "http://34.83.129.200:8239",
      "http://34.83.136.66:8239",
      "http://34.83.199.95:8239",
      "http://35.233.138.56:8239",
      "http://34.66.213.188:8239",
      "http://13.58.51.38:8239",
      "http://18.224.233.177:8239",
      "http://3.15.58.214:8239",
      "http://3.213.97.106:8239",
      "http://50.17.96.121:8239",
      "http://18.144.3.42:8239",
      "http://18.144.155.115:8239",
      "http://44.233.85.154:8239",
      "http://54.188.62.72:8239",
      "http://34.67.2.0:8239",
      "http://lehigh.hotot.org:8239"
    ];
    var nodes = [];
    var totalNodes = checkNodes.length;
    var tempConsensus;

    for (var i = 0; i < checkNodes.length; i++) {
      const host = checkNodes[i];
      self.api.requestURL('GET', 'https://api.mixinwallet.com/getinfo?node=' + host, undefined, function(resp) {
        if (resp.error) {
          var node = self.nodeMap[host];
          if (node && tempConsensus) {
            const nodeId = node.node;
            var workNode = tempConsensus.filter(function(node){
              return node.node == nodeId;
            })[0];

            if (!workNode) {
              return true;
            }

            node.workLead = workNode.works[0];
            node.workSign = workNode.works[1];
            node.works = workNode.works[0] * 1.2 + workNode.works[1];
            nodes.push(node);
            if (nodes.length == totalNodes) {
              callback(nodes);
            }
          }
          return true;
        }
        const nodeId = resp.data.node;
        var workNode = resp.data.graph.consensus.filter(function(node){
          return node.node == nodeId
        })[0];

        if (!workNode || workNode.state == "REMOVED") {
          console.info(resp.data);
          totalNodes--;
          return;
        }

        if (!tempConsensus) {
          tempConsensus = resp.data.graph.consensus;
        }

        nodes.push(self.buildNode(resp.data, workNode, host));
        if (nodes.length == totalNodes) {
          console.info("====remote..." + nodes.length)
          window.localStorage.setItem('nodes', JSON.stringify(nodes));
          callback(nodes);
        }
      });
    }
  },

  renderWorkNodes: function(nodes, self) {
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

    var maxWorks = 0, minWorks = 0, totalWorks = 0, totalValidNode = 0;//ACCEPTED
    nodes.forEach(function(node){
      if (node.works > maxWorks) {
        maxWorks = node.works;
      }

      if (node.workSign > 0) {
        if (node.works < minWorks || minWorks == 0) {
          minWorks = node.works;
        }
        
        totalValidNode++;
        totalWorks += node.works;
      }

    });
    console.info("totalWorks:" + totalWorks + " maxWorks:" + maxWorks + " minWorks:" + minWorks + " totalValidNode:" + totalValidNode);
    var avg = (totalWorks - maxWorks - minWorks) / (totalValidNode - 2);

    var dayMint = new BigNumber(40500 * 0.9).div(365);
    var totalMintWork = new BigNumber(0);

    nodes.forEach(function(node){
      // a = average work
      // for w > 7a, s = 2a
      // for 7a > w > a, s = 1/6w + 5/6a
      // for a > w > 1/7a, s = w
      // for a < 1/7a, s = 1/7a

      if (node.workSign > 0) {
        if (node.works >= 7 * avg) {
          node.mintWork = 2 * avg;
        } else if (node.works >= avg) {
          node.mintWork = node.works / 6 + avg * 5 / 6;
        } else if (node.works >= avg / 7) {
          node.mintWork = node.works;
        } else {
          node.mintWork = avg / 7;
        }
        totalMintWork = totalMintWork.plus(node.mintWork);
      }
    });

    var avgMint = dayMint.div(totalMintWork);
    console.info("avg:" + avg + " totalMintWork:" + totalMintWork + " avgMint:" + avgMint.toFixed(8));

    nodes.forEach(function(node){
      if (node.workSign > 0) {
        node.mint = avgMint.multipliedBy(node.mintWork).toFixed(8);
      } else {
        node.mint = "0";
      }
    });

    console.info("==========renderWorkNodes===========");

    $('#nodes-content').html(self.templateNodes({
      day_mint: dayMint.toFixed(8),
      pool: new BigNumber(nodes[0].pool).toFormat(),
      total_nodes: nodes.length,
      nodes: nodes
    }));
  },

  renderNodes: function() {
    const self = this;
    $('#nodes-content').html(self.loading());

    const nodeIds = Object.keys(self.nodeMap);
    if (self.nodeMap && nodeIds.length > 7) {
      console.info("==========fetchLocalNodes===========");
      self.api.requestURL('GET', 'https://api.mixinwallet.com/getinfo', undefined, function(resp) {
        if (resp.error) {
          self.api.notifyError('error', resp.error);
          self.fetchRemoteNodes(renderWorkNodes);
          return true;
        }

        var nodeIdMap = {};
        nodeIds.forEach(function(nodeId){
          const node = self.nodeMap[nodeId];
          nodeIdMap[node.node] = node;
        });

        var nodes = [];
        const consensus = resp.data.graph.consensus;
        for (var i = 0; i < consensus.length; i++) {
          const newNode = consensus[i];
          var node = nodeIdMap[newNode.node];
          if (node) {
            node.workLead = newNode.works[0];
            node.workSign = newNode.works[1];
            node.works = newNode.works[0] * 1.2 + newNode.works[1];
            nodes.push(node);
          } else {
            console.info(newNode.node);
          }

          if (i == consensus.length - 1) {
            self.renderWorkNodes(nodes, self);
            self.fetchRemoteNodes(function(nodes){
              self.renderWorkNodes(nodes, self);
            });
          }
        }
      });
    } else {
      self.fetchRemoteNodes(function(nodes){
        self.renderWorkNodes(nodes, self);
      });
    }
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
