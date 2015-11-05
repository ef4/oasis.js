import BaseCard from 'oasis/base-card';
import { measureGeometry } from 'oasis/child-card';
import jQuery from 'jquery';

export default class ParentCard extends BaseCard {
  constructor({ deferLoad } = {}) {
    let channel = new MessageChannel();
    if (window.top === window) {
      // When we are the topmost iframe, there is nobody above us to
      // really talk to. But it is helpful to make the APIs work
      // anyway, so that we can work standalone instead of just hanging.
      let fakeParent = new BaseCard(channel.port2);
      fakeParent.on('preferredGeometry', () => null);
      fakeParent.on('measureGeometry', (dim) => measureGeometry(jQuery('body'), dim));
    } else {
      let message = {
        cardHello: true,
        deferLoad
      };
      window.parent.postMessage(message, '*', [channel.port2]);
    }
    super(channel.port1);
  }
}
