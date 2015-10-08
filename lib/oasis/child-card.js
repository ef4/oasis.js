import RSVP from 'rsvp';
import BaseCard from 'oasis/base-card';
import raf from 'oasis/raf';
import jQuery from 'jquery';
import { currentTransform } from 'oasis/matrix';

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

    this.positionTracker = null;
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
    this.messagePort = e.ports[0];
  }

  destroy() {
    super.destroy();
    this.positionTracker = null;
  }

  positionOver(targetElement, containerElement) {
    if (!containerElement) {
      containerElement = document.body;
    }
    this.positionTracker = {
      targetElement,
      initialized: false,
      containerElement
    };
    let style = this.element.style;
    style.display = 'none';
    style.position = 'absolute';
    jQuery(containerElement).prepend(this.element);
    this.loaded().then(() => {
      this._trackPosition();
    });
  }

  _trackPosition() {
    let tracker = this.positionTracker;
    if (!tracker) {
      return;
    }

    let $target = jQuery(tracker.targetElement);
    let $elt = jQuery(this.element);

    let targetRect = tracker.targetElement.getBoundingClientRect();
    let containerRect = tracker.containerElement.getBoundingClientRect();
    let t = currentTransform(jQuery(tracker.containerElement));

    $elt.css({
      transform: `translateX(${(targetRect.left - containerRect.left)/t.a}px) translateY(${(targetRect.top - containerRect.top)/t.d}px)`,
      transformOrigin: '0 0',
      width: $target.width(),
      height: $target.height()
    });

    if (!tracker.initialized) {
      tracker.initialized = true;
      this.element.style.display = '';
    }
    raf(() => this._trackPosition());
  }
}
