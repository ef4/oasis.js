let startTime;

export default function(fn) {
  if (typeof requestAnimationFrame === 'undefined') {
    if (!startTime) {
      startTime = Date.now();
    }
    setTimeout(() => fn(Date.now() - startTime), 33);  // 33ms is 30hz
  } else {
    requestAnimationFrame(fn);
  }
}
