/**
 * Modern Interactive Portfolio Scripts
 * Author: Mahmoud Bayoumi
 */

document.addEventListener('DOMContentLoaded', () => {
  // Helper selectors
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -------------------------------------------------------------
     1. Theme Management (Dark Mode Default + Light Mode Support)
  ------------------------------------------------------------- */
  const themeToggleBtn = $('#themeToggle');
  const htmlElement = document.documentElement;

  // Retrieve saved theme or default to dark
  const savedTheme = localStorage.getItem('theme') || 'dark';
  htmlElement.setAttribute('data-theme', savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = htmlElement.getAttribute('data-theme') || 'dark';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      htmlElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
    });
  }

  /* -------------------------------------------------------------
     2. Reveal On Scroll with Bulletproof Fallback
  ------------------------------------------------------------- */
  const revealElements = $$('.reveal');

  function makeAllElementsVisible() {
    revealElements.forEach(el => el.classList.add('visible'));
  }

  if (prefersReduced || !('IntersectionObserver' in window)) {
    makeAllElementsVisible();
  } else {
    document.documentElement.classList.add('js-ready');

    const scrollObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -25px 0px'
      }
    );

    revealElements.forEach(el => scrollObserver.observe(el));
    setTimeout(makeAllElementsVisible, 2000);
  }

  /* -------------------------------------------------------------
     3. Smooth Animated Scroll (Nav Links & Back to Top)
  ------------------------------------------------------------- */
  function smoothScrollToTarget(targetY, duration = 850) {
    const startY = window.pageYOffset;
    const distance = targetY - startY;
    let startTime = null;

    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animationLoop(currentTime) {
      if (!startTime) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);

      window.scrollTo(0, startY + distance * easedProgress);

      if (progress < 1) {
        requestAnimationFrame(animationLoop);
      }
    }

    requestAnimationFrame(animationLoop);
  }

  $$('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', event => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#' || targetId === '#top') {
        event.preventDefault();
        smoothScrollToTarget(0, 800);
        if (history.replaceState) history.replaceState(null, '', ' ');
        return;
      }

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        event.preventDefault();
        const headerOffset = 75;
        const targetPosition = targetEl.getBoundingClientRect().top + window.pageYOffset - headerOffset;
        smoothScrollToTarget(targetPosition, 850);
        if (history.replaceState) history.replaceState(null, '', targetId);
      }
    });
  });

  /* -------------------------------------------------------------
     4. Mobile Navigation Menu
  ------------------------------------------------------------- */
  const menuToggle = $('#menuToggle');
  const navLinks = $('#navLinks');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      const isOpened = navLinks.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(isOpened));
      menuToggle.innerHTML = isOpened 
        ? '<i class="fa-solid fa-xmark"></i>' 
        : '<i class="fa-solid fa-bars-staggered"></i>';
    });

    $$('.nav-link', navLinks).forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.innerHTML = '<i class="fa-solid fa-bars-staggered"></i>';
      });
    });

    document.addEventListener('click', e => {
      if (!navLinks.contains(e.target) && !menuToggle.contains(e.target) && navLinks.classList.contains('open')) {
        navLinks.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.innerHTML = '<i class="fa-solid fa-bars-staggered"></i>';
      }
    });
  }

  /* -------------------------------------------------------------
     5. Scroll Spy, Header State & Back-to-Top Button
  ------------------------------------------------------------- */
  const siteHeader = $('.site-header');
  const pageProgress = $('#pageProgress');
  const backToTopBtn = $('#backToTop');
  const sections = $$('main section[id]');
  const navItems = $$('.nav-link');

  function onScroll() {
    const currentScrollY = window.pageYOffset;

    if (siteHeader) {
      siteHeader.classList.toggle('scrolled', currentScrollY > 30);
    }

    if (backToTopBtn) {
      backToTopBtn.classList.toggle('show', currentScrollY > 400);
    }

    if (pageProgress) {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progressPercent = maxScroll > 0 ? (currentScrollY / maxScroll) * 100 : 0;
      pageProgress.style.width = `${Math.min(100, Math.max(0, progressPercent))}%`;
    }

    const activeSection = sections.find(sec => {
      const rect = sec.getBoundingClientRect();
      return rect.top <= 180 && rect.bottom >= 180;
    });

    if (activeSection) {
      navItems.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${activeSection.id}`);
      });
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', event => {
      event.preventDefault();
      smoothScrollToTarget(0, 900);
    });
  }

  /* -------------------------------------------------------------
     6. Guaranteed Specialization Typewriter Animation
     Cycles through:
     1) Data Scientist
     2) Data Analyst
     3) ML Engineer
     4) Aviation Data Specialist
  ------------------------------------------------------------- */
  const rotatingTitle = $('#rotatingTitle');
  const titlesList = [
    'Data Scientist',
    'Data Analyst',
    'ML Engineer',
    'Aviation Data Specialist'
  ];

  if (rotatingTitle) {
    let wordIdx = 0;
    let charIdx = 0;
    let isDeleting = false;
    const typeSpeed = 75;
    const deleteSpeed = 40;
    const holdTime = 2000;

    function runTypewriter() {
      const currentFullText = titlesList[wordIdx];

      if (!isDeleting) {
        // Typing characters
        charIdx++;
        rotatingTitle.textContent = currentFullText.substring(0, charIdx);

        if (charIdx >= currentFullText.length) {
          isDeleting = true;
          setTimeout(runTypewriter, holdTime);
          return;
        }
        setTimeout(runTypewriter, typeSpeed);
      } else {
        // Deleting characters
        charIdx--;
        rotatingTitle.textContent = currentFullText.substring(0, charIdx);

        if (charIdx <= 0) {
          isDeleting = false;
          wordIdx = (wordIdx + 1) % titlesList.length;
          setTimeout(runTypewriter, 300);
          return;
        }
        setTimeout(runTypewriter, deleteSpeed);
      }
    }

    // Start immediately
    setTimeout(runTypewriter, 500);
  }

  /* -------------------------------------------------------------
     7. Guaranteed Testimonials Autoplay Carousel (Sliding smoothly)
  ------------------------------------------------------------- */
  const testimonialTrack = $('#testimonialTrack');
  const prevTestimonialBtn = $('#prevTestimonial');
  const nextTestimonialBtn = $('#nextTestimonial');
  const bulletsContainer = $('#carouselBullets');
  const carouselViewport = $('#carouselViewport');

  if (testimonialTrack) {
    const slides = $$('.testimonial-slide', testimonialTrack);
    const totalSlides = slides.length;
    let currentSlideIndex = 0;
    let autoplayInterval = null;

    // Build bullets dynamically
    if (bulletsContainer && totalSlides > 0) {
      bulletsContainer.innerHTML = slides
        .map((_, i) => `<button class="bullet-dot ${i === 0 ? 'active' : ''}" data-index="${i}" aria-label="Slide ${i + 1}"></button>`)
        .join('');
    }

    const bullets = $$('.bullet-dot', bulletsContainer);

    function updateCarouselPosition(index) {
      currentSlideIndex = (index + totalSlides) % totalSlides;
      testimonialTrack.style.transform = `translateX(-${currentSlideIndex * 100}%)`;

      bullets.forEach((bullet, idx) => {
        bullet.classList.toggle('active', idx === currentSlideIndex);
      });
    }

    function startTestimonialsAutoplay() {
      stopTestimonialsAutoplay();
      if (totalSlides > 1) {
        autoplayInterval = setInterval(() => {
          updateCarouselPosition(currentSlideIndex + 1);
        }, 4500); // Advances automatically every 4.5 seconds
      }
    }

    function stopTestimonialsAutoplay() {
      if (autoplayInterval) {
        clearInterval(autoplayInterval);
        autoplayInterval = null;
      }
    }

    // Controls listeners
    if (nextTestimonialBtn) {
      nextTestimonialBtn.addEventListener('click', () => {
        updateCarouselPosition(currentSlideIndex + 1);
        startTestimonialsAutoplay();
      });
    }

    if (prevTestimonialBtn) {
      prevTestimonialBtn.addEventListener('click', () => {
        updateCarouselPosition(currentSlideIndex - 1);
        startTestimonialsAutoplay();
      });
    }

    bullets.forEach(bullet => {
      bullet.addEventListener('click', () => {
        const slideIdx = parseInt(bullet.dataset.index, 10);
        updateCarouselPosition(slideIdx);
        startTestimonialsAutoplay();
      });
    });

    // Pause autoplay on mouse hover or mobile touch
    if (carouselViewport) {
      carouselViewport.addEventListener('mouseenter', stopTestimonialsAutoplay);
      carouselViewport.addEventListener('mouseleave', startTestimonialsAutoplay);
      carouselViewport.addEventListener('touchstart', stopTestimonialsAutoplay, { passive: true });
      carouselViewport.addEventListener('touchend', startTestimonialsAutoplay, { passive: true });
    }

    // Initialize first position and run autoplay immediately
    updateCarouselPosition(0);
    startTestimonialsAutoplay();
  }

  /* -------------------------------------------------------------
     8. Stats Number Counter with Easing
  ------------------------------------------------------------- */
  const counterElements = $$('.counter');

  function animateNumber(element) {
    const targetNumber = Number(element.dataset.target || 0);
    const duration = 1600;
    const startTime = performance.now();

    function updateNumber(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentProgress = 1 - (1 - progress) * (1 - progress);
      const value = Math.floor(targetNumber * currentProgress);

      element.textContent = value.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(updateNumber);
      } else {
        element.textContent = targetNumber.toLocaleString();
      }
    }

    requestAnimationFrame(updateNumber);
  }

  if ('IntersectionObserver' in window && !prefersReduced) {
    const counterObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateNumber(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    counterElements.forEach(counter => counterObserver.observe(counter));
  } else {
    counterElements.forEach(counter => {
      counter.textContent = Number(counter.dataset.target || 0).toLocaleString();
    });
  }

  /* -------------------------------------------------------------
     9. Services Accordion
  ------------------------------------------------------------- */
  $$('.learn-more').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.service-card');
      if (!card) return;
      const isOpened = card.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(isOpened));
      const label = btn.querySelector('span');
      if (label) label.textContent = isOpened ? 'Show less' : 'Learn more';
    });
  });

  /* -------------------------------------------------------------
     10. Contact Form Simulation
  ------------------------------------------------------------- */
  const contactForm = $('#contactForm');
  const formStatus = $('#formStatus');

  if (contactForm) {
    contactForm.addEventListener('submit', e => {
      e.preventDefault();

      if (!contactForm.checkValidity()) {
        if (formStatus) {
          formStatus.textContent = 'Please fill out all required fields with valid details.';
          formStatus.style.color = '#f87171';
        }
        contactForm.reportValidity();
        return;
      }

      if (formStatus) {
        formStatus.textContent = 'Thank you! Your message has been sent successfully.';
        formStatus.style.color = 'var(--primary)';
      }

      contactForm.reset();
    });
  }

  /* -------------------------------------------------------------
     11. Ambient Cursor Tracker
  ------------------------------------------------------------- */
  const cursorGlow = $('#cursorGlow');

  if (cursorGlow && !prefersReduced) {
    window.addEventListener(
      'pointermove',
      e => {
        cursorGlow.style.left = `${e.clientX}px`;
        cursorGlow.style.top = `${e.clientY}px`;
      },
      { passive: true }
    );
  }
});
