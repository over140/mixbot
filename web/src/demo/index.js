import './index.scss';
import $ from 'jquery';

function Demo(router) {
  this.router = router;
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
  }

};

export default Demo;
