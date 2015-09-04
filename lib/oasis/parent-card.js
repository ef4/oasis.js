import BaseCard from 'oasis/base-card';

export default class ParentCard extends BaseCard {
  constructor({ deferLoad } = {}) {
    let channel = new MessageChannel();
    let message = {
      cardHello: true,
      deferLoad
    };
    window.top.postMessage(message, '*', [channel.port2]);
    super(channel.port1);
  }
}
