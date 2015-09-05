import ChildCard from 'oasis/child-card';
import PeerCard from 'oasis/peer-card';

export default class Oasis {
  constructor() {
    window.addEventListener('message', this);
    this.pendingCards = [];
    this.peerCardHandlers = {};
    this.peerCards = [];
  }

  createCard(url) {
    let card = new ChildCard(url);
    this.pendingCards.push(card);
    return card;
  }

  rehydrateCard(element) {
    let card = new ChildCard(element.attributes['data-card-url'].value);
    this.pendingCards.push(card);
    card.element.style.display = 'none';
    element.parentNode.appendChild(card.element);
    card.on('dehydratedHTML', () => {
      card.off('dehydratedHTML');
      return dehydratedHTML(element);
    });
    card.loaded().then(() => {
      element.remove();
      card.element.style.display = 'block';
    });
    return card;
  }

  // Handles window.onmessage events from cards saying hello.
  handleEvent(e) {
    if (!e.data) {
      return;
    } else if (e.data.cardHello) {
      for (let [index, card] of this.pendingCards.entries()) {
        if (e.source === card.element.contentWindow) {
          card._handleHello(e);
          this.pendingCards.splice(index, 1);
          break;
        }
      }
    } else if (e.data.peerCard) {
      let handlers = this.peerCardHandlers;
      let handler = handlers[e.origin] || handlers['*'];
      if (handler && !this.peerCards.find(card => card.frame === e.source)) {
        let card;
        if (e.data.peerCard === 'offer') {
          card = new PeerCard({ frame: e.source, origin: e.origin });
        } else {
          card = new PeerCard({ frame: e.source, port: e.ports[0] });
        }
        this.peerCards.push(card);
        handler(card);
      }
    }
  }

  onPeerCard(origin, handler) {
    this.peerCardHandlers[origin] = handler;
    this._findPeers();
  }

  // This broadcasts a peerCard offer to every other iframe. We use
  // domain '*' here because there's now way to avoid getting noisy
  // errors. We will check the origins on their responses anyway, so
  // we can still guarantee we're only talking to origins we trust.
  _findPeers() {
    if (window.top === window) { return; }
    let topFrames = window.top.frames;
    for (let i = 0; i < topFrames.length; i++) {
      let frame = topFrames[i];
      if (frame !== window) {
        frame.postMessage({ peerCard: 'offer' }, '*');
      }
    }
  }
}

function dehydratedHTML(element) {
  if (element.tagName === 'IFRAME') {
    if ('srcDoc' in element) {
      return element.srcDoc;
    } else {
      let attr = element.attributes.srcDoc;
      if (attr) {
        return attr.value;
      }
    }
  }
}
