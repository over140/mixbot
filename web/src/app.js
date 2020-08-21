import './layout.scss';
import $ from 'jquery';
import Navigo from 'navigo';
import Locale from './locale';
import Store from './store';
import Tool from './tool';
import API from './api';
import Auth from './auth';
import Explorer from './explorer';

const PartialLoading = require('./loading.html');
const Error404 = require('./404.html');
const router = new Navigo(WEB_ROOT);
const api = new API(router);
const OfflinePlugin = require('offline-plugin/runtime');

window.i18n = new Locale(navigator.language);

router.replace = function(url) {
  this.resolve(url);
  this.pause(true);
  this.navigate(url);
  this.pause(false);
};

router.hooks({
  before: function(done, params) {
    $('body').attr('class', 'loading layout');
    $('#layout-container').html(PartialLoading());
    done(true);
  },
  after: function(params) {
    router.updatePageLinks();
  }
});

OfflinePlugin.install({
  onInstalled: function() { },

  onUpdating: function() { },

  onUpdateReady: function() {
    OfflinePlugin.applyUpdate();
  },
  
  onUpdated: function() { }
});

router.on({
  '/': function () {
    new Store(router).render();
  },
  '/bots': function () {
    new Store(router).render();
  },
  '/explorer': function () {
    new Explorer(router, api).render();
  },
  '/explorer/auth': function () {
    new Auth(router, api).render();
  },
  '/tools': function () {
    new Tool(router, api, PartialLoading).render();
  }
}).notFound(function () {
  $('#layout-container').html(Error404());
  $('body').attr('class', 'error layout');
  router.updatePageLinks();
}).resolve();