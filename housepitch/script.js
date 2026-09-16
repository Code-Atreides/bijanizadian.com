'use strict';
(() => {
  const photos = [
    ['living-dusk', 'The A-frame, at dusk.', 'Glass-fronted A-frame living room opening onto the terrace at sunset'],
    ['terrace-dusk', 'The city, from here.', 'Outdoor lounge terrace overlooking Los Angeles at sunset'],
    ['exterior-dusk', 'An unmistakable silhouette.', 'A-frame architecture above the curved lower level at dusk'],
    ['pool', 'A moment by the pool.', 'Private swimming pool beside the house'],
    ['living-dining', 'Space to bring people together.', 'Open living and dining room with a tall A-frame ceiling'],
    ['panoramic-suite', 'A different perspective.', 'Spacious lower-level suite with a curved glass wall and city views'],
    ['kitchen', 'Where the evening begins.', 'Renovated kitchen connecting to the main living space'],
    ['aerial', 'The whole picture.', 'Overhead listing photograph showing the home, terraces, and pool']
  ];
  const gallery = document.querySelector('#gallery');
  const galleryImage = document.querySelector('#gallery-image');
  let photoIndex = 0;
  let galleryTrigger;
  function renderPhoto(index) {
    photoIndex = (index + photos.length) % photos.length;
    const [file, caption, alt] = photos[photoIndex];
    galleryImage.src = `/housepitch/images/${file}-clean.jpg`;
    galleryImage.alt = alt;
    document.querySelector('#gallery-caption').textContent = caption;
    document.querySelector('#gallery-counter').textContent = `${String(photoIndex + 1).padStart(2, '0')} / ${String(photos.length).padStart(2, '0')}`;
  }
  document.querySelectorAll('[data-photo]').forEach(button => {
    button.addEventListener('click', () => {
      galleryTrigger = button;
      renderPhoto(Number(button.dataset.photo));
      gallery.showModal();
      document.body.classList.add('modal-open');
      document.querySelector('#gallery-close').focus();
    });
  });
  document.querySelector('#gallery-close').addEventListener('click', () => gallery.close());
  document.querySelector('#gallery-prev').addEventListener('click', () => renderPhoto(photoIndex - 1));
  document.querySelector('#gallery-next').addEventListener('click', () => renderPhoto(photoIndex + 1));
  gallery.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      renderPhoto(photoIndex + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  gallery.addEventListener('click', event => {
    if (event.target !== gallery) return;
    const rect = gallery.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) gallery.close();
  });
  gallery.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    galleryTrigger?.focus({ preventScroll: true });
  });
  let touchStart = null;
  galleryImage.addEventListener('touchstart', event => {
    touchStart = { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
  }, { passive: true });
  galleryImage.addEventListener('touchend', event => {
    if (!touchStart) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) renderPhoto(photoIndex + (dx < 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });

  // Keep section links useful when their content is collapsed.
  function revealDetails(hash = window.location.hash) {
    const target = document.getElementById(hash.slice(1));
    const details = target?.closest('details');
    if (details) details.open = true;
  }
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', () => revealDetails(link.getAttribute('href')));
  });
  window.addEventListener('hashchange', () => revealDetails());
  revealDetails();
})();
