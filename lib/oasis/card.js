import Port from 'oasis/port';

export default class Card {
  constructor({ deferLoad } = {}) {
    let channel = new MessageChannel();
    let message = {
      cardHello: true,
      deferLoad
    };
    window.top.postMessage(message, '*', [channel.port2]);
    this.port = new Port(channel.port1);
  }

  destroy() {
    this.port.messagePort = null;
  }
}

for (let method of ['on', 'off', 'triggerEvent', 'request']) {
  Card.prototype[method] = function(...args) {
    return this.port[method](...args);
  };
}
