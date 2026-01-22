// ===================================
// SMOOTH SCROLL NAVIGATION
// ===================================

document.addEventListener('DOMContentLoaded', function () {
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const navHeight = document.querySelector('nav').offsetHeight;
        const targetPosition = target.offsetTop - navHeight;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // ===================================
  // EMAIL FORM HANDLING
  // ===================================

  const emailForm = document.querySelector('form');
  if (emailForm) {
    emailForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const emailInput = this.querySelector('input[type="email"]');
      const email = emailInput.value;

      // TODO: Integrate with email service (Mailchimp, etc.)
      console.log('Email submitted:', email);

      // Show success message (temporary)
      alert('Thank you for subscribing!');
      emailInput.value = '';
    });
  }

  // ===================================
  // GALLERY LIGHTBOX
  // ===================================

  const galleryItems = document.querySelectorAll('.gallery-item');

  galleryItems.forEach(item => {
    item.addEventListener('click', function () {
      // TODO: Implement lightbox modal for full-size image viewing
      console.log('Gallery item clicked');
    });
  });

  // ===================================
  // NAVIGATION SCROLL EFFECT
  // ===================================

  let lastScroll = 0;
  const nav = document.querySelector('nav');

  window.addEventListener('scroll', function () {
    const currentScroll = window.pageYOffset;

    // Add shadow on scroll
    if (currentScroll > 10) {
      nav.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
    } else {
      nav.style.boxShadow = 'none';
    }

    lastScroll = currentScroll;
  });

  // ===================================
  // LAZY LOAD TRAILER
  // ===================================

  // Update trailer iframe src when user scrolls to hero section
  const trailerIframe = document.querySelector('.trailer-container iframe');

  if (trailerIframe) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && trailerIframe.src === 'about:blank') {
          // TODO: Replace with actual YouTube embed URL
          // trailerIframe.src = 'https://www.youtube.com/embed/VIDEO_ID';
          console.log('Trailer section visible - ready to load video');
        }
      });
    }, {
      threshold: 0.5
    });

    observer.observe(document.querySelector('#hero'));
  }

  // ===================================
  // ANALYTICS TRACKING
  // ===================================

  // Track CTA clicks
  document.querySelectorAll('.btn-primary').forEach(btn => {
    btn.addEventListener('click', function () {
      const btnText = this.textContent.trim();
      console.log('CTA clicked:', btnText);

      // TODO: Send to analytics
      // gtag('event', 'cta_click', { 'button_text': btnText });
    });
  });

  // ===================================
  // HERO SLIDESHOW
  // ===================================

  const slides = document.querySelectorAll('.hero-slide');
  if (slides.length > 0) {
    let currentSlide = 0;
    const slideInterval = 2500; // 2.5 seconds

    const nextSlide = () => {
      // Remove active class from current slide
      slides[currentSlide].classList.remove('active');

      // Calculate next slide index
      currentSlide = (currentSlide + 1) % slides.length;

      // Add active class to next slide
      slides[currentSlide].classList.add('active');
    };

    // Start interval
    setInterval(nextSlide, slideInterval);
  }

  // ===================================
  // MOBILE CAST BIOS (TAP TO REVEAL)
  // ===================================

  // Mobile Cast Bios logic removed (consolidated below)

  // ===================================
  // CAST BIOS (Expandable)
  // ===================================
  const castCards = document.querySelectorAll('.cast-card, .cast-row.cast-card');

  if (castCards.length > 0) {
    castCards.forEach(card => {
      card.addEventListener('click', function (e) {
        // Prevent double firing if clicking internal interactive elements (like links)
        if (e.target.tagName === 'A') return;

        console.log('Cast card clicked:', this);

        // Accordion Logic: Close others
        // If we are opening this card (it's not active), close others.
        if (!this.classList.contains('active')) {
          castCards.forEach(c => c.classList.remove('active'));
          this.classList.add('active');
        } else {
          // If we are clicking an already active card, close it
          this.classList.remove('active');
        }
      });
    });
  }

  // Track trailer plays
  // TODO: Implement YouTube API event tracking for play/pause/complete

  console.log('Our Hero, Balthazar website initialized');
});

