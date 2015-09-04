import RSVP from 'rsvp';
import Port from 'oasis/port';

export default class CardRef {
  constructor(url) {
    let iframe = this.iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.scrolling = 'no';

    this.port = new Port();
    this.port.onDefault('didLoad', () => this._didLoad());
    this.port.onDefault('setPreferredSize', (size) => {
      if (size.height != null) {
        this.iframe.style.height = size.height + 'px';
      }
    });

    this.initialLoad = RSVP.defer();

    iframe.addEventListener('load', this);
    window.addEventListener('message', this);
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

  // This is our public entrypoint for the standard EventListener
  // interface. We use it for toplevel messages via window, subsequent
  // messages via message port, and iframe.onload.
  handleEvent(e) {
    if (e.target === this.iframe && e.type === 'load') {
      this._didLoad();
    } else if (e.source != null) {
      this._initialMessageHandler(e);
    }
  }

  // Handles the initial message from a card, in which we will receive
  // the card's own port for subsequent messaging.
  _initialMessageHandler(e) {
    if (e.source === this.iframe.contentWindow && e.data.cardHello) {
      if (e.data.deferLoad) {
        // card is asking us to wait until it says its ready, rather
        // than use the default iframe.onload event.
        this.iframe.removeEventListener('load', this);
      }
      this.port.messagePort = e.ports[0];
    }
  }

}

for (let method of ['on', 'off', 'triggerEvent', 'request']) {
  CardRef.prototype[method] = function(...args) {
    return this.port[method](...args);
  };
}
