/**
 * The student-story rail is navigation UI, not part of the media player.
 * Keep its DOM nodes mounted while the surrounding player changes so a
 * user's horizontal position, touch-scroll momentum, and event handlers survive.
 *
 * Reuse is allowed only within the same UI language. Different languages may
 * have different stories/order; they receive a fresh carousel.
 */
export function canReuseStoryCarousel(root, lang) {
  const content = root.querySelector('.content-container');
  return Boolean(
    content &&
    content.dataset.language === lang &&
    content.querySelector('.stories-rail')
  );
}

export function updatePreservingStoryCarousel(root, markup, view, lang) {
  if (!canReuseStoryCarousel(root, lang)) return false;

  const currentContent = root.querySelector('.content-container');
  const currentRail = currentContent.querySelector('.stories-rail');
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  const nextContent = template.content.querySelector('.content-container');
  const nextRail = nextContent?.querySelector('.stories-rail');
  if (!nextContent || !nextRail) return false;

  const currentChildren = [...currentContent.children];
  const nextChildren = [...nextContent.children];
  const railIndex = currentChildren.indexOf(currentRail);
  if (railIndex === -1 || currentChildren.length !== nextChildren.length || nextChildren[railIndex] !== nextRail) {
    return false;
  }

  const oldCards = [...currentRail.querySelectorAll('.story-card-link[data-story-id]')];
  const newCards = [...nextRail.querySelectorAll('.story-card-link[data-story-id]')];
  // A changed catalog/order must be rendered from scratch rather than reusing stale cards.
  if (oldCards.length !== newCards.length ||
      oldCards.some((card, i) => card.dataset.storyId !== newCards[i].dataset.storyId)) {
    return false;
  }

  // Replace only the siblings of the story rail. Never remove or reparent the
  // rail: doing so interrupts native inertial scrolling on phones.
  for (let i = 0; i < currentChildren.length; i++) {
    if (i !== railIndex) currentChildren[i].replaceWith(nextChildren[i]);
  }
  currentContent.dataset.viewKind = nextContent.dataset.viewKind;
  currentContent.dataset.stopId = nextContent.dataset.stopId;

  // A story appears at every stop, so update links when the stop changes too.
  // The original click/scroll handlers remain attached to these same elements.
  oldCards.forEach((card, i) => {
    card.dataset.route = newCards[i].dataset.route;
    card.classList.toggle('selected', card.dataset.storyId === view.activeCardId);
  });
  return true;
}
