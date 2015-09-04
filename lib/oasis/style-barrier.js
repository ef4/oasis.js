function nextFrame(func) {
  if (window.requestAnimationFrame) {
    window.requestAnimationFrame(func);
  } else {
    setTimeout(func, 17); // 17ms is 60hz
  }
}

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

export default function styleBarrier(content, didLoad) {
  let iframe = document.createElement('iframe');
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = '0';
  iframe.scrolling = 'no';
  iframe.style.display = 'block';
  setSrcDoc(iframe, '<head><base target="_top"></head><body>' + content + '</body>');
  let adaptHeight = () => {
    let body = iframe.contentWindow.document.body;
    iframe.style.height = Math.min(body.getBoundingClientRect().bottom, body.scrollHeight)  + 'px';
  };
  iframe.onload = () => {
    adaptHeight();
    addThrottledListener(iframe.contentWindow, 'resize', adaptHeight);
    if (didLoad) { didLoad(); }
  };
  return iframe;
}
