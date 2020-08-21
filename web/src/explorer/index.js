import './index.scss';
import $ from 'jquery';
import TimeUtils from '../utils/time.js';

function Explorer(router, api) {
  this.router = router;
  this.api = api;
  this.templateIndex = require('./index.html');
  this.templateSnapshotItem = require('./snapshots_item.html');
  this.templateExplorers = require('./explorers.html');
  this.chains = require('../api/chains.json');
  var chainMap = {};
  this.chains.forEach(function(chain) {
    chainMap[chain.chain_id] = chain;
  });
  this.chainMap = chainMap;
}

Explorer.prototype = {

  render: function () {
    const self = this;
    $('body').attr('class', 'tool layout');
    $('#layout-container').html(self.templateIndex());
    $('#more-loading').attr('src', require('./loading.gif'));

    $('.snapshots.tab').on('click', function (event) {
      $('.explores.tab').removeClass('active');
      $('.explores.list').removeClass('active');
      $('.snapshots.tab').addClass('active');
      $('.snapshots.list').addClass('active');
    });

    $('.explores.tab').on('click', function (event) {
      $('.snapshots.tab').removeClass('active');
      $('.snapshots.list').removeClass('active');
      $('.explores.tab').addClass('active');
      $('.explores.list').addClass('active');
    });

    var explorers = require('./explorers-zh.json');

    for (var i = 0; i < explorers.length; i++) {
      explorers[i].icon_url = require(explorers[i].icon_url + '');
    }

    $('#explores').html(self.templateExplorers({
      explorers: explorers
    }));

    self.api.request('GET', '/network/assets/top', undefined, function(resp) {
      if (resp.error) {
        return;
      }
      
      var topAssets = resp.data
      const assetMap = {};
      topAssets.forEach(function(asset) {
        assetMap[asset.asset_id] = asset;
      });

      self.assetMap = assetMap;
      self.fetchSnapshots(TimeUtils.rfc3339(new Date()));
    });
  },

  fetchSnapshots: function (offset) {
    const self = this;
    self.api.requestMixin('GET', '/snapshots?limit=500&offset=' + offset, undefined, function(resp) {
      if (resp.error) {
        $('.more.loading').hide();
        return;
      }

      var snapshots = resp.data.filter(function(snapshot) {
        return snapshot.type == "deposit" || snapshot.type == "withdrawal";
      });

      self.renderSnapshots(snapshots);

      if ($('#records tr').length < 30 && resp.data.length >= 500) {
        const lastSnapshot = resp.data[resp.data.length - 1];
        self.fetchSnapshots(lastSnapshot.created_at);
      } else {
        $('.more.loading').hide();
      }
    });
  },

  simpleHash: function (hash) {
    if (hash && hash.length > 28) {
      return hash.substring(0, 8) + "......" + hash.substring(hash.length - 6, hash.length);
    }
    return hash
  },

  updateSnapshotAsset: function(snapshot, asset) {
    if (!asset) {
      return    
    }

    var chainAsset = this.chainMap[asset.chain_id];
    if (chainAsset) {
      snapshot.chain_icon_url = chainAsset.icon_url;
      if (snapshot.transaction_hash) {
        if (chainAsset.chain_id === "7397e9f1-4e42-4dc8-8a3b-171daaadd436" && snapshot.created_at < '2019-11-13T00:00:00.495266Z') {
          snapshot.explorer_url = 'https://cosmoshub-2.bigdipper.live/transactions/' + snapshot.transaction_hash;
        } else if (asset.asset_id === "815b0b1a-2764-3736-8faa-42d694fa620a") {
          snapshot.explorer_url = 'https://omniexplorer.info/tx/' + snapshot.transaction_hash;
        } else {
          snapshot.explorer_url = chainAsset.explore + snapshot.transaction_hash;
        }
      }
    }
    snapshot.asset_icon_url = asset.icon_url;
    snapshot.symbol = asset.symbol;
  },

  renderSnapshots: function (snapshots) {
    const self = this;

    for (var i = 0; i < snapshots.length; i++) {
      var snapshot = snapshots[i];
      const asset = self.assetMap[snapshot.asset_id];

      snapshot.explorer_url = "#";
      self.updateSnapshotAsset(snapshot, asset);

      if (snapshot.transaction_hash) {
        snapshot.txid = self.simpleHash(snapshot.transaction_hash);
      }
      
      if (snapshot.type == "withdrawal" && snapshot.receiver) {
        if (snapshot.memo) {
          snapshot.withdrawal_address = self.simpleHash(snapshot.receiver + ":" + snapshot.memo);
        } else {
          snapshot.withdrawal_address = self.simpleHash(snapshot.receiver);
        }
      }

      if (!asset) {
        snapshot.asset_icon_url = 'https://mixin-images.zeromesh.net/yH_I5b0GiV2zDmvrXRyr3bK5xusjfy5q7FX3lw3mM2Ryx4Dfuj6Xcw8SHNRnDKm7ZVE3_LvpKlLdcLrlFQUBhds=s128';
        snapshot.chain_icon_url = 'https://mixin-images.zeromesh.net/zVDjOxNTQvVsA8h2B4ZVxuHoCF3DJszufYKWpd9duXUSbSapoZadC7_13cnWBqg0EmwmRcKGbJaUpA8wFfpgZA=s128';
      }

      snapshot.is_deposit = snapshot.type == "deposit";
      snapshot.created_at = new Date(snapshot.created_at).toLocaleString();

      $('#records').append(self.templateSnapshotItem({
        snapshot: snapshot
      }));

      if (!asset) {
        const assetId = snapshot.asset_id;
        self.api.requestMixin('GET', '/network/assets/' + assetId, undefined, function(resp) {
          if (resp.error) {
            return;
          }

          const remoteAsset = resp.data;
          self.assetMap[assetId] = remoteAsset;
          self.updateSnapshotAsset(snapshot, remoteAsset);

          $('#tr-' + snapshot.snapshot_id).replaceWith(self.templateSnapshotItem({
            snapshot: snapshot
          }));
        });
      }
    }
  }
};

export default Explorer;
