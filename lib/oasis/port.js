import RSVP from 'rsvp';

export default class Port {
  constructor() {
    this._port = null;
    this.requestHandlers = {};
    this.waitingRequests = {};
    this.requestCounter = 0;
  }

  get messagePort() {
    return this._port;
  }

  set messagePort(p) {
    if (this._port) {
      this._port.removeEventListener('message', this);
    }
    this._port = p;
    p.addEventListener('message', this);
    p.start();
  }


  // This is our public entrypoint for the standard EventListener
  // interface. We use it for toplevel messages via window, subsequent
  // messages via message port, and iframe.onload.
  handleEvent({ data }) {
    let inReplyTo = data.inReplyTo;
    if (inReplyTo != null && this.waitingRequests[inReplyTo]) {
      let resolve = this.waitingRequests[inReplyTo];
      this.waitingRequests[inReplyTo] = null;
      resolve(data.reply);
    } else if (data.request) {
      let handler = this.requestHandlers[data.request];
      if (handler) {
        RSVP.resolve(handler(...data.args)).then(reply => {
          this.messagePort.postMessage({
            inReplyTo: data.requestID,
            reply
          });
        });
      }
    } else if (data.event) {
      let handler = this.requestHandlers[data.event];
      if (handler) {
        handler(...data.args);
      }
    }
  }

  on(method, handler) {
    if (this.requestHandlers[method] && ! this.requestHandlers[method]._isDefault) {
      throw new Error("attempted to register multiple request handlers for " + method);
    }
    this.requestHandlers[method] = handler;
  }

  onDefault(method, handler) {
    handler._isDefault = true;
    this.on(method, handler);
  }

  off(method) {
    this.requestHandlers[method] = null;
  }

  // Public interface for sending an event to the card, without
  // expecting any response.
  triggerEvent(event, ...args) {
    this.messagePort.postMessage({ event, args });
  }

  // Public interface for sending a request to the card and waiting
  // for a reply.
  request(method, ...args) {
    return new RSVP.Promise(resolve => {
      this.waitingRequests[this.requestCounter] = resolve;
      this.messagePort.postMessage({
        request: method,
        args,
        requestID: this.requestCounter++
      });
    });
  }

}
