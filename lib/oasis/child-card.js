import RSVP from 'rsvp';
import BaseCard from 'oasis/base-card';
import jQuery from 'jquery';

export default class ChildCard extends BaseCard {
  constructor(url, opts) {
    super();

    let iframe = this.iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.scrolling = 'no';

    this.onDefault('didLoad', () => this._didLoad());
    this.onDefault('preferredGeometry', request => this.applyPreferredGeometry(request));

    this.initialLoad = RSVP.defer();

    if (!opts.hasOasis) {
      iframe.addEventListener('load', this);
    }
  }

  _didLoad() {
    this.initialLoad.resolve();
  }

  // The default implementation that applies the card's preferred
  // geometry settings. You can customize by setting your own
  // `on('preferredGeometry')` handler, which may choose to use our
  // exported applyPreferredGeometry function (or not).
  applyPreferredGeometry(request) {
    return applyPreferredGeometry(jQuery(this.element), request);
  }

  // Returns a promise that resolves when a newly created Card is
  // ready to display. The default implementation uses iframe.onload,
  // but if you pass { hasOasis: true} when creating the card, we will
  // wait for the card to send its own `didLoad` event.
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
    this.messagePort = e.ports[0];
  }
}

export function applyPreferredGeometry($elt, request) {
  let { style, dataAttrs } = request;
  if (style) {
    $elt.css(style);
    if (style.width || style.height) {
      // This is in case the $elt is one of our own style barriers,
      // which need to be told to stop trying to control their own
      // dimensions if we want to be able to take over.
      $elt.attr('data-card-external-sizing', 1);
    }
  }
  if (dataAttrs) {
    Object.keys(dataAttrs).forEach(key => $elt.attr('data-' + key, dataAttrs[key]));
  }
}
