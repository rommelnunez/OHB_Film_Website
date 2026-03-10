// DOM Elements
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.querySelector('.lightbox-image');
const videoLightbox = document.getElementById('video-lightbox');
const videoLightboxContainer = document.querySelector('.video-lightbox-container');

// ===================================
// MASTER CLOSE FUNCTION
// ===================================
let closeAllLightboxes = () => {
  // Main Lightbox
  if (lightbox) {
    lightbox.classList.remove('active');
    lightbox.classList.remove('zoomed-mode');
    if (lightboxImage) {
      lightboxImage.style.display = 'none';
      lightboxImage.src = '';
    }
  }
  document.body.style.overflow = '';

  // Video Lightbox
  if (videoLightbox) videoLightbox.classList.remove('active');
  if (videoLightboxContainer) videoLightboxContainer.innerHTML = '';
};

// ===================================
// EVENT LISTENERS - LIGHTBOX CLOSE
// ===================================

// 1. Close Buttons (All instances)
document.querySelectorAll('.lightbox-close').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllLightboxes();
  });
});

// 2. Background Click Close
if (lightbox) {
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target.classList.contains('lightbox-content')) closeAllLightboxes();
  });
}
if (videoLightbox) {
  videoLightbox.addEventListener('click', (e) => {
    if (e.target === videoLightbox) closeAllLightboxes();
  });
}

// 3. Nav Link Auto-Close
document.querySelectorAll('.header-nav a').forEach(link => {
  link.addEventListener('click', closeAllLightboxes);
});

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
        const navHeight = document.querySelector('nav') ? document.querySelector('nav').offsetHeight : 0;
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

  if (nav) {
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
  }

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

    const heroSection = document.querySelector('#hero');
    if (heroSection) observer.observe(heroSection);
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
  // HAMBURGER MENU TOGGLE
  // ===================================
  const hamburger = document.querySelector('.hamburger');
  const headerNav = document.querySelector('.header-nav');
  const v2Header = document.querySelector('.v2-header');

  if (hamburger && headerNav && v2Header) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      headerNav.classList.toggle('active');
      v2Header.classList.toggle('nav-active');
    });

    //  Close nav when link clicked
    headerNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        headerNav.classList.remove('active');
        v2Header.classList.remove('nav-active');
      });
    });
  }

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
// BIO LIGHTBOX LOGIC
// ===================================
const castMemberCards = document.querySelectorAll('.cast-member-card');
if (castMemberCards.length > 0) {
  castMemberCards.forEach(card => {
    card.addEventListener('click', function () {
      const bioHTML = this.querySelector('.hidden-bio').innerHTML;

      // Headshot Background Feature: Add active class and set background
      const headshot = this.querySelector('.cast-headshot-square img');
      if (headshot) {
        // Toggle active class
        this.classList.toggle('active');

        // Set background image when active
        if (this.classList.contains('active')) {
          this.style.backgroundImage = `url('${headshot.src}')`;
        } else {
          this.style.backgroundImage = '';
        }
      }

      if (lightbox) {
        lightbox.classList.add('active');
        // Hide other content
        if (lightboxImage) lightboxImage.style.display = 'none';

        // Create or reuse bio container
        let bioContainer = lightbox.querySelector('.bio-content');
        if (!bioContainer) {
          bioContainer = document.createElement('div');
          bioContainer.className = 'bio-content';
          lightbox.querySelector('.lightbox-content').appendChild(bioContainer);
        }

        // Restructure Bio for Scrollability
        const hiddenBio = this.querySelector('.hidden-bio');
        const name = hiddenBio.querySelector('h3').innerText;
        const role = hiddenBio.querySelector('h4').innerText;
        const bioText = hiddenBio.querySelector('p').innerHTML;

        bioContainer.innerHTML = `
          <div class="bio-header">
            <h3>${name}</h3>
            <h4>${role}</h4>
          </div>
          <div class="bio-body">
            <p>${bioText}</p>
          </div>
        `;
        bioContainer.style.display = 'flex';
        bioContainer.style.flexDirection = 'column';

        document.body.style.overflow = 'hidden';
      }
    });
  });
}

// Close Bio on Lightbox Close
const originalCloseAll = closeAllLightboxes;
closeAllLightboxes = function () {
  originalCloseAll();
  const bioContainer = document.querySelector('.bio-content');
  if (bioContainer) bioContainer.style.display = 'none';
};

// ===================================
// POSTER LIGHTBOX
// ===================================
const posterTrigger = document.getElementById('poster-trigger');

if (posterTrigger && lightbox && lightboxImage) {
  posterTrigger.addEventListener('click', function (e) {
    e.preventDefault();
    lightbox.classList.add('active');
    const src = this.getAttribute('src');
    if (lightboxImage.src !== src) {
      lightboxImage.src = src;
      lightboxImage.style.display = 'block';
    }
    document.body.style.overflow = 'hidden';
  });
}

// ===================================
// VIDEO FACADE & VIDEO LIGHTBOX
// ===================================
const videoFacades = document.querySelectorAll('.video-facade');
if (videoFacades.length > 0) {
  videoFacades.forEach(facade => {
    facade.addEventListener('click', function () {
      // Burst effect
      const playBtn = this.querySelector('.play-button');
      if (playBtn) {
        playBtn.classList.add('clicked');
        setTimeout(() => { playBtn.classList.remove('clicked'); }, 600);
      }

      const videoId = this.getAttribute('data-video-id');
      if (videoId) {
        videoLightbox.classList.add('active');
        const iframe = document.createElement('iframe');
        iframe.setAttribute('width', '100%');
        iframe.setAttribute('height', '100%');
        iframe.setAttribute('src', `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`);
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allowfullscreen', 'true');
        if (videoLightboxContainer) {
          videoLightboxContainer.innerHTML = '';
          videoLightboxContainer.appendChild(iframe);
        }
        document.body.style.overflow = 'hidden';
      }
    });
  });
}
