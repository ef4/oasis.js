export default function(fn) {
  if (typeof requestAnimationFrame === 'undefined') {
    setTimeout(fn, 17);  // 17ms is 60hz
  } else {
    requestAnimationFrame(fn);
  }
}
