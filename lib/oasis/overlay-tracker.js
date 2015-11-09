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
    this.fixed = null;
    this.velocity = { x: 0, y: 0 };
    this.lastTimer = null;
    this.scaleX = 1;
    this.scaleY = 1;

    // Tunable parameters for when we're animating between tracking
    // and fixed modes These are both one-dimensional measures (you
    // can travel maxSpeed along both the x and y axes at the same
    // time, giving an actual speed that's sqrt(2) faster, which isn't
    // that important).
    this.acceleration = 0.004; // pixels per ms per ms
    this.maxSpeed = 0.8; // pixels per ms


    // True when we are tracking the underlying element exactly. This
    // becomes false when `fixed`, and it doesn't return to true until
    // we've animated back into position.
    this.tethered = true;

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

  // This is a hook intended to allow customization in derived
  // classes. It is called at the start of each animation frame.
  willUpdate() {}

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

      // `fixed` lets our card temporarily stop tracking the
      // underlying document flow and instead become fixed position,
      // with nicely animated interpolation between fixed and not
      // fixed.
      if (request.fixed === true) {
        // fixed=true is a shorthand for fixed={top: 0, left:0}.
        this.fixed = { top: 0, left: 0 };
      } else {
        this.fixed = request.fixed;
      }

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

      // dataAttrs requests always apply to our overlay element.
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
    let ownRect = this.$elt[0].getBoundingClientRect();
    let t = currentTransform(this.$elt);

    // margins measure a distance *inside* the card, and we're about
    // to use them in a calculation for an outside-the-card
    // measurement, so we need to convert them via any active scaling
    // factors.

    return {
      top: targetRect.top - ownRect.top - this.scaleY*this.margins.top + t.ty,
      left: targetRect.left - ownRect.left  - this.scaleX*this.margins.left + t.tx
    };
  }

  _trackPosition(timer) {
    this.willUpdate();

    // if our timer is running slower than 30hz, we just slow down the
    // motion, rather than let our step size get too big.
    let ms = clamp(timer - this.lastTimer, 33);
    this.lastTimer = timer;
    let { width, height } = this._size();

    let css = {
      width: width,
      height: height
    };

    if (!this.tethered) {
      let targetPosition = this.fixed ? this.fixed : this._position();
      let curTransform = currentTransform(this.$elt);
      if (!this.fixed && samePosition(targetPosition, curTransform)) {
        // we got back into tethered position
        this.tethered = true;
        // force into absolute positioning right away, and fall
        // through to immediately begin tracking to compensate.
        this.$elt.css('position', '');
      } else {
        let { left, top } = this._stepMotion(ms, targetPosition, curTransform);
        css.transform = `translateX(${left}px) translateY(${top}px)`;
      }
    }

    if (this.tethered) {
      if (this.fixed) {
        this.tethered = false;
        // force into fixed position right now, so that the subsequent
        // transform will compensate automatically.
        this.$elt.css('position', 'fixed');
      }
      let { top, left } = this._position();
      css.transform = `translateX(${left}px) translateY(${top}px)`;
    }

    if (this.scaleX !== 1) {
      css.transform = (css.transform || '') + ` scaleX(${this.scaleX})`;
    }
    if (this.scaleY !== 1) {
      css.transform = (css.transform || '') + ` scaleY(${this.scaleY})`;
    }

    this.$elt.css(css);

    if (!this.initialized) {
      this.initialized = true;
      this.$elt.css('visibility', '');
      this.$elt.css('transform-origin', '0 0');
      this.$target.css('visibility', 'hidden');
    }
    raf((timer) => this._trackPosition(timer));
  }

  _stepMotion(ms, target, current) {
    let xError = target.left - current.tx;
    let yError = target.top - current.ty;

    // we should go no faster than what would allow us to decelerate
    // down to a stop by the time we get to our destination. We should
    // also go no faster than our maxSpeed.
    let idealVelocityX = clamp(fastestSafeSpeed(ms, this.acceleration, xError), this.maxSpeed);
    let idealVelocityY = clamp(fastestSafeSpeed(ms, this.acceleration, yError), this.maxSpeed);

    let accelX = clamp((idealVelocityX - this.velocity.x) / ms, this.acceleration);
    let accelY = clamp((idealVelocityY - this.velocity.y) / ms, this.acceleration);

    this.velocity.x += accelX * ms;
    this.velocity.y += accelY * ms;

    let left = current.tx + this.velocity.x * ms;
    let top = current.ty + this.velocity.y * ms;

    return { left, top };
  }
}

function samePosition(position, transform) {
  return Math.floor(Math.abs(position.top - transform.ty)) === 0 &&
    Math.floor(Math.abs(position.left - transform.tx)) === 0;
}

function clamp(value, absBound) {
  let min = -1 * absBound;
  if (value < min) { return min; }
  if (value > absBound) { return absBound; }
  return value;
}

function fastestSafeSpeed(tickSize, maxAcceleration, stoppingDistance) {
  let absDistance = Math.abs(stoppingDistance);
  let absLimit = maxAcceleration * Math.sqrt(2* absDistance / maxAcceleration);

  absLimit = clamp(absLimit, absDistance / tickSize);

  if (stoppingDistance < 0) {
    return -1 * absLimit;
  } else {
    return absLimit;
  }

}
