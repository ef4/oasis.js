export default function(fn) {
  if (typeof requestAnimationFrame === 'undefined') {
    setTimeout(fn, 17);
  } else {
    requestAnimationFrame(fn);
  }
}
