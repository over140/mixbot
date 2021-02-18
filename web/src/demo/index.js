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
      const messageCategory = this.className.split(/\s+/)[0];
      const conversationType = this.className.split(/\s+/)[1];
      const data = $(this).parent().attr('data');
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

    $('.open.playlist.action').on('click', function (event) {
      const mixinContext = self.getMixinContext()
      const audios = [
        "https://dev-courses-storage.firesbox.com/7000101418/replay/8a564db8-e02b-4136-bd77-ec3526531616.mp3",
        "https://dev-courses-storage.firesbox.com/7000101418/replay/874dbe3f-f342-4974-b3b7-8830cc9a4ff0.mp3",
        ];
      self.playlist(audios);
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
  }

};

export default Demo;
