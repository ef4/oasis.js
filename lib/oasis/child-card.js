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
    this.onDefault('measureGeometry', request => this.measureGeometry(request));
    this.onDefault('preferredGeometry', request => this.applyPreferredGeometry(request));

    this.initialLoad = RSVP.defer();

    if (!opts.hasOasis) {
      iframe.addEventListener('load', this);
    }
  }

  _didLoad() {
    this.initialLoad.resolve();
  }

  // Accepts width and/or height in px, %, em, rem, vh, or
  // vw. Responds to the card telling it what pixel width and/or
  // height would result.
  //
  // If you don't specify a width, the environment gets to pick one
  // for you and will send it back. Whereas no height is provided by
  // default, because the default assumption is that the width flows
  // from the outside in, but height frows from the inside out. (If
  // you think about it, this is how most "normal" divs behave).
  measureGeometry(dimensions) {
    return measureGeometry(jQuery(this.element), dimensions);
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
    replaceDataAttrs($elt, dataAttrs);
  }
}

function replaceDataAttrs($elt, dataAttrs) {
  Object.keys(dataAttrs).forEach(key => $elt.attr('data-' + key, dataAttrs[key]));
  let lastAttrs = $elt.data('last-oasis-attrs');
  if (lastAttrs) {
    Object.keys(lastAttrs).forEach(key => {
      if (!dataAttrs[key]) {
        $elt.attr('data-' + key, null);
      }
    });
  }
  $elt.data('last-oasis-attrs', dataAttrs);
}

function measureDimension($elt, value, dimension) {
  let m = /(.*\d)(px|%|rem|em|vh|vw)$/.exec(value);
  if (!m) { return null; }

  let number = parseFloat(m[1]);
  let unit = m[2];

  switch (unit) {
  case 'px':
    return number;
  case '%':
    return Math.round($elt.parent()[dimension]() * number / 100);
  case 'rem':
    return Math.round(fontSizeOf(jQuery('html')) * number);
  case 'em':
    return Math.round(fontSizeOf($elt) * number);
  case 'vh':
    return Math.round(jQuery(window).height() * number / 100);
  case 'vw':
    return Math.round(jQuery(window).width() * number / 100);
  }
}

export function measureGeometry($elt, dimensions) {
  let result = {};
  if (dimensions.width != null) {
    result.width = measureDimension($elt, dimensions.width, 'width');
  } else {
    result.width = measureDimension($elt, '100%', 'width');
  }
  if (dimensions.height != null) {
    result.height = measureDimension($elt, dimensions.width, 'width');
  }
  return result;
}

function fontSizeOf($elt) {
  return parseFloat($elt.css('font-size'));
}
