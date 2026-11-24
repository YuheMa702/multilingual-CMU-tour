// Accessibility enhancements for the existing SPA. No visual components are replaced.
import {getUiText} from './content-manifest.js';
import {state} from './state.js';

const set = (el, name, value) => {
  if (el && el.getAttribute(name) !== String(value)) el.setAttribute(name, String(value));
};
const query = (root, selector) => root.querySelector(selector);
const all = (root, selector) => [...root.querySelectorAll(selector)];
const timeText = seconds => {
  const n = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
};

export function installAccessibility(root = document.getElementById('app')) {
  if (!root || root.dataset.accessibilityInstalled) return;
  root.dataset.accessibilityInstalled = 'true';
  // The app is a document, not a custom desktop-style application widget.
  root.removeAttribute('role');
  const boundAudio = new WeakSet();
  let lastMenu = null, wasOpen = false, lastActiveView = null;
  let lastPage = null, lastTarget = null, lastHash = location.hash;
  let focusOnNextPage = false;
  const activate = el => {
    set(el, 'role', 'button'); set(el, 'tabindex', '0');
    if (el.tagName === 'IMG') set(el, 'aria-label', el.alt);
  };
  function syncAudio(audio, slider) {
    const available = Number.isFinite(audio.duration) && audio.duration > 0;
    const duration = available ? audio.duration : 0;
    const current = Math.min(duration, Math.max(0, audio.currentTime || 0));
    set(slider, 'aria-disabled', !available);
    set(slider, 'aria-valuemin', 0);
    set(slider, 'aria-valuemax', Math.round(duration * 1000) / 1000);
    set(slider, 'aria-valuenow', Math.min(Math.round(duration * 1000)/1000, Math.round(current * 1000)/1000));
    set(slider, 'aria-valuetext', `${timeText(current)} / ${timeText(duration)}`);
  }
  function enhance() {
    const lang = state.lang || 'en';
    const ui = getUiText(lang);
    document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : lang;
    const page = query(root, '.content-container, .landing-container, .onboarding-container');
    const hash = location.hash;
    if (hash !== lastHash) { focusOnNextPage = true; lastHash = hash; }
    const target = page && query(page, '#mainTitle, #resources-title, #languageSelect, .intro-slide.active');
    if (target && (page !== lastPage || target !== lastTarget)) {
      if (focusOnNextPage || (lastTarget && !root.contains(document.activeElement))) {
        // Preserve focus in the story carousel if its DOM was deliberately retained.
        if (!document.activeElement?.closest('.story-card-link')) {
          if (!target.matches('select')) set(target, 'tabindex', '-1');
          target.focus({preventScroll:true});
        }
        focusOnNextPage = false;
      }
      lastPage = page; lastTarget = target;
    }
    // Functional controls: keep the existing visuals and click handlers.
    for (const el of all(root, '.side-menu-list li[data-stop-id], #openSettingsBtn, .side-menu-close, .side-menu-back, #lyricsToggleBtn')) activate(el);
    const title = query(root, '#mainTitle');
    if (title) { set(title,'role','heading'); set(title,'aria-level','1'); }
    for (const img of all(root, 'img.intro-illustration')) img.alt = ''; // redundant to adjacent instructions
    const logo = query(root, '.cmu-tour-lettermark');
    if (logo) logo.alt = ui.cmuLogoAlt || 'Carnegie Mellon University';
    const header = query(root, '.cmu-tour-header');
    set(header, 'aria-label', ui.cmuLogoAlt || 'Carnegie Mellon University');
    // Placeholders are not numbered campus photographs.
    for (const img of all(root, 'img[src*="placeholder.svg"]')) img.alt = ui.noImageLabel || 'No image available';
    // Slides and selected stories have meaningful state, not just color.
    set(query(root,'#prevSlideBtn'), 'aria-label', ui.previousImageAria);
    set(query(root,'#nextSlideBtn'), 'aria-label', ui.nextImageAria);
    for (const dot of all(root,'.dot')) set(dot,'aria-pressed',dot.classList.contains('active'));
    for (const card of all(root,'.story-card-link')) set(card,'aria-pressed',card.classList.contains('selected'));
    const transcript = query(root,'#lyricsPlayer'), toggle = query(root,'#lyricsToggleBtn');
    if (toggle && transcript) {
      const expanded = transcript.classList.contains('enlarged');
      set(toggle,'aria-controls','lyricsScroll'); set(toggle,'aria-expanded',expanded);
      set(toggle,'aria-label',expanded ? ui.collapseTranscriptAria : ui.enlargeTranscriptAlt);
      const scroll = query(root,'#lyricsScroll');
      set(scroll,'tabindex', expanded ? '0' : '-1');
      set(scroll,'role','region'); set(scroll,'aria-label',ui.transcriptAria);
    }
    for (const cue of all(root,'.lyric-line-button')) {
      if (cue.classList.contains('current')) set(cue,'aria-current','true'); else cue.removeAttribute('aria-current');
    }
    const audio = query(root,'#audio'), slider = query(root,'#progressContainer');
    if (audio && slider) {
      set(slider,'role','slider'); set(slider,'tabindex','0'); set(slider,'aria-label',ui.audioProgressAria);
      if (!boundAudio.has(audio)) {
        boundAudio.add(audio);
        const sync = () => syncAudio(audio, slider);
        for (const name of ['loadedmetadata','durationchange','timeupdate','seeking','emptied']) audio.addEventListener(name,sync);
        sync();
      }
    }
    // Native radios already handle Space/arrow keys; label them with visible text.
    for (const option of all(root,'.language-option')) {
      const radio = query(option,'input[type="radio"]');
      if (radio) {
        const label = query(option,'.language-name')?.textContent?.trim();
        if (label) set(radio,'aria-label',label);
      }
    }
    for (const selectOption of all(root,'#languageSelect option[value]')) {
      if (selectOption.value) set(selectOption,'lang',selectOption.value === 'zh' ? 'zh-Hans' : selectOption.value);
    }
    // Closed off-canvas content must not remain in the tab order or accessibility tree.
    const menu = query(root,'#sideMenu'), opener = query(root,'#menuBtn');
    if (menu) {
      const open = menu.classList.contains('open');
      const activeView = query(menu,'.menu-view.active');
      set(opener,'aria-expanded',open);
      set(menu,'role','dialog'); set(menu,'aria-label',activeView?.id === 'settingsView' ? ui.settingsTitle : ui.menuTitle);
      if (open) set(menu,'aria-modal','true'); else menu.removeAttribute('aria-modal');
      // Restore the background before returning focus to the menu opener.
      if (!open) for (const child of menu.parentElement.children) if (child !== menu && !child.classList.contains('side-menu-overlay')) child.inert = false;
      // Move focus before making the currently focused subtree inert.
      if (open && (menu !== lastMenu || !wasOpen || activeView !== lastActiveView)) {
        menu.inert = false;
        if (activeView) activeView.inert = false;
        const target = query(activeView || menu,'.side-menu-close, .side-menu-back, button, [tabindex="0"]');
        target?.focus({preventScroll:true});
      } else if (!open && wasOpen && menu === lastMenu && menu.contains(document.activeElement)) {
        opener?.focus({preventScroll:true});
      }
      menu.inert = !open;
      for (const view of all(menu,'.menu-view')) view.inert = !view.classList.contains('active');
      // The menu is a sibling of all visible page content within this shell.
      for (const child of menu.parentElement.children) if (child !== menu && !child.classList.contains('side-menu-overlay')) child.inert = open;
      lastMenu = menu; wasOpen = open; lastActiveView = activeView;
    } else { lastMenu = null; wasOpen = false; lastActiveView = null; }
  }
  root.addEventListener('keydown', event => {
    const el = event.target;
    const menu = query(root,'#sideMenu.open');
    if (menu && event.key === 'Escape') {
      event.preventDefault(); query(menu,'.side-menu-close')?.click(); return;
    }
    if (menu && event.key === 'Tab') {
      const items = all(menu,'button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]')
        .filter(node => !node.closest('[inert]') && node.getClientRects().length);
      const first = items[0], last = items.at(-1);
      if (first && event.shiftKey && (el === first || !menu.contains(el))) {event.preventDefault();last.focus();}
      else if (last && !event.shiftKey && (el === last || !menu.contains(el))) {event.preventDefault();first.focus();}
      return;
    }
    if (el.id === 'progressContainer') {
      const audio = query(root,'#audio');
      if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
      const delta = {ArrowLeft:-5,ArrowDown:-5,ArrowRight:5,ArrowUp:5,PageDown:-audio.duration/10,PageUp:audio.duration/10};
      let value;
      if (event.key === 'Home') value = 0;
      else if (event.key === 'End') value = audio.duration;
      else if (Object.hasOwn(delta,event.key)) value = audio.currentTime + delta[event.key];
      else return;
      event.preventDefault(); audio.currentTime = Math.min(audio.duration,Math.max(0,value)); syncAudio(audio,el); return;
    }
    if (el.matches('[role="button"]:not(button)') && ['Enter',' '].includes(event.key)) {
      event.preventDefault(); if (!event.repeat) el.click();
    }
  });
  // Only observe structural/class changes; do not observe our own ARIA writes.
  const observer = new MutationObserver(enhance);
  observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  enhance();
}
