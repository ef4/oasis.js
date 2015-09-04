import Card from 'oasis/card';

export default class Oasis {
  createCard(url) {
    return new Card(url);
  }
  rehydrateCard(element) {
    let card = new Card(element.attributes['data-card-url'].value);
    card.element.style.display = 'none';
    element.parentNode.appendChild(card.element);
    card.onRequest('dehydratedHTML', () => {
      card.offRequest('dehydratedHTML');
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
