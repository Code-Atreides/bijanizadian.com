'use strict';
(() => {
  const isNewYork = document.body.dataset.location === 'new-york';
  const photos = isNewYork ? [
    ['photo-1', 'The loft, after hours.', 'Open loft living space with lounge seating and colorful lighting'],
    ['photo-2', 'A place to settle in.', 'Primary bedroom with exposed brick and pink bedside lighting'],
    ['photo-5', 'Conversations, in good company.', 'Two guests recording a podcast in the loft studio'],
    ['photo-3', 'The en suite.', 'Tiled en suite bathroom with a floating vanity'],
    ['photo-4', 'The details, considered.', 'Glass shower in the loft bathroom']
  ] : [
    ['living-dusk', 'The A-frame, at dusk.', 'Glass-fronted A-frame living room opening onto the terrace at sunset'],
    ['terrace-dusk', 'The city, from here.', 'Outdoor lounge terrace overlooking Los Angeles at sunset'],
    ['exterior-dusk', 'An unmistakable silhouette.', 'A-frame architecture above the curved lower level at dusk'],
    ['pool', 'A moment by the pool.', 'Private swimming pool beside the house'],
    ['living-dining', 'Space to bring people together.', 'Open living and dining room with a tall A-frame ceiling'],
    ['panoramic-suite', 'A different perspective.', 'Spacious lower-level suite with a curved glass wall and city views'],
    ['kitchen', 'Where the evening begins.', 'Renovated kitchen connecting to the main living space'],
    ['aerial', 'The whole picture.', 'Overhead listing photograph showing the home, terraces, and pool']
  ];
  const media = photos.map(([file, caption, alt]) => ({
    type: 'image', caption, alt,
    src: isNewYork ? `/housepitch/images/tribeca/${file}.webp` : `/housepitch/images/${file}-clean.jpg`
  }));
  if (isNewYork) media.push(
    { type: 'video', src: '/housepitch/media/tribeca-podcast.mp4', poster: '/housepitch/images/tribeca/video-poster.jpg', caption: 'Conversations at the loft · Chipped × Bran', alt: 'Chipped and Bran podcast clip at the Tribeca loft' },
    { type: 'video', src: '/housepitch/media/tribeca-loft.mp4', poster: '/housepitch/images/tribeca/loft-video-poster.jpg', caption: 'Inside the loft · A walkthrough', alt: 'Walkthrough of the Tribeca loft' },
    { type: 'video', src: '/housepitch/media/tribeca-riki-2.mp4', poster: '/housepitch/images/tribeca/riki-2-video-poster.jpg', caption: 'Olivia & Tabs · Riki #2', alt: 'Olivia and Tabs, Riki clip number two' }
  );
  const gallery = document.querySelector('#gallery');
  const galleryImage = document.querySelector('#gallery-image');
  const galleryVideo = document.querySelector('#gallery-video');
  const galleryCredit = document.querySelector('.viewer-credit');
  const photoCredit = galleryCredit.textContent;
  let photoIndex = 0;
  let galleryTrigger;
  function renderPhoto(index) {
    photoIndex = (index + media.length) % media.length;
    const item = media[photoIndex];
    if (galleryVideo) {
      galleryVideo.pause();
      galleryVideo.hidden = item.type !== 'video';
      if (item.type === 'video') {
        galleryVideo.poster = item.poster;
        galleryVideo.src = item.src;
        galleryVideo.setAttribute('aria-label', item.alt);
      } else {
        galleryVideo.removeAttribute('src');
      }
      galleryVideo.load();
    }
    galleryImage.hidden = item.type === 'video';
    if (item.type === 'image') {
      galleryImage.src = item.src;
      galleryImage.alt = item.alt;
    }
    galleryCredit.textContent = item.type === 'video' ? 'Video supplied for this proposal' : photoCredit;
    document.querySelector('#gallery-caption').textContent = item.caption;
    document.querySelector('#gallery-counter').textContent = `${String(photoIndex + 1).padStart(2, '0')} / ${String(media.length).padStart(2, '0')}`;
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
    if (event.target.closest('video')) return;
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
    galleryVideo?.pause();
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
