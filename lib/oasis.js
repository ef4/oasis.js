import CardRef from 'oasis/card-ref';

export default class Oasis {
  createCard(url) {
    return new CardRef(url);
  }
  rehydrateCard(element) {
    let card = new CardRef(element.attributes['data-card-url'].value);
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
