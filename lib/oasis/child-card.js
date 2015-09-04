import RSVP from 'rsvp';
import BaseCard from 'oasis/base-card';

export default class ChildCard extends BaseCard {
  constructor(url) {
    super();

    let iframe = this.iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.scrolling = 'no';

    this.onDefault('didLoad', () => this._didLoad());
    this.onDefault('setPreferredSize', (size) => {
      if (size.height != null) {
        this.iframe.style.height = size.height + 'px';
      }
    });

    this.initialLoad = RSVP.defer();
    iframe.addEventListener('load', this);
  }

  _didLoad() {
    this.initialLoad.resolve();
  }

  // Returns a promise that resolves when a newly created Card is
  // ready to display. The default implementation uses iframe.onload,
  // but the card can choose to set `deferLoad` on its initial
  // `cardHello` message, in which case we will wait for the card to
  // send its own `didLoad` event.
  loaded() {
    return this.initialLoad.promise;
  }

  get element() {
    return this.iframe;
  }

  // Handles iframe.onload
  handleEvent(e) {
    if (e.target === this.iframe && e.type === 'load') {
      this._didLoad();
    } else {
      super.handleEvent(e);
    }
  }

  _handleHello(e) {
    if (e.data.deferLoad) {
      // card is asking us to wait until it says its ready, rather
      // than use the default iframe.onload event.
      this.iframe.removeEventListener('load', this);
    }
    this.origin = e.origin;
    this.messagePort = e.ports[0];
  }
}
