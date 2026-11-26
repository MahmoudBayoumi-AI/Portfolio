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
  const savedTheme = 'dark'; // always open in dark mode
  htmlElement.setAttribute('data-theme', savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = htmlElement.getAttribute('data-theme') || 'dark';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      htmlElement.setAttribute('data-theme', newTheme);
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
  const isTouchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  function smoothScrollToTarget(targetY, duration = 850) {
    const startY = window.pageYOffset;

    if (prefersReduced) {
      window.scrollTo(0, targetY);
      return;
    }

    // Phones: the browser's own smooth scroll (starts immediately, no JS per frame).
    // For long distances, jump close to the target first and glide only the last part.
    if (isTouchDevice) {
      const maxGlide = window.innerHeight * 1.5;
      if (Math.abs(targetY - startY) > maxGlide) {
        window.scrollTo(0, targetY + (startY < targetY ? -maxGlide : maxGlide));
      }
      window.scrollTo({ top: targetY, behavior: 'smooth' });
      return;
    }

    // Desktop: the animated scroll as before
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
     - one tap opens / closes (the icon element is never replaced, so the
       "click outside" check can no longer close the menu by mistake)
     - page behind the open menu cannot be scrolled
  ------------------------------------------------------------- */
  const menuToggle = $('#menuToggle');
  const navMenu = $('#navMenu');
  const rootEl = document.documentElement;

  function setMenu(open) {
    if (!menuToggle || !navMenu) return;
    navMenu.classList.toggle('open', open);
    rootEl.classList.toggle('menu-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    const icon = menuToggle.querySelector('i');
    if (icon) icon.className = open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars-staggered';
  }

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      setMenu(!navMenu.classList.contains('open'));
    });

    // choosing a section (or tapping the logo) closes the menu
    $$('.nav-link', navMenu).forEach(link => {
      link.addEventListener('click', () => setMenu(false));
    });
    const logoLink = $('.logo');
    if (logoLink) logoLink.addEventListener('click', () => setMenu(false));

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') setMenu(false);
    });

    // leaving the mobile layout (rotate / resize) closes the menu
    const desktopQuery = window.matchMedia('(min-width: 961px)');
    const onLayoutChange = e => { if (e.matches) setMenu(false); };
    if (desktopQuery.addEventListener) desktopQuery.addEventListener('change', onLayoutChange);
    else if (desktopQuery.addListener) desktopQuery.addListener(onLayoutChange);

    // keep the page still while the menu is open (older iOS ignores overflow:hidden)
    document.addEventListener('touchmove', e => {
      if (!navMenu.classList.contains('open')) return;
      const menuScrolls = navMenu.scrollHeight > navMenu.clientHeight;
      if (navMenu.contains(e.target) && menuScrolls) return;
      e.preventDefault();
    }, { passive: false });
  }

  /* -------------------------------------------------------------
     5. Scroll Spy, Header State & Back-to-Top Button
  ------------------------------------------------------------- */
  const siteHeader = $('.site-header');
  const pageProgress = $('#pageProgress');
  const backToTopBtn = $('#backToTop');
  const sections = $$('main section[id]');
  const navItems = $$('.nav-link');

  // Positions are measured once (not on every scroll event)
  let sectionTops = [];
  let maxScroll = 1;
  let lastActive = '';
  let ticking = false;

  function measure() {
    const y = window.pageYOffset;
    sectionTops = sections.map(sec => {
      const r = sec.getBoundingClientRect();
      return { id: sec.id, top: r.top + y, bottom: r.bottom + y };
    });
    maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }

  function update() {
    ticking = false;
    const y = window.pageYOffset;

    if (siteHeader) {
      siteHeader.classList.toggle('scrolled', y > 30);
    }

    if (backToTopBtn) {
      backToTopBtn.classList.toggle('show', y > 400);
    }

    if (pageProgress) {
      pageProgress.style.transform = `scaleX(${Math.min(1, Math.max(0, y / maxScroll))})`;
    }

    const probe = y + 180;
    const active = sectionTops.find(s => s.top <= probe && s.bottom >= probe);
    if (active && active.id !== lastActive) {
      lastActive = active.id;
      navItems.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${active.id}`);
      });
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  measure();
  window.addEventListener('load', measure);
  window.addEventListener('resize', measure);
  setTimeout(measure, 1500);   // after images / fonts finish loading

  window.addEventListener('scroll', onScroll, { passive: true });
  update();

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', event => {
      event.preventDefault();
      smoothScrollToTarget(0, 900);
    });
  }

  /* -------------------------------------------------------------
     5b. Language Switcher (English default / Arabic with RTL)
     - The page ALWAYS opens in English.
     - Arabic can be opened by the toggle button, or by a link ending in ?lang=ar
     - All texts live in translations.js
  ------------------------------------------------------------- */
  const I18N = window.I18N || {};
  const langToggleBtn = $('#langToggle');
  let currentLang = 'en';
  let restartTypewriter = () => {};

  function t(key) {
    const dict = I18N[currentLang] || {};
    return dict[key] !== undefined ? dict[key] : (I18N.en || {})[key];
  }

  function applyLanguage(lang, isInitial = false) {
    currentLang = I18N[lang] ? lang : 'en';
    const root = document.documentElement;
    root.setAttribute('lang', currentLang);
    root.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');

    // Initial English load: the HTML already contains the English text.
    if (!(isInitial && currentLang === 'en')) {
      $$('[data-i18n]').forEach(el => {
        const value = t(el.dataset.i18n);
        if (value !== undefined) el.innerHTML = value;
      });
      $$('[data-i18n-placeholder]').forEach(el => {
        const value = t(el.dataset.i18nPlaceholder);
        if (value !== undefined) el.setAttribute('placeholder', value);
      });
      $$('[data-i18n-alt]').forEach(el => {
        const value = t(el.dataset.i18nAlt);
        if (value !== undefined) el.setAttribute('alt', value);
      });
      // Service cards that are currently expanded keep the "Show less" label
      $$('.service-card.open .learn-more span').forEach(label => {
        label.textContent = t('ui.showLess');
      });
      const metaDescription = $('meta[name="description"]');
      if (metaDescription && t('meta.description')) metaDescription.setAttribute('content', t('meta.description'));
      if (t('meta.title')) document.title = t('meta.title');
    }

    if (langToggleBtn) {
      langToggleBtn.textContent = t('ui.langButton');
      langToggleBtn.setAttribute('title', t('ui.langTitle'));
      langToggleBtn.setAttribute('lang', currentLang === 'ar' ? 'en' : 'ar');
    }

    restartTypewriter();
  }

  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
      applyLanguage(currentLang === 'ar' ? 'en' : 'ar');
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
  const getTitles = () => t('ui.titles') || ['Data Scientist'];

  if (rotatingTitle) {
    let wordIdx = 0;
    let charIdx = 0;
    let isDeleting = false;
    const typeSpeed = 75;
    const deleteSpeed = 40;
    const holdTime = 2000;

    restartTypewriter = () => {
      wordIdx = 0;
      charIdx = 0;
      isDeleting = false;
    };

    function runTypewriter() {
      const titlesList = getTitles();
      const currentFullText = titlesList[wordIdx % titlesList.length];

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

      element.textContent = value.toLocaleString('en-US');

      if (progress < 1) {
        requestAnimationFrame(updateNumber);
      } else {
        element.textContent = targetNumber.toLocaleString('en-US');
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
      counter.textContent = Number(counter.dataset.target || 0).toLocaleString('en-US');
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
      if (label) label.textContent = isOpened ? t('ui.showLess') : t('ui.learnMore');
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
          formStatus.textContent = t('ui.formInvalid');
          formStatus.style.color = '#f87171';
        }
        contactForm.reportValidity();
        return;
      }

      if (formStatus) {
        formStatus.textContent = t('ui.formOk');
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
  /* -------------------------------------------------------------
     12. Initial language (always English unless the link has ?lang=ar)
  ------------------------------------------------------------- */
  const urlLang = new URLSearchParams(window.location.search).get('lang');
  applyLanguage(urlLang === 'ar' ? 'ar' : 'en', true);
});
