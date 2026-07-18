import { analyticsEvents, trackEvent } from '../utils/analytics';

type GalleryImage = {
  src: string;
  alt: string;
  caption?: string;
  stage: string;
};

type GalleryProject = {
  slug: string;
  title: string;
  category: string;
  categoryLabel: string;
  location?: string;
  summary: string;
  serviceUrl?: string;
  href: string;
  images: GalleryImage[];
};

const CATEGORY_LABELS: Record<string, string> = {
  'tv-media-walls': 'TV & Media Walls',
  'kitchens-cabinetry': 'Kitchens & Cabinetry',
  'carpentry-built-ins': 'Carpentry & Built-Ins',
  'fixtures-installations': 'Fixtures & Installations',
  'repairs-improvements': 'Repairs & Improvements',
  'outdoor-projects': 'Outdoor Projects',
};

function readProjects(): GalleryProject[] {
  const el = document.getElementById('project-gallery-data');
  if (!el?.textContent) return [];
  try {
    return JSON.parse(el.textContent) as GalleryProject[];
  } catch {
    return [];
  }
}

function setChipActive(btn: HTMLButtonElement, active: boolean) {
  btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  btn.classList.toggle('border-brand-red', active);
  btn.classList.toggle('bg-brand-redsoft', active);
  btn.classList.toggle('text-brand-red', active);
  btn.classList.toggle('border-gray-200', !active);
  btn.classList.toggle('bg-white', !active);
  btn.classList.toggle('text-brand-black', !active);
}

function initFilters() {
  const root = document.querySelector<HTMLElement>('[data-project-filters]');
  const grid = document.querySelector<HTMLElement>('[data-project-grid]');
  if (!root || !grid) return;

  const chips = [...root.querySelectorAll<HTMLButtonElement>('[data-filter]')];
  const live = root.querySelector<HTMLElement>('[data-filter-live]');
  const cards = [...document.querySelectorAll<HTMLElement>('[data-project-card]')];
  const empty = grid.querySelector<HTMLElement>('[data-empty-state]');
  const showMoreWrap = grid.querySelector<HTMLElement>('[data-show-more-wrap]');
  const showMoreBtn = grid.querySelector<HTMLButtonElement>('[data-show-more]');
  const resetBtn = grid.querySelector<HTMLButtonElement>('[data-filter-reset]');

  let active = 'all';
  let visibleLimit = Number(showMoreBtn?.dataset.initial || 12);
  const pageSize = Number(showMoreBtn?.dataset.pageSize || 9);

  function matchingCards(): HTMLElement[] {
    return cards.filter((card) => {
      if (active === 'all') return true;
      return card.dataset.category === active;
    });
  }

  function apply() {
    const matches = matchingCards();
    // Featured first already in DOM order from server sort
    cards.forEach((card) => {
      card.classList.add('hidden');
      card.hidden = true;
    });

    const slice = matches.slice(0, visibleLimit);
    slice.forEach((card) => {
      card.classList.remove('hidden');
      card.hidden = false;
    });

    const label = active === 'all' ? 'projects' : `${CATEGORY_LABELS[active] || active} projects`;
    if (live) {
      live.textContent =
        matches.length === 0
          ? `No ${label} shown.`
          : `${Math.min(visibleLimit, matches.length)} of ${matches.length} ${label} shown.`;
    }

    if (empty) {
      const isEmpty = matches.length === 0;
      empty.classList.toggle('hidden', !isEmpty);
      empty.hidden = !isEmpty;
    }

    if (showMoreWrap && showMoreBtn) {
      const more = matches.length > visibleLimit;
      showMoreWrap.classList.toggle('hidden', !more || matches.length === 0);
    }

    chips.forEach((chip) => setChipActive(chip, chip.dataset.filter === active));
  }

  function setCategory(next: string, pushUrl: boolean) {
    active = next || 'all';
    visibleLimit = Number(showMoreBtn?.dataset.initial || 12);
    const url = new URL(window.location.href);
    if (active === 'all') url.searchParams.delete('category');
    else url.searchParams.set('category', active);
    if (pushUrl) history.pushState({ category: active }, '', url);
    else history.replaceState({ category: active }, '', url);
    apply();
    trackEvent(analyticsEvents.galleryFilterSelected, { filter_category: active });
  }

  chips.forEach((chip) => {
    chip.addEventListener('click', () => setCategory(chip.dataset.filter || 'all', true));
  });

  resetBtn?.addEventListener('click', () => setCategory('all', true));

  showMoreBtn?.addEventListener('click', () => {
    visibleLimit += pageSize;
    apply();
  });

  window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category') || 'all';
    active = cat in CATEGORY_LABELS || cat === 'all' ? cat : 'all';
    visibleLimit = Number(showMoreBtn?.dataset.initial || 12);
    apply();
  });

  const initial = new URLSearchParams(window.location.search).get('category') || 'all';
  if (initial !== 'all' && !(initial in CATEGORY_LABELS)) {
    setCategory('all', false);
  } else {
    active = initial;
    apply();
    history.replaceState({ category: active }, '', window.location.href);
  }
}

