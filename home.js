const fsBurger = document.querySelector('.fs-burger');
const fsMobile = document.querySelector('.fs-mobile');
const fsMobileLinks = document.querySelectorAll('.fs-mobile a');
const fsRevealItems = document.querySelectorAll('.fs-reveal');

if (fsBurger && fsMobile) {
  fsBurger.addEventListener('click', () => {
    const isOpen = fsMobile.classList.toggle('is-open');
    fsBurger.setAttribute('aria-expanded', String(isOpen));
    fsMobile.setAttribute('aria-hidden', String(!isOpen));
  });

  fsMobileLinks.forEach((link) => {
    link.addEventListener('click', () => {
      fsMobile.classList.remove('is-open');
      fsBurger.setAttribute('aria-expanded', 'false');
      fsMobile.setAttribute('aria-hidden', 'true');
    });
  });
}

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
  );

  fsRevealItems.forEach((item) => observer.observe(item));
} else {
  fsRevealItems.forEach((item) => item.classList.add('is-visible'));
}

const sliderStep = (slider) => {
  const firstSlide = slider.querySelector('.fs-slide');
  if (!firstSlide) return slider.clientWidth * 0.9;
  const gap = parseFloat(getComputedStyle(slider).gap) || 0;
  return firstSlide.getBoundingClientRect().width + gap;
};

const scrollSlider = (selector, direction) => {
  const slider = document.querySelector(selector);
  if (!slider) return;
  slider.scrollBy({ left: sliderStep(slider) * direction, behavior: 'smooth' });
};

document.querySelectorAll('[data-slider-prev]').forEach((button) => {
  button.addEventListener('click', () => scrollSlider(button.dataset.sliderPrev, -1));
});

document.querySelectorAll('[data-slider-next]').forEach((button) => {
  button.addEventListener('click', () => scrollSlider(button.dataset.sliderNext, 1));
});
