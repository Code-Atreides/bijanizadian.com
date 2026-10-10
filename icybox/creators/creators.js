// IcyBox creator program: catalog marquee, the demo spin, clip autoplay and
// the application form. Applications are written once to icybox_creators/<key>
// in the site's Realtime Database; the rule allows writes but no reads.
(function () {
  'use strict';
  var BAGS = [
    { file: 'birkin30-rouge', brand: 'Hermès', name: 'Birkin 30, Rouge Casaque Epsom', price: 29000 },
    { file: 'kelly28', brand: 'Hermès', name: 'Kelly 28 Sellier, Gold Epsom', price: 34500 },
    { file: 'lady-dior', brand: 'Dior', name: 'Mini Lady Dior, Himalayan Crocodile', price: 30000 },
    { file: 'birkin35-black', brand: 'Hermès', name: 'Togo Birkin Retourne 35, Black', price: 26500 },
    { file: 'lv-murakami', brand: 'Louis Vuitton', name: 'Murakami Cherry Blossom Capucines Mini', price: 12000 },
    { file: 'chanel-classic', brand: 'Chanel', name: 'Small Classic Handbag', price: 11300 },
    { file: 'chanel25-anthracite', brand: 'Chanel', name: 'Metallic Caviar Mini 25, Anthracite', price: 11100 },
    { file: 'chanel-iridescent', brand: 'Chanel', name: 'Iridescent Classic with Art Top Handle', price: 11000 },
    { file: 'chanel25-butter', brand: 'Chanel', name: '2026 Mini 25 Hobo, Butter Yellow', price: 10500 },
    { file: 'chanel25-blue', brand: 'Chanel', name: 'Metallic Caviar Mini 25, Dark Blue', price: 10500 },
    { file: 'chanel-flap', brand: 'Chanel', name: 'Flap Bag with Top Handle, Black', price: 7700 }
  ];
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function src(b) { return '/icybox/creators/bags/' + b.file + '.webp'; }
  function short(n) { return '$' + (n / 1000).toFixed(1) + 'k'; }
  function full(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  // Catalog marquee, doubled so the loop is seamless.
  var track = document.querySelector('[data-marquee]');
  if (track) {
    for (var copy = 0; copy < 2; copy++) {
      BAGS.forEach(function (b) {
        var li = el('li', 'bag-card');
        if (copy) li.setAttribute('aria-hidden', 'true');
        var img = el('img'); img.src = src(b); img.alt = copy ? '' : b.brand + ' ' + b.name; img.width = 220; img.height = 220; img.loading = 'lazy';
        var price = el('b'); price.textContent = short(b.price);
        li.append(img, price);
        track.appendChild(li);
      });
    }
  }

  // Demo spin: a reel of bag cards that eases out onto a random bag.
  var spinner = document.querySelector('[data-spinner]');
  if (spinner) {
    var reel = spinner.querySelector('[data-reel]');
    var pull = spinner.querySelector('[data-pull]');
    var button = spinner.querySelector('[data-spin]');
    var out = {
      tier: spinner.querySelector('[data-pull-tier]'),
      brand: spinner.querySelector('[data-pull-brand]'),
      name: spinner.querySelector('[data-pull-name]'),
      price: spinner.querySelector('[data-pull-price]')
    };
    var COUNT = 44, LAND_MIN = 32, spinning = false, current = BAGS[0];

    var build = function (first, winner, landAt) {
      reel.textContent = '';
      for (var i = 0; i < COUNT; i++) {
        var b = i === 2 ? first : i === landAt ? winner : BAGS[Math.floor(Math.random() * BAGS.length)];
        var li = el('li', 'reel-item');
        var img = el('img'); img.src = src(b); img.alt = ''; img.decoding = 'async';
        li.appendChild(img);
        reel.appendChild(li);
      }
    };
    var offsetFor = function (index, jitter) {
      var item = reel.children[index];
      var windowWidth = reel.parentElement.clientWidth;
      return -(item.offsetLeft + item.offsetWidth / 2 - windowWidth / 2 + (jitter || 0));
    };
    var show = function (b) {
      var grail = b.price >= 25000;
      out.tier.textContent = grail ? 'Grail' : 'Epic';
      out.tier.classList.toggle('epic', !grail);
      out.brand.textContent = b.brand;
      out.name.textContent = b.name;
      out.price.textContent = full(b.price);
    };
    var spin = function () {
      if (spinning) return;
      spinning = true;
      button.disabled = true;
      var winner = BAGS[Math.floor(Math.random() * BAGS.length)];
      var landAt = LAND_MIN + Math.floor(Math.random() * 6);
      build(current, winner, landAt);
      reel.style.transition = 'none';
      reel.style.transform = 'translateX(' + offsetFor(2) + 'px)';
      pull.classList.add('is-waiting');
      void reel.offsetWidth;
      var item = reel.children[landAt];
      var jitter = (Math.random() - 0.5) * item.offsetWidth * 0.6;
      var finish = function () {
        reel.style.transition = 'none';
        reel.style.transform = 'translateX(' + offsetFor(landAt) + 'px)';
        item.classList.add('is-hit');
        if (winner.price < 25000) item.classList.add('epic');
        show(winner);
        pull.classList.remove('is-waiting');
        current = winner;
        spinning = false;
        button.disabled = false;
        button.textContent = 'Spin again';
      };
      if (reduceMotion) { finish(); return; }
      reel.style.transition = 'transform 5.2s cubic-bezier(.08,.72,.12,1)';
      reel.style.transform = 'translateX(' + offsetFor(landAt, jitter) + 'px)';
      setTimeout(function () {
        reel.style.transition = 'transform .35s ease-out';
        reel.style.transform = 'translateX(' + offsetFor(landAt) + 'px)';
        setTimeout(finish, 360);
      }, 5250);
    };

    build(current, current, -1);
    reel.style.transform = 'translateX(' + offsetFor(2) + 'px)';
    reel.children[2].classList.add('is-hit');
    show(current);
    spinner.classList.add('is-ready');
    button.addEventListener('click', spin);
    window.addEventListener('resize', function () {
      if (spinning) return;
      var hit = reel.querySelector('.is-hit');
      if (hit) { reel.style.transition = 'none'; reel.style.transform = 'translateX(' + offsetFor(Array.prototype.indexOf.call(reel.children, hit)) + 'px)'; }
    });
    // Spin once the first time the demo comes into view.
    if ('IntersectionObserver' in window && !reduceMotion) {
      var seen = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { seen.disconnect(); setTimeout(spin, 400); }
      }, { threshold: 0.6 });
      seen.observe(spinner);
    }
  }

  // Creator clips play only while on screen.
  var clips = document.querySelectorAll('video[data-autoplay]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var watch = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.preload = 'auto'; var p = e.target.play(); if (p && p.catch) p.catch(function () {}); }
        else e.target.pause();
      });
    }, { threshold: 0.35 });
    clips.forEach(function (v) { watch.observe(v); });
  } else {
    clips.forEach(function (v) { v.controls = true; });
  }

  // Application form.
  var form = document.getElementById('apply-form');
  if (!form) return;
  var DB = 'https://bijanizadian-84e48-default-rtdb.firebaseio.com';
  var submit = document.getElementById('apply-submit');
  var error = document.getElementById('form-error');
  var done = document.getElementById('apply-done');
  var label = submit.innerHTML;

  function handle(v) {
    v = v.trim().replace(/^https?:\/\/(www\.)?(instagram\.com|tiktok\.com)\/@?/i, '').replace(/[/?#].*$/, '').replace(/^@+/, '');
    return v ? '@' + v : '';
  }
  function digits(v) { return v.replace(/\D/g, ''); }
  function formatPhone(v) {
    var d = digits(v);
    if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1);
    if (d.length !== 10) return v.trim();
    return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
  }
  function valid(input) {
    var v = input.value.trim();
    var ok = true;
    if (input.type === 'checkbox') ok = input.checked;
    else if (input.required && !v) ok = false;
    else if (input.type === 'email' && v) ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    else if (input.type === 'tel' && v) ok = digits(v).length >= 10;
    if (input.type === 'checkbox') input.closest('.age').classList.toggle('is-invalid', !ok);
    else input.setAttribute('aria-invalid', ok ? 'false' : 'true');
    return ok;
  }
  form.addEventListener('input', function (e) {
    if (e.target.getAttribute('aria-invalid') === 'true' || e.target.type === 'checkbox') valid(e.target);
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    error.hidden = true;
    var fields = Array.prototype.slice.call(form.querySelectorAll('.form-grid input, .age input'));
    var bad = fields.filter(function (f) { return !valid(f); });
    if (bad.length) {
      error.textContent = 'Check the highlighted fields.';
      error.hidden = false;
      bad[0].focus();
      return;
    }
    if (form.company.value) { finish(); return; }
    var data = {
      first_name: form.first_name.value.trim(),
      last_name: form.last_name.value.trim(),
      email: form.email.value.trim(),
      phone: formatPhone(form.phone.value),
      school: form.school.value.trim(),
      chapter: form.chapter.value.trim(),
      instagram: handle(form.instagram.value),
      tiktok: handle(form.tiktok.value),
      age_ok: true,
      submitted_at: new Date().toISOString(),
      page: location.pathname
    };
    submit.disabled = true;
    submit.textContent = 'Sending…';
    var key = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    fetch(DB + '/icybox_creators/' + key + '.json', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      finish();
    }).catch(function () {
      submit.disabled = false;
      submit.innerHTML = label;
      error.textContent = 'That didn’t send. Check your connection and try again, or DM @icybox.app on Instagram.';
      error.hidden = false;
    });
  });
  function finish() {
    form.hidden = true;
    done.hidden = false;
    done.setAttribute('tabindex', '-1');
    done.focus();
  }
})();
