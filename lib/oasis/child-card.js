import RSVP from 'rsvp';
import BaseCard from 'oasis/base-card';
import raf from 'oasis/raf';
import jQuery from 'jquery';
import { currentTransform } from 'oasis/matrix';

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
    this.onDefault('setPreferredSize', (size) => {
      if (size.height != null) {
        this.iframe.style.height = size.height + 'px';
      }
    });

    this.initialLoad = RSVP.defer();

    if (!opts.hasOasis) {
      iframe.addEventListener('load', this);
    }

    this.positionTracker = null;
    this._margins = {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0
    };
  }

  _didLoad() {
    this.initialLoad.resolve();
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

  destroy() {
    super.destroy();
    this.positionTracker = null;
  }

  get margins() {
    return this._margins;
  }

  set margins(values) {
    this._margins = Object.assign(this._margins, values);
  }

  positionOver(targetElement, containerElement) {
    if (!containerElement) {
      containerElement = document.body;
    }
    let $elt = jQuery(this.element);
    let $target = jQuery(targetElement);
    let $container = jQuery(containerElement);
    this.positionTracker = {
      target: $target,
      initialized: false,
      container: $container
    };
    $elt.css({
      display: 'none',
      position: 'absolute',
      'will-change': 'transform'
    });
    $container.prepend(this.element);
    return this.loaded().then(() => {
      this._trackPosition();
      this.onDefault('setPreferredSize', request => {
        if (request.height != null) {
          $target.attr('data-card-external-sizing', 1);
          $target.height(request.height);
        }
      });
    });
  }

  _trackPosition() {
    let tracker = this.positionTracker;
    if (!tracker) {
      return;
    }

    let $elt = jQuery(this.element);
    let targetRect = tracker.target[0].getBoundingClientRect();
    let containerRect = tracker.container[0].getBoundingClientRect();
    let t = currentTransform(tracker.container);
    let m = this.margins;

    $elt.css({
      transform: `translateX(${(targetRect.left - containerRect.left - m.left)/t.a}px) translateY(${(targetRect.top - containerRect.top - m.top)/t.d}px)`,
      transformOrigin: '0 0',
      width: tracker.target.width() + m.left + m.right,
      height: tracker.target.height() + m.top + m.bottom
    });

    if (!tracker.initialized) {
      tracker.initialized = true;
      $elt.css('display', '');
      tracker.target.css('visibility', 'hidden');
    }
    raf(() => this._trackPosition());
  }
}
