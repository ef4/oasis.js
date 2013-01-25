/*global importScripts*/
importScripts('oasis.js');

Oasis.connect('promisepong').then(function(port) {
  port.request('ping').then(function(data) {
    if (data === 'pong') {
      port.send('testResolvedToSatisfaction');
    }
  });
});
