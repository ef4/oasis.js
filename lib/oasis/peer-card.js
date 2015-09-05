import BaseCard from 'oasis/base-card';

export default class PeerCard extends BaseCard {
  constructor({frame, origin, port}) {
    if (port) {
      super(port);
    } else {
      let channel = new MessageChannel();
      let message = {  peerCard: 'accepted' };
      frame.postMessage(message, origin, [channel.port2]);
      super(channel.port1);
    }
    this.frame = frame;
  }
}
