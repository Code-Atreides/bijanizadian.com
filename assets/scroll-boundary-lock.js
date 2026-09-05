(function () {
  var touchY = 0;

  function scrollableParent(node) {
    while (node && node !== document.body) {
      var style = window.getComputedStyle(node);
      if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) return node;
      node = node.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  }

  function atBoundary(target, deltaY) {
    var top = target === document.scrollingElement || target === document.documentElement
      ? window.scrollY
      : target.scrollTop;
    var height = target === document.scrollingElement || target === document.documentElement
      ? document.documentElement.scrollHeight
      : target.scrollHeight;
    var viewport = target === document.scrollingElement || target === document.documentElement
      ? window.innerHeight
      : target.clientHeight;
    return (deltaY < 0 && top <= 0) || (deltaY > 0 && top + viewport >= height - 1);
  }

  document.addEventListener('wheel', function (event) {
    if (atBoundary(scrollableParent(event.target), event.deltaY)) event.preventDefault();
  }, { passive: false });

  document.addEventListener('touchstart', function (event) {
    if (event.touches.length === 1) touchY = event.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchmove', function (event) {
    if (event.touches.length !== 1) return;
    var nextY = event.touches[0].clientY;
    var deltaY = touchY - nextY;
    touchY = nextY;
    if (atBoundary(scrollableParent(event.target), deltaY)) event.preventDefault();
  }, { passive: false });
})();
