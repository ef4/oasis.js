import nextFrame from 'oasis/raf';

function addThrottledListener(elt, event, handler) {
  let pending = false;
  elt.addEventListener(event, () => {
    if (pending) { return; }
    pending = true;
    nextFrame(() => {
      pending = false;
      handler();
    });
  });
}

function setSrcDoc(iframe, content) {
  if ("srcdoc" in document.createElement("iframe")) {
    iframe.srcdoc = content;
  } else {
    iframe.setAttribute('srcdoc', content);
    /* jshint -W107 */
    iframe.setAttribute('src', 'javascript: window.frameElement.getAttribute("srcdoc");');
    /* jshint +W107 */
  }
}

function measureHeight(elt) {
  let height = elt.getBoundingClientRect().bottom;
  for (let i = 0; i < elt.children.length; i++) {
    let other = elt.children[i].getBoundingClientRect().bottom;
    if (other > height) {
      height = other;
    }
  }
  return Math.min(height, elt.scrollHeight);
}

export default function styleBarrier(content, didLoad) {
  let iframe = document.createElement('iframe');
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = '0';
  iframe.scrolling = 'no';
  iframe.style.display = 'block';
  setSrcDoc(iframe, '<head><base target="_top"><style type="text/css">body { padding: 0; margin: 0; } body > * { width: 100%; }</style></head><body>' + content + '</body>');
  let adaptHeight = () => {
    if (!iframe.attributes['data-card-external-sizing']) {
      iframe.style.height = measureHeight(iframe.contentWindow.document.body) + 'px';
    }
  };
  let addedListener = false;
  iframe.onload = () => {
    adaptHeight();
    if (!addedListener) {
      addedListener = true;
      addThrottledListener(iframe.contentWindow, 'resize', adaptHeight);
    }
    if (didLoad) { didLoad(); }
  };
  return iframe;
}
