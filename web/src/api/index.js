import $ from 'jquery';
import Noty from 'noty';
import Account from './account.js';

function API(router) {
  this.router = router;
  this.Error404 = require('../404.html');
  this.ErrorGeneral = require('../error.html');
  this.account = new Account(this);
}

API.prototype = {

  request: function (method, path, params, callback) {
    const self = this;
    $.ajax({
      type: method,
      url: 'https://mixin-api.zeromesh.net' + path,
      contentType: "application/json",
      data: JSON.stringify(params),
      success: function(resp) {
        var consumed = false;
        if (typeof callback === 'function') {
          consumed = callback(resp);
        }
        if (!consumed && resp.error !== null && resp.error !== undefined) {
          self.error(resp);
        }
      },
      error: function(event) {
        self.error(event.responseJSON, callback);
      }
    });
  },

  requestMixin: function(method, path, params, callback) {
    const self = this;
    $.ajax({
      type: method,
      url: 'https://mixin-api.zeromesh.net' + path,
      contentType: "application/json",
      data: JSON.stringify(params),
      beforeSend: function(xhr) {
        xhr.setRequestHeader("Authorization", "Bearer " + self.account.token());
      },
      success: function(resp) {
        var consumed = false;
        if (typeof callback === 'function') {
          consumed = callback(resp);
        }
        if (!consumed && resp.error !== null && resp.error !== undefined) {
          self.error(resp);
        }
      },
      error: function(event) {
        self.error(event.responseJSON, callback);
      }
    });
  },

  requestURL: function (method, url, params, callback) {
    const self = this;
    $.ajax({
      type: method,
      url: url,
      contentType: "application/json",
      data: JSON.stringify(params),
      success: function(resp) {
        var consumed = false;
        if (typeof callback === 'function') {
          consumed = callback(resp);
        }
        if (!consumed && resp.error !== null && resp.error !== undefined) {
          self.error(resp);
        }
      },
      error: function(event) {
        self.error(event.responseJSON, callback);
      }
    });
  }, 

  error: function(resp, callback) {
    if (resp == null || resp == undefined || resp.error === null || resp.error === undefined) {
      resp = {error: { code: 0, description: 'unknown error' }};
    }

    var consumed = false;
    if (typeof callback === 'function') {
      consumed = callback(resp);
    }
    if (!consumed) {
      const clientId = this.account.clientId();
      const clientScope = this.account.clientScope();
      if (clientId && clientScope && resp.error.code == 401) {
        this.account.clear();
        var obj = new URL(window.location);
        var returnTo = encodeURIComponent(obj.href.substr(obj.origin.length));
        window.location.replace('https://mixin-www.zeromesh.net/oauth/authorize?client_id=' + clientId + '&scope=' + clientScope + '&response_type=code&return_to=' + returnTo);
        return
      }
      switch (resp.error.code) {
        case 404:
          $('#layout-container').html(this.Error404());
          $('body').attr('class', 'error layout');
          this.router.updatePageLinks();
          break;
        default:
          if ($('#layout-container > .spinner-container').length === 1) {
            $('#layout-container').html(this.ErrorGeneral());
            $('body').attr('class', 'error layout');
            this.router.updatePageLinks();
          }
          this.notify('error', i18n.t('general.errors.' + resp.error.code));
          break;
      }
    }
  },

  notifyError: function(type, error) {
    var errorInfo = '';
    if (error.description) {
      errorInfo += error.description;
    }
    if (error.code) {
      errorInfo += ' ' + error.code;
    }
    if (errorInfo !== '') {
      this.notify('error', errorInfo);
    }
  },

  notify: function(type, text) {
    new Noty({
      type: type,
      layout: 'top',
      theme: 'nest',
      text: text,
      timeout: 3000,
      progressBar: false,
      queue: 'api',
      killer: 'api',
      force: true,
      animation: {
        open: 'animated bounceInDown',
        close: 'animated slideOutUp noty'
      }
    }).show();
  }
};

export default API;
