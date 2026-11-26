(() => {
  const container = document.querySelector('.hyper-text');
  const prefix = document.querySelector('.headline-prefix');
  const price = document.querySelector('.headline-price');
  const heading = document.querySelector('h1');
  if (!container || !prefix || !price) return;
  const originalPrefix = prefix.textContent;
  const originalPrefixMarkup = prefix.innerHTML;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let frame;
  let timer;
  let complete = false;
  const restorePrefix = () => {
    cancelAnimationFrame(frame);
    prefix.innerHTML = originalPrefixMarkup;
  };
  const glitch = () => {
    restorePrefix();
    if (reduced.matches || document.hidden) return;
    const width = prefix.getBoundingClientRect().width;
    const walker = document.createTreeWalker(prefix, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    const characters = [];
    for (const node of nodes) {
      const fixedValue = !!node.parentElement.closest('.headline-value');
      const fragment = document.createDocumentFragment();
      for (const original of node.textContent) {
        const span = document.createElement('span');
        span.className = 'hyper-character';
        span.textContent = original === ' ' ? '\u00a0' : original;
        characters.push({span, original:span.textContent, scramble:!fixedValue && /[a-z0-9]/i.test(original)});
        fragment.append(span);
      }
      node.replaceWith(fragment);
    }
    const widths = characters.map(({span}) => span.getBoundingClientRect().width);
    characters.forEach(({span}, i) => { span.style.width = `${widths[i]}px`; });
    if (width) prefix.style.width = `${width}px`;
    const started = performance.now();
    let lastTick = -1;
    const update = now => {
      const progress = Math.min((now - started) / 600, 1);
      const tick = Math.floor((now - started) / 32);
      if (tick !== lastTick) {
        characters.forEach(({span, original, scramble}, i) => {
          span.textContent = !scramble || i < progress * characters.length ? original : alphabet[Math.floor(Math.random() * alphabet.length)];
        });
        lastTick = tick;
      }
      if (progress < 1) frame = requestAnimationFrame(update);
      else { restorePrefix(); prefix.style.width = ''; }
    };
    frame = requestAnimationFrame(update);
  };
  const announcePrice = value => heading.setAttribute('aria-label', `${originalPrefix}${value}`);
  const finish = () => {
    clearTimeout(timer);
    complete = true;
    price.textContent = '$50';
    price.classList.remove('is-typing');
    announcePrice('$50');
  };
  const type = (value, done) => {
    let index = 0;
    const next = () => {
      price.textContent = value.slice(0, ++index);
      if (index < value.length) timer = setTimeout(next, 95);
      else { announcePrice(value); done(); }
    };
    timer = setTimeout(next, 95);
  };
  const erase = done => {
    const next = () => {
      price.textContent = price.textContent.slice(0, -1);
      if (price.textContent.length) timer = setTimeout(next, 45);
      else done();
    };
    timer = setTimeout(next, 45);
  };
  document.fonts.ready.then(() => {
    if (complete || reduced.matches || document.hidden) { finish(); return; }
    price.textContent = '';
    price.classList.add('is-typing');
    glitch();
    type('$100', () => {
      timer = setTimeout(() => erase(() => type('$75', () => {
        timer = setTimeout(() => erase(() => type('$50', finish)), 1000);
      })), 700);
    });
  });
  document.addEventListener('pack:open', glitch);
  window.addEventListener('resize', () => { restorePrefix(); prefix.style.width = ''; });
  reduced.addEventListener('change', () => { restorePrefix(); prefix.style.width = ''; if (reduced.matches) finish(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { restorePrefix(); prefix.style.width = ''; finish(); }
  });
  window.addEventListener('pagehide', () => { clearTimeout(timer); cancelAnimationFrame(frame); }, { once: true });
})();