// ===================================
// POSTER LIGHTBOX
// ===================================

const posterTrigger = document.getElementById('poster-trigger');
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.querySelector('.lightbox-image');
const lightboxClose = document.querySelector('.lightbox-close');

if (posterTrigger && lightbox && lightboxImage) {
  posterTrigger.addEventListener('click', function (e) {
    e.preventDefault(); // Prevent default link behavior if any
    lightbox.classList.add('active');
    const src = this.getAttribute('src');
    if (lightboxImage.src !== src) {
      lightboxImage.src = src;
    }
    document.body.style.overflow = 'hidden'; // Disable body scroll
  });

  // Close lightbox
  const closeLightbox = () => {
    lightbox.classList.remove('active');
    lightbox.classList.remove('zoomed-mode');
    lightboxImage.classList.remove('zoomed');
    document.body.style.overflow = ''; // Re-enable body scroll
  };

  lightboxClose.addEventListener('click', closeLightbox);

  // Close on background click (but not on image)
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox || e.target.classList.contains('lightbox-overlay')) {
      closeLightbox();
    }
  });

  // Toggle zoom on image click
  lightboxImage.addEventListener('click', function (e) {
    e.stopPropagation(); // Don't close lightbox
    this.classList.toggle('zoomed');
    lightbox.classList.toggle('zoomed-mode');
  });

  // Allow Escape key to close
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && lightbox.classList.contains('active')) {
      closeLightbox();
    }
  });
}

// ===================================
// VIDEO FACADE (TEASER)
// ===================================

const videoFacades = document.querySelectorAll('.video-facade');

videoFacades.forEach(facade => {
  facade.addEventListener('click', function () {
    const videoId = this.getAttribute('data-video-id');
    if (videoId) {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('width', '100%');
      iframe.setAttribute('height', '100%');
      iframe.setAttribute('src', `https://www.youtube.com/embed/${videoId}?autoplay=1`);
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allowfullscreen', 'true');
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');

      this.innerHTML = ''; // Clear facade
      this.appendChild(iframe);
      this.style.backgroundImage = 'none'; // Remove background
      this.style.cursor = 'default';
    }
  });
});

// ===================================
// VIDEO LIGHTBOX (Updated)
// ===================================

const videoLightbox = document.getElementById('video-lightbox');
const videoLightboxContainer = document.querySelector('.video-lightbox-container');
const videoLightboxClose = document.querySelector('.video-lightbox-close');

if (videoFacades.length > 0 && videoLightbox) {
  videoFacades.forEach(facade => {
    // Remove old inline logic
    facade.onclick = null;

    facade.addEventListener('click', function (e) {
      // Add burst effect
      const playBtn = this.querySelector('.play-button');
      if (playBtn) {
        playBtn.classList.add('clicked');
        setTimeout(() => {
          playBtn.classList.remove('clicked');
        }, 600);
      }

      const videoId = this.getAttribute('data-video-id');
      if (videoId) {
        setTimeout(() => {
          videoLightbox.classList.add('active');

          const iframe = document.createElement('iframe');
          iframe.setAttribute('width', '100%');
          iframe.setAttribute('height', '100%');
          iframe.setAttribute('src', `https://www.youtube.com/embed/${videoId}?autoplay=1`);
          iframe.setAttribute('frameborder', '0');
          iframe.setAttribute('allowfullscreen', 'true');
          iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');

          videoLightboxContainer.innerHTML = '';
          videoLightboxContainer.appendChild(iframe);
          document.body.style.overflow = 'hidden';
        }, 300); // Wait for burst
      }
    });
  });

  const closeVideoLightbox = () => {
    videoLightbox.classList.remove('active');
    videoLightbox.classList.remove('zoomed-mode');
    videoLightboxContainer.innerHTML = ''; // Stop video
    document.body.style.overflow = '';
  };

  if (videoLightboxClose) {
    videoLightboxClose.addEventListener('click', closeVideoLightbox);
  }

  videoLightbox.addEventListener('click', function (e) {
    if (e.target === videoLightbox) {
      closeVideoLightbox();
    }
  });
}

// Logic moved to DOMContentLoaded block
