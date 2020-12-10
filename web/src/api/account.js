function Account(api) {
  this.api = api;
}

Account.prototype = {
  info: function (callback) {
    this.api.requestMixin('GET', 'https://mixin-api.zeromesh.net/me', undefined, function(resp) {
      return callback(resp);
    });
  },

  authenticate: function (callback, authorizationCode) {
    const self = this;
    var params = {
      "code": authorizationCode,
      "client_secret": self.clientSecret(),
      "client_id": self.clientId()
    };
    this.api.requestMixin('POST', '/oauth/token', params, function(resp) {
      if (resp.data) {
        const prefix = self.clientPrefix();
        window.localStorage.setItem(prefix + 'user_id', resp.data.user_id);
        window.localStorage.setItem(prefix + 'token', resp.data.access_token);
        window.localStorage.setItem(prefix + 'scope', resp.data.scope);
      }
      return callback(resp);
    });
  },

  clientId: function () {
    if (this.isExplorerApp()) {
      if (process.env.NODE_ENV === 'production') {
        return "bb8f402b-0546-43f5-bcf9-f9439a4322c6"
      } else {
        return "6b9816ce-8f38-48b5-9399-578c3fd0bdb0"
      }
    } else if (this.isDevApp()) {
      return "ce1cd3f3-9edb-4d9d-a91a-bc8cd12316dc"
    }
    return window.localStorage.getItem('client_id');
  },

  clientSecret: function () {
    if (this.isExplorerApp()) {
      if (process.env.NODE_ENV === 'production') {
        return "46976dac994f8f0a09d4c7b7d3a8ac3e5e81f469edd4c5219b27fc0e91537835"
      } else {
        return "faf2b6a84c97fb35da5276443518400aa136cdb1276e2a4bf295f911eb48060e"
      }
    } else if (this.isDevApp()) {
      return "499d74c5baa0af7556ecfc87502c52f33d53b130acd8afe7ca9d26c53ae89e3b"
    }
  },

  clientScope: function () {
    if (this.isExplorerApp()) {
      return "PROFILE:READ+SNAPSHOTS:READ"
    } else if (this.isDevApp()) {
      return "PROFILE:READ+ASSETS:READ+CONTACTS:READ+SNAPSHOTS:READ"
    }
    return ""
  },

  clientPrefix: function () {
    if (this.isExplorerApp()) {
      return "explore_"
    } else if (this.isDevApp()) {
      return "dev_"
    }
    return ""
  },

  isExplorerApp: function () {
    return window.location.pathname.startsWith("/explore");
  },

  isDevApp: function () {
    return window.location.pathname.startsWith("/dev");
  },

  userId: function () {
    return window.localStorage.getItem(this.clientPrefix() + 'user_id');
  },

  token: function () {
    return window.localStorage.getItem(this.clientPrefix() + 'token');
  },

  loggedIn: function() {
    return this.token() !== "";
  },

  clear: function () {
    window.localStorage.removeItem(this.clientPrefix() + 'user_id');
    window.localStorage.removeItem(this.clientPrefix() + 'token');
    window.localStorage.removeItem(this.clientPrefix() + 'scope');
  }
};

export default Account;
