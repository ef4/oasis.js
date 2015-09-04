import RSVP from 'rsvp';

export default class Card {
  constructor({ deferLoad } = {}) {
    this.requestCounter = 0;
    let channel = new MessageChannel();
    let message = {
      cardHello: true,
      deferLoad
    };
    window.top.postMessage(message, '*', [channel.port2]);
    this.port = channel.port1;
    this.port.addEventListener('message', this);
    this.port.start();
    this.requests = {};
    this.eventHandlers = {};
  }

  destroy() {
    if (this.port) {
      this.port.removeEventListener('message', this);
      this.port = null;
    }
  }

  handleEvent({ data }) {
    let inReplyTo = data.inReplyTo;
    if (inReplyTo != null && this.requests[inReplyTo]) {
      let resolve = this.requests[inReplyTo];
      this.requests[inReplyTo] = null;
      resolve(data.reply);
    } else if (data.event) {
      let handlers = this.eventHandlers[data.event];
      if (handlers) {
        for (let { handler, target} of handlers) {
          if (typeof target === 'function') {
            target.call(this, ...data.args);
          } else if (typeof handler === 'function') {
            handler.call(target, ...data.args);
          } else {
            target[handler](...data.args);
          }
        }
      }
    }
  }

  request(method, ...args) {
    return new RSVP.Promise(resolve => {
      this.requests[this.requestCounter] = resolve;
      this.port.postMessage({
        request: method,
        args,
        requestID: this.requestCounter++
      });
    });
  }

  triggerEvent(eventName, ...args) {
    this.port.postMessage({
      event: eventName,
      args
    });
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
}
