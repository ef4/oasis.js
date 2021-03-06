import raf from 'oasis/raf';
import jQuery from 'jquery';
import { currentTransform } from 'oasis/matrix';
import { applyPreferredGeometry, measureGeometry } from 'oasis/child-card';

export default class OverlayTracker {
  // Position the given card on top of the targetElement. Optionally,
  // choose which containerElement will be the true DOM parent for the
  // card (defaults to body).
  constructor(card, targetElement, containerElement) {
    if (!containerElement) {
      containerElement = document.body;
    }
    this._margins = { top: 0,  bottom: 0, left: 0, right: 0 };
    this.card = card;
    this.$elt = jQuery(card.element);
    this.$target = jQuery(targetElement);
    this.$container = jQuery(containerElement);
    this.initialized = false;
    this.outOfFlow = null;
    this.untether = false;

    this.$elt.css({
      visibility: 'hidden',
      position: 'absolute',
      'will-change': 'transform',
      width: this.$target.width(),
      height: this.$target.height()
    });

    this.card.on('measureGeometry', dimensions => this.measureGeometry(dimensions));
    this.card.on('preferredGeometry', request => this.applyPreferredGeometry(request));

    this.$container.prepend(card.element);
    this.card.loaded().then(() => {
      this._trackPosition();
    });
  }

  measureGeometry(dimensions) {
    return measureGeometry(this.$target, dimensions);
  }

  applyPreferredGeometry(request) {
    return this.card.loaded().then(() => {
      // Margins can always be set, and they're respected by _trackPosition
      // whether or not we are outOfFlow.
      if (request.margins) {
        this.margins = request.margins;
      }

      this.untether = !!request.untether;

      // outOfFlow geometry gets saved for use by _trackPosition.
      if (request.outOfFlow) {
        if (this.outOfFlow) {
          this.outOfFlow = Object.assign(this.outOfFlow, request.outOfFlow);
        } else {
          this.outOfFlow = request.outOfFlow;
        }
      } else {
        this.outOfFlow = null;
      }

      // Style requests always apply to our in-flow $target (which our
      // $elt will track automatically when it's supposed to.
      if (request.style) {
        applyPreferredGeometry(this.$target, { style: request.style });
      }

      // dataAttrs requests always apply to our real overlay element.
      if (request.dataAttrs) {
        applyPreferredGeometry(this.$elt, { dataAttrs: request.dataAttrs });
      }
    });
  }

  get margins() {
    return this._margins;
  }

  set margins(values) {
    this._margins = Object.assign(this._margins, values);
  }

  _size() {
    let m = this.margins;
    let width, height;
    if (this.outOfFlow) {
      width = this.outOfFlow.width || this.$target.width();
      height = this.outOfFlow.height || this.$target.height();
    } else {
      width = this.$target.width();
      height = this.$target.height();
    }

    // the given outOfFlow heights we were passed can be arbitrary
    // CSS. We only support adding margins when you're using integer
    // pixels.
    if (typeof width === 'number') {
      width += m.left + m.right;
    }
    if (typeof height === 'number') {
      height += m.top + m.bottom;
    }

    return { width, height };
  }

  _position() {
    let targetRect = this.$target[0].getBoundingClientRect();
    let containerRect = this.$container[0].getBoundingClientRect();
    let t = currentTransform(this.$container);
    return {
      top: (targetRect.top - containerRect.top) / t.d - this.margins.top,
      left: (targetRect.left - containerRect.left) / t.a  - this.margins.left
    };
  }

  _trackPosition() {
    let { width, height } = this._size();

    let css = {
      width: width,
      height: height
    };

    if (this.untether) {
      css.transition = 'transform 500ms';
      css.transform = '';
    } else {
      let { top, left } = this._position();
      css.transform = `translateX(${left}px) translateY(${top}px)`;
      css.transformOrigin = '0 0';
    }

    this.$elt.css(css);

    if (!this.initialized) {
      this.initialized = true;
      this.$elt.css('visibility', '');
      this.$target.css('visibility', 'hidden');
    }
    raf(() => this._trackPosition());
  }
}
