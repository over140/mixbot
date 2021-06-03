import './index.scss';
import './assets.scss';
import './contacts.scss';
import './snapshots.scss';
import $ from 'jquery';
import {BigNumber} from 'bignumber.js';
import ClipboardJS from 'clipboard';
import TimeUtils from '../utils/time.js';

function Dev(router, api, loading) {
  this.router = router;
  this.api = api;
  this.loading = loading; 
  this.templateDev = require('./index.html');
  this.templateAssets = require('./assets.html');
  this.templateContacts = require('./contacts.html');
  this.templateSnapshots = require('./snapshots.html');
  this.chains = require('../api/chains.json');
  var chainMap = {};
  this.chains.forEach(function(chain) {
    chainMap[chain.chain_id] = chain;
  });
  this.chainMap = chainMap;
}

Dev.prototype = {

  render: function () {
    const self = this;
    $('body').attr('class', 'dev layout');
    $('#layout-container').html(this.templateDev());

    document.title = "Mixin Dev Tools";
    self.fetchAssets();
    if (self.api.account.loggedIn()) {
      self.fetchContacts();
      self.fetchSnapshots();
    }

    $('.tabs').on('click', '.tab', function (event) {
      const activeClassName = this.className.split(/\s+/)[0];
      const tabs = ['assets', 'contacts', 'snapshots'];
      for (var i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        if (tab === activeClassName) {
          $('.' + tab + '.tab').addClass('active');
          $('.' + tab + '.dev.list').addClass('active');
        } else {
          $('.' + tab + '.tab').removeClass('active');
          $('.' + tab + '.dev.list').removeClass('active');
        }
      }
      $(window).scrollTop(0);
    });

    var clipboard = new ClipboardJS('.copy.action');
    clipboard.on('success',
      function (e) {
        self.api.notify('success', i18n.t('dev.toast.copied'));
    });
  },

  fetchSnapshots: function() {
    const self = this;
    $('#snapshots-content').html(self.loading());

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
      self.api.requestMixin('GET', '/snapshots?limit=500&offset=' + TimeUtils.rfc3339(new Date()), undefined, function(resp) {
        if (resp.error) {
          if (resp.error.code == 403) {
            self.api.account.clear();
            window.location.reload();
          }
          return;
        }
  
        var snapshots = resp.data;
        for (var i = 0; i < snapshots.length; i++) {
          var snapshot = snapshots[i];
          const asset = self.assetMap[snapshot.asset_id];
          snapshot.amount_style = new BigNumber(snapshot.amount).isNegative() ? 'red' : 'green';
          if (asset) {
            snapshot.symbol = asset.symbol;
            snapshot.asset_icon_url = asset.icon_url;
            var chainAsset = self.chainMap[asset.chain_id];
            if (chainAsset) {
              snapshot.chain_icon_url = chainAsset.icon_url;
            }
          } else {
            snapshot.symbol = '';
            snapshot.asset_icon_url = 'https://images.mixin.one/yH_I5b0GiV2zDmvrXRyr3bK5xusjfy5q7FX3lw3mM2Ryx4Dfuj6Xcw8SHNRnDKm7ZVE3_LvpKlLdcLrlFQUBhds=s128';
            snapshot.chain_icon_url = 'https://mixin-images.zeromesh.net/zVDjOxNTQvVsA8h2B4ZVxuHoCF3DJszufYKWpd9duXUSbSapoZadC7_13cnWBqg0EmwmRcKGbJaUpA8wFfpgZA=s128';
          }

          var copy_info = {
            snapshot_id: snapshot.snapshot_id,
            asset_id: snapshot.asset_id,
            amount: snapshot.amount,
            symbol: snapshot.symbol,
            opponent_id: snapshot.opponent_id,
            counter_user_id: snapshot.counter_user_id,
            opening_balance: snapshot.opening_balance,
            closing_balance: snapshot.closing_balance,
            memo: snapshot.memo,
            trace_id: snapshot.trace_id,
            created_at: snapshot.created_at
          };
          snapshot.copy_info = JSON.stringify(copy_info);
        }

        $('#snapshots-content').html(self.templateSnapshots({
          snapshots: snapshots
        }));

        $('#snapshots-content').on("input", ".searchTerm", function(event) {
          const keywords = $(this).val().trim().toLowerCase();
          const rows = $('.snapshots.list tr');
          if (keywords.length == 0) {
            rows.show();
          } else {
            const showRows = rows.filter(function(index, row){
              return $(this).attr('keywords').toLowerCase().indexOf(keywords) >= 0
            })
            showRows.show();
            rows.not(showRows).hide();
          }
        });
      });
    });
  },

  fetchAssets: function() {
    const self = this;
    $('#assets-content').html(self.loading());

    self.api.requestMixin('GET', '/assets', undefined, function(resp) {
      if (resp.error) {
        if (resp.error.code == 403) {
          self.api.account.clear();
          window.location.reload();
        }
        return;
      }

      var assets = resp.data

      for (var i = 0; i < assets.length; i++) {
        var asset = assets[i];
        asset.asset_icon_url = asset.icon_url;
        asset.capitalization = new BigNumber(asset.price_usd).multipliedBy(new BigNumber(asset.balance));
        var chainAsset = self.chainMap[asset.chain_id];
        if (chainAsset) {
          asset.chain_icon_url = chainAsset.icon_url;
        }

        var copy_info = {
          name: asset.name,
          symbol: asset.symbol,
          asset_id: asset.asset_id,
          chain_id: asset.chain_id,
          chain_icon_url: asset.chain_icon_url,
          icon_url: asset.icon_url
        };
        asset.copy_info = JSON.stringify(copy_info);
      }

      const defaultIconUrl = 'https://images.mixin.one/yH_I5b0GiV2zDmvrXRyr3bK5xusjfy5q7FX3lw3mM2Ryx4Dfuj6Xcw8SHNRnDKm7ZVE3_LvpKlLdcLrlFQUBhds=s128';
      assets.sort(function (a, b) {
        if (a.icon_url === defaultIconUrl && b.icon_url !== defaultIconUrl) {
          return 1;
        } else if (b.icon_url === defaultIconUrl && a.icon_url !== defaultIconUrl) {
          return -1;
        }
        return b.capitalization.comparedTo(a.capitalization);
      });

      self.assets = assets

      $('#assets-content').html(self.templateAssets({
        assets: assets
      }));

      $('#assets-content').on("input", ".searchTerm", function(event) {
        const keywords = $(this).val().trim().toLowerCase();
        const rows = $('.assets.list tr');
        if (keywords.length == 0) {
          rows.show();
        } else {
          const showRows = rows.filter(function(index, row){
            return $(this).attr('keywords').toLowerCase().indexOf(keywords) >= 0
          })
          showRows.show();
          rows.not(showRows).hide();
        }
      });
    });
  },

  fetchContacts: function() {
    const self = this;
    $('#contacts-content').html(self.loading());

    self.api.requestMixin('GET', '/friends', undefined, function(resp) {
      if (resp.error) {
        if (resp.error.code == 403) {
          self.api.account.clear();
          window.location.reload();
        }
        return;
      }

      var contacts = resp.data;

      contacts.forEach(function(contact){
        var copy_info = {
          full_name: contact.full_name,
          user_id: contact.user_id,
          identity_number: contact.identity_number,
          avatar_url: contact.avatar_url
        };
        contact.copy_info = JSON.stringify(copy_info);
      });

      $('#contacts-content').html(self.templateContacts({
        contacts: contacts
      }));

      $('#contacts-content').on("input", ".searchTerm", function(event) {
        const keywords = $(this).val().trim().toLowerCase();
        const rows = $('.contacts.list tr');
        if (keywords.length == 0) {
          rows.show();
        } else {
          const showRows = rows.filter(function(index, row){
            return $(this).attr('keywords').toLowerCase().indexOf(keywords) >= 0
          })
          showRows.show();
          rows.not(showRows).hide();
        }
      });
    });
  }
};

export default Dev;
