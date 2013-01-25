(function() {

QUnit.config.testTimeout = 200;

var sandbox;

module("Oasis");

test("Assert not file://", function() {
  ok(window.location.protocol !== 'file:', "Please run the tests using a web server of some sort, not file://");
});

test("Assert browser satisfies minimum requirements", function() {
  var iframe = document.createElement('iframe');

  iframe.sandbox = 'allow-scripts';
  ok(iframe.getAttribute('sandbox') === 'allow-scripts', "The current version of Oasis requires Sandboxed iframes, which are not supported on your current platform. See http://caniuse.com/#feat=iframe-sandbox");

  ok(typeof MessageChannel !== 'undefined', "The current version of Oasis requires MessageChannel, which is not supported on your current platform. A near-future version of Oasis will polyfill MessageChannel using the postMessage API");
});

module("Oasis.createSandbox", {
  teardown: function() {
    if (sandbox) { sandbox.terminate(); }
    Oasis.reset();
  }
});

test("assertion: must register package", function() {
  raises(function() {
    sandbox = Oasis.createSandbox({
      url: "fixtures/index.js"
    });
  }, Error, "Creating a card from an unregistered package fails");
});

test("assertion: must provide capabilities when registering a package", function() {
  raises(function() {
    Oasis.register({
      url: 'fixtures/index.js'
    });
  }, Error, "Registering a package without capabilities fails");
});

test("returns a sandbox with an iframe element", function() {
  Oasis.register({
    url: "fixtures/index.js",
    capabilities: []
  });

  sandbox = Oasis.createSandbox({
    url: "fixtures/index.js"
  });

  ok(sandbox.el instanceof window.HTMLIFrameElement, "A new iframe was returned");
});

test("service is notified about ports created for a card", function() {
  Oasis.register({
    url: "fixtures/index.js",
    capabilities: ['testData']
  });

  stop();

  var DataService = Oasis.Service.extend({
    initialize: function(port, capability) {
      start();
      equal(this.sandbox, sandbox);
      equal(capability, 'testData');
    }
  });

  sandbox = Oasis.createSandbox({
    url: "fixtures/index.js",
    services: {
      testData: DataService
    }
  });

  document.body.appendChild(sandbox.el);
});

test("service - card can communicate with the environment through a port", function() {
  Oasis.register({
    url: "fixtures/assertions.js",
    capabilities: ['assertions']
  });

  stop();

  var AssertionsService = Oasis.Service.extend({
    initialize: function(port, capability) {
      equal(capability, 'assertions', "precond - capability is the assertions service");

      port.on('ok', function(data) {
        start();
        equal(data, 'success', "The card was able to communicate back");
      });
    }
  });

  sandbox = Oasis.createSandbox({
    url: "fixtures/assertions.js",
    services: {
      assertions: AssertionsService
    }
  });

  sandbox.start();
});

test("service - card can communicate with the environment through a port with the environment shorthand for events", function() {
  Oasis.register({
    url: "fixtures/assertions.js",
    capabilities: ['assertions']
  });

  stop();

  var AssertionsService = Oasis.Service.extend({
    events: {
      ok: function(data) {
        start();
        equal(data, 'success', "The card was able to communicate back");
      }
    }
  });

  sandbox = Oasis.createSandbox({
    url: "fixtures/assertions.js",
    services: {
      assertions: AssertionsService
    }
  });

  sandbox.start();
});

test("service - card can communicate with the environment through a port with the card shorthand for events", function() {
  Oasis.register({
    url: "fixtures/assertions_shorthand.js",
    capabilities: ['assertions']
  });

  stop();

  var AssertionsService = Oasis.Service.extend({
    events: {
      ok: function(data) {
        equal(data, 'success', "The card was able to communicate back");

        this.send('ping');
      },

      pong: function() {
        this.request('ping').then(function(response) {
          start();
          equal(response, "pong");
        });
      }
    }
  });

  sandbox = Oasis.createSandbox({
    url: "fixtures/assertions_shorthand.js",
    services: {
      assertions: AssertionsService
    }
  });

  sandbox.start();
});

test("shorthand - card can communicate with the environment through a port", function() {
  stop();

  sandbox = Oasis.createSandbox({
    url: "fixtures/assertions.js",
    capabilities: ['assertions']
  });

  sandbox.connect('assertions').then(function(port) {
    port.on('ok', function(data) {
      start();
      equal(data, 'success', "The card was able to communicate back");
    });
  });

  document.body.appendChild(sandbox.el);
});

test("environment can communicate with the card through a port", function() {
  Oasis.register({
    url: "fixtures/to_environment.js",
    capabilities: ['pingpong']
  });

  stop();

  var PingPongService = Oasis.Service.extend({
    initialize: function(port, capability) {
      equal(capability, 'pingpong', "precond - capability is the pingpong service");

      port.on('pong', function(data) {
        start();
        equal(data, "PONG", "Got pong from the child");
      });

      port.send('ping', "PONG");
    }
  });

  sandbox = Oasis.createSandbox({
    url: 'fixtures/to_environment.js',
    services: {
      pingpong: PingPongService
    }
  });

  document.body.appendChild(sandbox.el);
});

test("environment can communicate with the card through a port with a shorthand", function() {
  Oasis.register({
    url: "fixtures/to_environment.js",
    capabilities: ['pingpong']
  });

  stop();

  var PingPongService = Oasis.Service.extend({
    events: {
      pong: function(data) {
        start();
        equal(data, "PONG", "Got pong from the child");
      }
    },

    initialize: function(port) {
      port.send('ping', "PONG");
    }
  });

  sandbox = Oasis.createSandbox({
    url: 'fixtures/to_environment.js',
    services: {
      pingpong: PingPongService
    }
  });

  document.body.appendChild(sandbox.el);
});

test("environment can request a value from a sandbox", function() {
  Oasis.register({
    url: "fixtures/promise.js",
    capabilities: ['promisepong']
  });

  stop();

  var PingPongPromiseService = Oasis.Service.extend({
    initialize: function(port, capability) {
      port.request('ping').then(function(data) {
        start();

        equal(data, 'pong', "promise was resolved with expected value");
      });
    }
  });

  sandbox = Oasis.createSandbox({
    url: 'fixtures/promise.js',
    services: {
      promisepong: PingPongPromiseService
    }
  });

  document.body.appendChild(sandbox.el);
});

test("sandbox can request a value from the environment", function() {
  Oasis.register({
    url: "fixtures/promise_request_from_environment.js",
    capabilities: ['promisepong']
  });

  stop();

  var PingPongPromiseService = Oasis.Service.extend({
    requests: {
      ping: function(promise) {
        promise.resolve('pong');
      }
    },

    events: {
      testResolvedToSatisfaction: function() {
        start();
        ok(true, "test was resolved to sandbox's satisfaction");
      }
    }
  });

  sandbox = Oasis.createSandbox({
    url: 'fixtures/promise_request_from_environment.js',
    services: {
      promisepong: PingPongPromiseService
    }
  });

  document.body.appendChild(sandbox.el);
});

test("ports sent to a sandbox can be passed to its child sandboxes", function() {
  Oasis.register({
    url: "fixtures/inception_parent.js",
    capabilities: ['inception']
  });

  stop();

  var InceptionService = Oasis.Service.extend({
    initialize: function(port) {
      port.onRequest('kick', function(promise) {
        promise.resolve('kick');
      });

      port.on('workPlacement', function() {
        start();
        ok(true, "messages between deeply nested sandboxes are sent");
      });
    }
  });

  sandbox = Oasis.createSandbox({
    url: 'fixtures/inception_parent.js',
    services: {
      inception: InceptionService
    }
  });

  document.body.appendChild(sandbox.el);
});

test("ports sent to a sandbox can be passed to its child sandboxes while supporting a shorthand", function() {
  Oasis.register({
    url: "fixtures/inception_parent.js",
    capabilities: ['inception']
  });

  stop();

  var InceptionService = Oasis.Service.extend({
    requests: {
      kick: function(promise) {
        promise.resolve('kick');
        ok(this instanceof InceptionService, "The callback gets the service instance as `this`");
      }
    },

    events: {
      workPlacement: function() {
        start();
        ok(true, "messages between deeply nested sandboxes are sent");
        ok(this instanceof InceptionService, "The callback gets the service instance as `this`");
      }
    }
  });

  sandbox = Oasis.createSandbox({
    url: 'fixtures/inception_parent.js',
    services: {
      inception: InceptionService
    }
  });

  document.body.appendChild(sandbox.el);
});

test("When the shorthand form is used for events, they can send events", function() {
  Oasis.register({
    url: "fixtures/peter_pong.js",
    capabilities: ['peterpong']
  });

  stop();

  var PeterPongService = Oasis.Service.extend({
    events: {
      peter: function() {
        this.send('ping');
      },

      pong: function() {
        start();

        ok(true, "Succesfully sent events from event shorthand function");
      }
    }
  });

  sandbox = Oasis.createSandbox({
    url: 'fixtures/peter_pong.js',
    services: {
      peterpong: PeterPongService
    }
  });

  document.body.appendChild(sandbox.el);
});

test("When the shorthand form is used for events, they can send requests", function() {
  Oasis.register({
    url: "fixtures/peter_pong_request.js",
    capabilities: ['peterpong']
  });

  stop();

  var PeterPongService = Oasis.Service.extend({
    events: {
      peter: function() {
        this.request('ping').then(function(data) {
          start();
          ok(true, "Successfully sent request from event shorthand function");
        });
      }
    }
  });

  sandbox = Oasis.createSandbox({
    url: 'fixtures/peter_pong_request.js',
    services: {
      peterpong: PeterPongService
    }
  });

  document.body.appendChild(sandbox.el);
});

test("Consumers instances are saved on the Oasis global", function() {
  stop();

  Oasis.register({
    url: "fixtures/consumer.js",
    capabilities: ['assertions']
  });

  var AssertionsService = Oasis.Service.extend({
    events: {
      ok: function() {
        start();
        ok(true, "Consumer was accessed");
      }
    }
  });

  sandbox = Oasis.createSandbox({
    url: 'fixtures/consumer.js',
    services: {
      assertions: AssertionsService
    }
  });

  document.body.appendChild(sandbox.el);
});

})();
