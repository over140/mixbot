import './index.scss';
import URLUtils from '../utils/url.js';
import $ from 'jquery';

function Demo(router, api) {
  this.router = router;
  this.api = api
  this.templateAssets = require('./index.html');
}

Demo.prototype = {

  render: function () {
    const self = this;
    $('body').attr('class', 'demo layout');
    $('#layout-container').html(this.templateAssets());

    $('.tabs').on('click', '.tab', function (event) {
      const activeClassName = this.className.split(/\s+/)[0];
      const tabs = ['share', 'schema'];
      for (var i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        if (tab === activeClassName) {
          $('.' + tab + '.tab').addClass('active');
          $('.' + tab + '.demo.list').addClass('active');
        } else {
          $('.' + tab + '.tab').removeClass('active');
          $('.' + tab + '.demo.list').removeClass('active');
        }
      }
      $(window).scrollTop(0);
    });

    $('#share-content').on('click', '.action', function (event) {
      var messageCategory = this.className.split(/\s+/)[0];
      const conversationType = this.className.split(/\s+/)[1];
      const data = $(this).parent().attr('data');
      if (messageCategory === "app_card_shareable") {
        messageCategory = "app_card";
      } else if (messageCategory === "live_shareable") {
        messageCategory = "live";
      }
      var url = "mixin://send?category=" + messageCategory;
      if (conversationType === "specified") {
        const conversationId = self.getMixinContext().conversation_id;
        if (conversationId) {
          url += "&conversation=" + conversationId;
        }
      }
      url += "&data=" + data
      window.open(url)
    });

    window.tipAddressCallbackFunction = function(address) {
      self.api.notify('success', address);
    };

    window.tipSignCallbackFunction = function(signature) {
      self.api.notify('success', signature);
    };

    $('.open.playlist.action').on('click', function (event) {
      const mixinContext = self.getMixinContext()
      const audios = [
        "https://dev-courses-storage.firesbox.com/7000101418/replay/8a564db8-e02b-4136-bd77-ec3526531616.mp3",
        "https://dev-courses-storage.firesbox.com/7000101418/replay/874dbe3f-f342-4974-b3b7-8830cc9a4ff0.mp3",
        "https://taskwall.zeromesh.net/test1.mp3",
        "https://taskwall.zeromesh.net/test2.mp3",
        "https://taskwall.zeromesh.net/test3.mp3",
        "https://taskwall.zeromesh.net/test4.mp3",
        "https://a.b.c/d.mp3",
        ];
      self.playlist(audios);
    });

    $('.get.address.action').on('click', function (event) {
      const mixinContext = self.getMixinContext()
      self.getTipAddress('43d61dcd-e413-450d-80b8-101d5e903357');
    });

    $('.tip.sign.action').on('click', function (event) {
      const mixinContext = self.getMixinContext()
      self.tipSign('43d61dcd-e413-450d-80b8-101d5e903357', 'hello world!');
    });

    $('.close.window.action').on('click', function (event) {
      const mixinContext = self.getMixinContext()
      self.close();
    });

    $('.authorization.action').on('click', function (event) {
      window.location.replace('https://mixin.one/oauth/authorize?client_id=14ba6299-5daf-4d07-9e2c-f84d413d2482&scope=PROFILE:READ+ASSETS:READ+PHONE:READ+CONTACTS:READ+MESSAGES:REPRESENT+SNAPSHOTS:READ+CIRCLES:READ+CIRCLES:WRITE+COLLECTIBLES:READ+STICKER:READ&response_type=code&return_to=');
    });

    const code = URLUtils.getUrlParameter("code");
    if (code === "XVlBzg") {
      self.api.notify('success', code);
    }
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
  },

  playlist: function (audios) {
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.MixinContext && window.webkit.messageHandlers.playlist) {
      window.webkit.messageHandlers.playlist.postMessage(audios);
    } else if (window.MixinContext && (typeof window.MixinContext.playlist === 'function')) {
      window.MixinContext.playlist(audios)
    } else {
      this.api.notify('success', "你的客户端还不支持 playlist");
    }
  },

  getTipAddress: function (chainId) {
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.MixinContext && window.webkit.messageHandlers.getTipAddress) {
      window.webkit.messageHandlers.getTipAddress.postMessage([chainId, 'tipAddressCallbackFunction']);
    } else if (window.MixinContext && (typeof window.MixinContext.getTipAddress === 'function')) {
      window.MixinContext.getTipAddress(chainId, 'tipAddressCallbackFunction')
    } else {
      this.api.notify('success', "你的客户端还不支持 getTipAddress");
    }
  },

  tipSign: function (chainId, msg) {
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.MixinContext && window.webkit.messageHandlers.tipSign) {
      window.webkit.messageHandlers.tipSign.postMessage([chainId, msg, 'tipSignCallbackFunction']);
    } else if (window.MixinContext && (typeof window.MixinContext.tipSign === 'function')) {
      window.MixinContext.tipSign(chainId, msg, 'tipSignCallbackFunction')
    } else {
      this.api.notify('success', "你的客户端还不支持 tipSign");
    }
  },

  close: function () {
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.MixinContext && window.webkit.messageHandlers.close) {
      window.webkit.messageHandlers.close.postMessage('');
    } else if (window.MixinContext && (typeof window.MixinContext.close === 'function')) {
      window.MixinContext.close()
    } else {
      this.api.notify('success', "你的客户端还不支持 close");
    }
  }

};

export default Demo;
