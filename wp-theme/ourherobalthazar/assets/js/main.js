// ===================================
// SMOOTH SCROLL NAVIGATION
// ===================================

document.addEventListener('DOMContentLoaded', function() {
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
    emailForm.addEventListener('submit', function(e) {
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
    item.addEventListener('click', function() {
      // TODO: Implement lightbox modal for full-size image viewing
      console.log('Gallery item clicked');
    });
  });

  // ===================================
  // NAVIGATION SCROLL EFFECT
  // ===================================

  let lastScroll = 0;
  const nav = document.querySelector('nav');
  
  window.addEventListener('scroll', function() {
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
    btn.addEventListener('click', function() {
      const btnText = this.textContent.trim();
      console.log('CTA clicked:', btnText);
      
      // TODO: Send to analytics
      // gtag('event', 'cta_click', { 'button_text': btnText });
    });
  });

  // Track trailer plays
  // TODO: Implement YouTube API event tracking for play/pause/complete

  console.log('Our Hero, Balthazar website initialized');
});
