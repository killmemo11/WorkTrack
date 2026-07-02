/* Landing JS extracted from landing/index.html */
(function () {
  // Navbar scroll effect
  const navbar = document.querySelector('.navbar-landing');
  if (navbar) {
    window.addEventListener('scroll', function () {
      navbar.classList.toggle('scrolled', window.scrollY > 20);
    });
  }

  // Scroll reveal (IntersectionObserver for better performance)
  const revealEls = Array.from(document.querySelectorAll('.fade-up'));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        }
      },
      { root: null, threshold: 0.15 }
    );

    revealEls.forEach((el) => io.observe(el));
  } else {
    // Fallback
    const reveal = () => {
      revealEls.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight - 60) el.classList.add('visible');
      });
    };
    window.addEventListener('scroll', reveal);
    window.addEventListener('load', reveal);
    reveal();
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      const target = href ? document.querySelector(href) : null;
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // FAQ Toggle (click + keyboard)
  const faqItems = Array.from(document.querySelectorAll('.faq-item'));
  faqItems.forEach((item) => {
    const q = item.querySelector('.question');
    if (!q) return;

    // Make focusable for keyboard users
    q.setAttribute('role', 'button');
    q.setAttribute('tabindex', '0');
    q.setAttribute('aria-expanded', item.classList.contains('active') ? 'true' : 'false');

    const toggle = () => {
      const isActive = item.classList.contains('active');
      faqItems.forEach((i) => {
        i.classList.remove('active');
        const qi = i.querySelector('.question');
        if (qi) qi.setAttribute('aria-expanded', 'false');
      });
      if (!isActive) {
        item.classList.add('active');
        q.setAttribute('aria-expanded', 'true');
      }
    };

    q.addEventListener('click', toggle);
    q.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });

  // Contact form
  const form = document.getElementById('contactForm');
  const feedback = document.getElementById('formFeedback');
  if (form && feedback) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      if (!btn) return;

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Sending...';
      feedback.style.display = 'none';
      feedback.className = '';
      feedback.textContent = '';

      // Client-side validation (basic)
      const data = Object.fromEntries(new FormData(form));
      if (!data.name || !data.email || !data.message) {
        feedback.style.display = 'block';
        feedback.className = 'text-center text-danger fw600';
        feedback.textContent = 'Please fill all required fields.';
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-send me-2"></i>Send Message';
        return;
      }

      try {
        const res = await fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        let payload = null;
        try {
          payload = await res.json();
        } catch (_) {
          payload = null;
        }

        feedback.style.display = 'block';
        if (res.ok) {
          feedback.className = 'text-center text-success fw600';
          feedback.textContent = "Thank you! We'll get back to you within 24 hours.";
          form.reset();
        } else {
          feedback.className = 'text-center text-danger fw600';
          feedback.textContent = (payload && payload.error) ? payload.error : 'Something went wrong. Please try again.';
        }
      } catch (err) {
        feedback.style.display = 'block';
        feedback.className = 'text-center text-danger fw600';
        feedback.textContent = 'Network error. Please try again later.';
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-send me-2"></i>Send Message';
      }
    });
  }
})();

