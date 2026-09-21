(() => {
  'use strict';

  const root = document.documentElement;
  const header = document.getElementById('siteHeader');
  const nav = document.getElementById('siteNav');
  const menuToggle = document.getElementById('menuToggle');
  const backToTop = document.getElementById('backToTop');
  const scrollProgress = document.getElementById('scrollProgress');
  const year = document.getElementById('currentYear');
  const metaDescription = document.getElementById('metaDescription');
  const languageButtons = Array.from(document.querySelectorAll('[data-set-lang]'));
  const translatable = Array.from(document.querySelectorAll('[data-i18n]'));

  const metaByLanguage = {
    en: 'Fornost Security provides enterprise cybersecurity advisory across strategy, architecture, risk, GRC, cloud, identity, application security, cyber defense and resilience.',
    tr: 'Fornost Security; strateji, mimari, risk, GRC, bulut, kimlik, uygulama güvenliği, siber savunma ve dayanıklılık alanlarında kurumsal siber güvenlik danışmanlığı sunar.'
  };

  const titleByLanguage = {
    en: 'Fornost Security | Enterprise Cybersecurity Advisory',
    tr: 'Fornost Security | Kurumsal Siber Güvenlik Danışmanlığı'
  };

  const validLanguage = (value) => value === 'tr' ? 'tr' : 'en';

  function setLanguage(language, persist = true) {
    const lang = validLanguage(language);
    root.lang = lang;

    translatable.forEach((element) => {
      const value = lang === 'tr' ? element.dataset.tr : element.dataset.en;
      if (typeof value === 'string') {
        element.textContent = value;
      }
    });

    languageButtons.forEach((button) => {
      const active = button.dataset.setLang === lang;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    if (metaDescription) {
      metaDescription.setAttribute('content', metaByLanguage[lang]);
    }
    document.title = titleByLanguage[lang];

    if (menuToggle) {
      menuToggle.setAttribute('aria-label', lang === 'tr' ? 'Menüyü aç' : 'Open navigation');
    }

    if (persist) {
      try {
        localStorage.setItem('fornost-language', lang);
      } catch (_) {
        // Preference persistence is optional.
      }
    }
  }

  function getInitialLanguage() {
    try {
      const saved = localStorage.getItem('fornost-language');
      if (saved === 'tr' || saved === 'en') return saved;
    } catch (_) {
      // Fall through to browser preference.
    }
    return navigator.language && navigator.language.toLowerCase().startsWith('tr') ? 'tr' : 'en';
  }

  languageButtons.forEach((button) => {
    button.addEventListener('click', () => setLanguage(button.dataset.setLang));
  });

  function closeMenu({ restoreFocus = false } = {}) {
    if (!nav || !menuToggle) return;
    nav.classList.remove('open');
    menuToggle.classList.remove('active');
    menuToggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    if (restoreFocus) menuToggle.focus();
  }

  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      const opening = !nav.classList.contains('open');
      nav.classList.toggle('open', opening);
      menuToggle.classList.toggle('active', opening);
      menuToggle.setAttribute('aria-expanded', String(opening));
      document.body.classList.toggle('menu-open', opening);
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => closeMenu());
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('open')) {
        closeMenu({ restoreFocus: true });
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 980) closeMenu();
    });
  }

  function updateScrollState() {
    const top = window.scrollY || document.documentElement.scrollTop;
    if (header) header.classList.toggle('scrolled', top > 12);

    if (scrollProgress) {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const percent = Math.min(100, Math.max(0, (top / max) * 100));
      scrollProgress.style.width = `${percent}%`;
    }
  }

  window.addEventListener('scroll', updateScrollState, { passive: true });
  updateScrollState();

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  const revealItems = Array.from(document.querySelectorAll('.reveal'));
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('revealed'));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealItems.forEach((item) => observer.observe(item));
  }

  if (year) year.textContent = String(new Date().getFullYear());
  setLanguage(getInitialLanguage(), false);
})();
