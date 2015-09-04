import RSVP from 'rsvp';
import defaultHandlers from 'oasis/default-handlers';

export default class CardRef {
  constructor(url) {
    let iframe = this.iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.scrolling = 'no';

    this.port = null;
    this.initialLoad = RSVP.defer();
    this.eventHandlers = {};
    this.requestHandlers = {};
    this.waitingRequests = {};
    this.requestCounter = 0;

    iframe.addEventListener('load', this);
    window.addEventListener('message', this);
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

  // This is our public entrypoint for the standard EventListener
  // interface. We use it for toplevel messages via window, subsequent
  // messages via message port, and iframe.onload.
  handleEvent(e) {
    if (e.target === this.iframe && e.type === 'load') {
      this._didLoad();
    } else if (e.source != null) {
      this._initialMessageHandler(e);
    } else {
      this._portMessageHandler(e);
    }
  }

  // Handles the initial message from a card, in which we will receive
  // the card's own port for subsequent messaging.
  _initialMessageHandler(e) {
    if (e.source === this.iframe.contentWindow && e.data.cardHello) {
      if (e.data.deferLoad) {
        // card is asking us to wait until it says its ready, rather
        // than use the default iframe.onload event.
        this.iframe.removeEventListener('load', this);
      }
      if (this.port) {
        this.port.removeEventListener('message', this);
      }
      this.port = e.ports[0];
      this.port.addEventListener('message', this);
      this.port.start();
    }
  }

  // Handles messages on the card's port.
  _portMessageHandler({ data }) {
    let inReplyTo = data.inReplyTo;
    if (inReplyTo != null && this.waitingRequests[inReplyTo]) {
      let resolve = this.waitingRequests[inReplyTo];
      this.waitingRequests[inReplyTo] = null;
      resolve(data.reply);
    } else if (data.request) {
      let handler = this.requestHandlers[data.request];
      if (handler) {
        RSVP.resolve(handler(...data.args)).then(reply => {
          this.port.postMessage({
            inReplyTo: data.requestID,
            reply
          });
        });
      }
    } else if (data.event) {
      let handlers = this.eventHandlers[data.event];
      if (handlers) {
        for (let entry of handlers) {
          this._normalizedHandler(entry)(...data.args);
        }
      } else if (defaultHandlers[data.event]) {
        defaultHandlers[data.event].call(this, ...data.args);
      }
    }
  }

  on(event, target, handler) {
    let handlers = this.eventHandlers[event];
    if (!handlers) {
      handlers = this.eventHandlers[event] = [];
    }
    handlers.push({ target, handler });
  }

  off(event, target, handler) {
    let handlers = this.eventHandlers[event];
    if (handlers) {
      for (let [index, { registeredHandler, registeredTarget }] of handlers.entries()) {
        if (handler === registeredHandler && target === registeredTarget) {
          handlers.splice(index, 1);
          break;
        }
      }
    }
  }

  _normalizedHandler({ target, handler }) {
    if (typeof target === 'function') {
      return (...args) => target.call(this, ...args);
    } else if (typeof handler === 'function') {
      return (...args) => handler.call(target, ...args);
    } else {
      return (...args) => target[handler](...args);
    }
  }

  onRequest(method, target, handler) {
    if (this.requestHandlers[method]) {
      throw new Error("attempted to register multiple request handlers for " + method);
    }
    this.requestHandlers[method] = this._normalizedHandler({ target, handler });
  }

  offRequest(method) {
    this.requestHandlers[method] = null;
  }

  // Public interface for sending an event to the card, without
  // expecting any response.
  triggerEvent(event, ...args) {
    this.port.postMessage({ event, args });
  }

  // Public interface for sending a request to the card and waiting
  // for a reply.
  request(method, ...args) {
    return new Ember.RSVP.Promise(resolve => {
      this.waitingRequests[this.requestCounter] = resolve;
      this.port.postMessage({
        request: method,
        args,
        requestID: this.requestCounter++
      });
    });
  }

}
