import { url } from '../data/site';
const body = document.body;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const coarse = matchMedia('(pointer: coarse)');
let storedMotion = false;
try { storedMotion = localStorage.getItem('zbk-motion') === 'off'; } catch { /* Storage is optional. */ }
let motionOff = reduced.matches || storedMotion;
const motionButton = document.querySelector<HTMLButtonElement>('#motion-toggle');
function applyMotion() {
  body.classList.toggle('motion-off', motionOff);
  document.documentElement.classList.toggle('motion-off', motionOff);
  motionButton?.setAttribute('aria-pressed', String(motionOff));
  if (motionButton) motionButton.textContent = `Motion: ${motionOff ? 'off' : 'on'}`;
  document.querySelectorAll<HTMLElement>('[data-depth]').forEach(el => { el.style.removeProperty('--scroll'); el.style.removeProperty('--mx'); el.style.removeProperty('--my'); });
}
applyMotion();
// One-time reveals use compositor-friendly opacity/translation, with visible no-JS defaults.
const revealObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.remove('reveal-pending');
      revealObserver.unobserve(entry.target);
    }
  }
}, { threshold: 0.08 });
document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(element => {
  if (!motionOff && element.getBoundingClientRect().top > innerHeight) {
    element.classList.add('reveal-pending');
    revealObserver.observe(element);
  }
});
reduced.addEventListener('change', () => { motionOff = reduced.matches || storedMotion; applyMotion(); });
motionButton?.addEventListener('click', () => {
  motionOff = !motionOff; storedMotion = motionOff;
  try { localStorage.setItem('zbk-motion', motionOff ? 'off' : 'on'); } catch { /* Storage is optional. */ }
  applyMotion();
});
const menu = document.querySelector<HTMLButtonElement>('.menu-toggle');
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open)); body.classList.toggle('menu-open', open);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { menu?.setAttribute('aria-expanded', 'false'); body.classList.remove('menu-open'); } });
document.querySelectorAll('#navigation a').forEach(link => link.addEventListener('click', () => { menu?.setAttribute('aria-expanded', 'false'); body.classList.remove('menu-open'); }));
const scenes = [...document.querySelectorAll<HTMLElement>('[data-depth]')];
let queued = false;
function updateDepth() {
  queued = false;
  if (motionOff || coarse.matches || document.hidden || body.classList.contains('modal-open')) return;
  for (const scene of scenes) {
    const rect = scene.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < innerHeight) scene.style.setProperty('--scroll', `${Math.max(-90, Math.min(90, -rect.top * 0.13))}px`);
  }
}
addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(updateDepth); } }, { passive: true });
for (const scene of scenes) {
  scene.addEventListener('pointermove', e => {
    if (motionOff || coarse.matches || body.classList.contains('modal-open')) return;
    const rect = scene.getBoundingClientRect();
    scene.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width - 0.5) * 12}px`);
    scene.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height - 0.5) * 9}px`);
  });
  scene.addEventListener('pointerleave', () => { scene.style.setProperty('--mx', '0px'); scene.style.setProperty('--my', '0px'); });
}
const dialog = document.querySelector<HTMLDialogElement>('#video-dialog')!;
const player = document.querySelector<HTMLDivElement>('#video-player')!;
document.querySelectorAll<HTMLAnchorElement>('[data-video]').forEach(link => link.addEventListener('click', e => {
  if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube-nocookie.com/embed/${link.dataset.video}?autoplay=1&start=${link.dataset.start || '0'}&rel=0`;
  iframe.title = link.dataset.title || 'ZBK video';
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  player.replaceChildren(iframe);
  dialog.classList.toggle('portrait', link.dataset.vertical === 'true');
  const map = link.dataset.map === 'nacht' ? 'nacht' : 'de';
  dialog.style.setProperty('--video-backdrop', `url("${url(`images/${map}-video-backdrop.webp`)}")`);
  document.querySelector('#video-title')!.textContent = iframe.title;
  document.querySelector<HTMLAnchorElement>('#video-fallback')!.href = link.href;
  body.classList.add('modal-open');
  document.dispatchEvent(new Event('video:visibility'));
  dialog.showModal();
}));
dialog.querySelector('.dialog-close')?.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
dialog.addEventListener('close', () => {
  player.replaceChildren(); body.classList.remove('modal-open');
  document.dispatchEvent(new Event('video:visibility'));
});
document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(button => button.addEventListener('click', () => {
  const filter = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(el => el.setAttribute('aria-pressed', String(el === button)));
  let count = 0;
  document.querySelectorAll<HTMLElement>('[data-category]').forEach(el => { el.hidden = filter !== 'all' && el.dataset.category !== filter; if (!el.hidden) count++; });
  const empty = document.querySelector<HTMLElement>('#empty-content');
  if (empty) empty.hidden = count > 0;
}));
document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach(button => button.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(button.dataset.copy || ''); button.textContent = 'Copied'; }
  catch { button.textContent = 'Select and copy the command'; }
}));
