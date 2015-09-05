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
    if (e.data.cardHello) {
      this._handleCardHello(e);
    } else if (e.data.peerCard) {
      this._handlePeerCard(e);
    }
  }

  _handleCardHello(e) {
    for (let [index, card] of this.pendingCards.entries()) {
      if (e.source === card.element.contentWindow) {
        card._handleHello(e);
        this.pendingCards.splice(index, 1);
        break;
      }
    }
  }

  _handlePeerCard({ origin, source, data, ports }) {
    let handlers = this.peerCardHandlers;
    let handler = handlers[origin] || handlers['*'];
    if (!handler) { return; }
    let existingCard = this.peerCards.find(card => card.frame === source);
    if (existingCard && earlierFrame(source)) {
        existingCard.messagePort = ports[0];
    } else {
      let card;
      if (data.peerCard === 'offer') {
        card = new PeerCard({ frame: source, origin: origin });
      } else {
        card = new PeerCard({ frame: source, port: ports[0] });
      }
      this.peerCards.push(card);
      handler(card);
    }
  }

  onPeerCard(origin, handler) {
    this.peerCardHandlers[origin] = handler;
    this._findPeers();
  }

  // This broadcasts a peerCard offer to every other iframe. We use
  // domain '*' here because there's no other way to avoid getting
  // noisy errors. We will check the origins on their responses
  // anyway, so we can still guarantee we're only talking to origins
  // we trust.
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

// This breaks symmetry when two frames are racing to connect with
// each other.
function earlierFrame(source) {
  let topFrames = window.top.frames;
  for (let i = 0; i < topFrames.length; i++) {
    let frame = topFrames[i];
    if (frame === source) {
      return true;
    }
    if (frame === window) {
      return false;
    }
  }
  return false;
}
