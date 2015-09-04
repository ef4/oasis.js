import ChildCard from 'oasis/child-card';

export default class Oasis {
  constructor() {
    window.addEventListener('message', this);
    this.pendingCards = [];
    this.peerCardHandler = null;
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
    if (e.data && e.data.cardHello) {
      for (let [index, card] of this.pendingCards.entries()) {
        if (e.source === card.element.contentWindow) {
          card._handleHello(e);
          this.pendingCards.splice(index, 1);
          return;
        }
      }
      if (this.peerCardHandler) {
        this.peerCardHandler
      }
    }
  }

  onPeerCard(handler) {
    this.peerCardHandler = handler;
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
