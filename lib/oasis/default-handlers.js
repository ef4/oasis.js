export default {
  didLoad() {
    this._didLoad();
  },
  setPreferredSize(size) {
    if (size.height != null) {
      this.iframe.style.height = size.height + 'px';
    }
  }
};