function initDialog(projects: GalleryProject[]) {
  const dialogEl = document.querySelector('#project-viewer');
  if (!(dialogEl instanceof HTMLDialogElement)) return;
  const dialog: HTMLDialogElement = dialogEl;

  const bySlug = new Map(projects.map((p) => [p.slug, p]));
  let current: GalleryProject | null = null;
  let index = 0;
  let lastFocus: HTMLElement | null = null;

  const titleEl = dialog.querySelector<HTMLElement>('[data-dialog-title]');
  const metaEl = dialog.querySelector<HTMLElement>('[data-dialog-meta]');
  const countEl = dialog.querySelector<HTMLElement>('[data-dialog-photo-count]');
  const summaryEl = dialog.querySelector<HTMLElement>('[data-dialog-summary]');
  const imgEl = dialog.querySelector<HTMLImageElement>('[data-dialog-image]');
  const captionEl = dialog.querySelector<HTMLElement>('[data-dialog-caption]');
  const thumbsWrap = dialog.querySelector<HTMLElement>('[data-dialog-thumbs-wrap]');
  const thumbsEl = dialog.querySelector<HTMLElement>('[data-dialog-thumbs]');
  const serviceLink = dialog.querySelector<HTMLAnchorElement>('[data-dialog-service]');
  const detailLink = dialog.querySelector<HTMLAnchorElement>('[data-dialog-detail]');
  const closeBtn = dialog.querySelector<HTMLButtonElement>('[data-dialog-close]');
  const prevBtn = dialog.querySelector<HTMLButtonElement>('[data-dialog-prev]');
  const nextBtn = dialog.querySelector<HTMLButtonElement>('[data-dialog-next]');

  function render() {
    if (!current || !imgEl) return;
    const photo = current.images[index];
    if (!photo) return;
    imgEl.src = photo.src;
    imgEl.alt = photo.alt;
    if (captionEl) captionEl.textContent = photo.caption || '';
    if (countEl) countEl.textContent = `Photo ${index + 1} of ${current.images.length}`;
    if (thumbsEl) {
      thumbsEl.querySelectorAll('button').forEach((btn, i) => {
        const active = i === index;
        btn.setAttribute('aria-current', active ? 'true' : 'false');
        btn.classList.toggle('ring-2', active);
        btn.classList.toggle('ring-brand-red', active);
        btn.classList.toggle('opacity-60', !active);
      });
    }
  }

  function buildThumbs() {
    if (!thumbsEl || !thumbsWrap || !current) return;
    thumbsEl.innerHTML = '';
    if (current.images.length <= 2) {
      thumbsWrap.classList.add('hidden');
      return;
    }
    thumbsWrap.classList.remove('hidden');
    current.images.forEach((photo, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'shrink-0 w-16 h-16 rounded-md overflow-hidden border border-brand-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-red';
      btn.setAttribute('aria-label', `View photo ${i + 1} of ${current!.images.length}`);
      btn.innerHTML = `<img src="${photo.src}" alt="" width="64" height="64" class="w-full h-full object-cover" loading="lazy" />`;
      btn.addEventListener('click', () => {
        index = i;
        render();
        trackEvent(analyticsEvents.projectPhotoNavigated, {
          project_slug: current!.slug,
          photo_stage: photo.stage,
        });
      });
      thumbsEl.appendChild(btn);
    });
  }

  function open(slug: string, trigger: HTMLElement) {
    const project = bySlug.get(slug);
    if (!project) return;
    current = project;
    index = 0;
    lastFocus = trigger;
    if (titleEl) titleEl.textContent = project.title;
    if (metaEl) {
      const loc = project.location ? `${project.location} · ` : '';
      metaEl.textContent = `${loc}${project.categoryLabel}`;
    }
    if (summaryEl) summaryEl.textContent = project.summary;
    if (serviceLink) {
      if (project.serviceUrl) {
        serviceLink.href = project.serviceUrl;
        serviceLink.classList.remove('hidden');
      } else {
        serviceLink.classList.add('hidden');
      }
    }
    if (detailLink) detailLink.href = project.href;
    buildThumbs();
    render();
    dialog.showModal();
    document.documentElement.classList.add('overflow-hidden');
    closeBtn?.focus();
    trackEvent(analyticsEvents.projectCardOpened, {
      project_slug: project.slug,
      project_category: project.category,
      project_city: project.location || '',
    });
  }

  function close() {
    if (dialog.open) dialog.close();
  }

  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('overflow-hidden');
    lastFocus?.focus();
    lastFocus = null;
  });

  closeBtn?.addEventListener('click', close);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });

  prevBtn?.addEventListener('click', () => {
    if (!current) return;
    index = (index - 1 + current.images.length) % current.images.length;
    render();
    trackEvent(analyticsEvents.projectPhotoNavigated, {
      project_slug: current.slug,
      photo_stage: current.images[index]?.stage,
    });
  });

  nextBtn?.addEventListener('click', () => {
    if (!current) return;
    index = (index + 1) % current.images.length;
    render();
    trackEvent(analyticsEvents.projectPhotoNavigated, {
      project_slug: current.slug,
      photo_stage: current.images[index]?.stage,
    });
  });

  dialog.addEventListener('keydown', (e) => {
    if (!dialog.open) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevBtn?.click();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextBtn?.click();
    }
  });

  // Light swipe
  let touchX: number | null = null;
  dialog.addEventListener(
    'touchstart',
    (e) => {
      touchX = e.changedTouches[0]?.clientX ?? null;
    },
    { passive: true },
  );
  dialog.addEventListener(
    'touchend',
    (e) => {
      if (touchX == null) return;
      const dx = (e.changedTouches[0]?.clientX ?? touchX) - touchX;
      if (Math.abs(dx) > 50) {
        if (dx > 0) prevBtn?.click();
        else nextBtn?.click();
      }
      touchX = null;
    },
    { passive: true },
  );

  document.querySelectorAll<HTMLAnchorElement>('[data-project-link]').forEach((link) => {
    link.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const slug = link.dataset.projectSlug;
      if (!slug || !bySlug.has(slug)) return;
      e.preventDefault();
      open(slug, link);
    });
  });

  serviceLink?.addEventListener('click', () => {
    if (!current) return;
    trackEvent(analyticsEvents.projectServiceLinkClicked, {
      project_slug: current.slug,
      project_category: current.category,
    });
  });
}

function initCtas() {
  document.querySelectorAll<HTMLElement>('[data-gallery-cta]').forEach((el) => {
    el.addEventListener('click', () => {
      const kind = el.getAttribute('data-gallery-cta');
      const location = el.getAttribute('data-cta-location') || 'gallery';
      if (kind === 'estimate') {
        trackEvent(analyticsEvents.galleryEstimateClicked, { cta_location: location });
      } else if (kind === 'phone') {
        trackEvent(analyticsEvents.galleryPhoneClicked, { cta_location: location });
      } else if (kind === 'service') {
        trackEvent(analyticsEvents.projectServiceLinkClicked, { cta_location: location });
      }
    });
  });
}

function init() {
  const projects = readProjects();
  initFilters();
  initDialog(projects);
  initCtas();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
