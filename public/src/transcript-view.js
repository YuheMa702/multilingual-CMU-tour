/**
 * Stable transcript presentation for the CMU tour.
 *
 * The compact view owns exactly three reusable rows. Expanded mode owns one
 * button per cue and updates class names without replacing the buttons on
 * every audio timeupdate. Crucially, following the active cue scrolls ONLY the
 * internal transcript scroller, never window/document/ancestor elements.
 */
export function createTranscriptView({ container, scroller, cues, emptyText, onSelect }) {
  const document = container.ownerDocument;
  const lines = Array.isArray(cues) ? cues : [];
  let mode = null;
  let previousIndex = -1;
  let compactRows = [];
  let expandedButtons = [];

  function element(tag, classes, text = '') {
    const node = document.createElement(tag);
    node.className = classes;
    node.textContent = text;
    return node;
  }

  function mountCompact() {
    compactRows = [
      element('div', 'lyric-line', '\u00a0'),
      element('div', 'lyric-line current', '\u00a0'),
      element('div', 'lyric-line', '\u00a0')
    ];
    container.replaceChildren(...compactRows);
    expandedButtons = [];
    previousIndex = -1;
    mode = 'compact';
  }

  function mountExpanded() {
    expandedButtons = lines.map((line, index) => {
      const button = element('button', 'lyric-line lyric-line-button', line.text || '');
      button.type = 'button';
      button.dataset.index = String(index);
      button.dataset.time = String(line.time);
      button.addEventListener('click', () => onSelect(index, line.time));
      return button;
    });
    container.replaceChildren(...expandedButtons);
    compactRows = [];
    previousIndex = -1;
    mode = 'expanded';
  }

  function followCueInsideScroller(button) {
    if (!scroller || !button || !scroller.clientHeight) return;
    // getBoundingClientRect is relative to the viewport for both elements.
    // The difference is an INTERNAL scroll delta, not a document scroll target.
    const viewport = scroller.getBoundingClientRect();
    const active = button.getBoundingClientRect();
    const delta = active.top - viewport.top - (scroller.clientHeight - active.height) / 2;
    if (Math.abs(delta) > 1) {
      scroller.scrollTop = Math.max(0, scroller.scrollTop + delta);
    }
  }

  function render(index, { expanded = false, follow = true, forceScroll = false } = {}) {
    if (lines.length === 0) {
      if (mode !== 'empty') {
        container.replaceChildren(element('div', 'lyric-line current', emptyText || ''));
        mode = 'empty';
        previousIndex = -1;
      }
      return;
    }

    const safeIndex = Number.isInteger(index)
      ? Math.max(0, Math.min(lines.length - 1, index))
      : 0;
    const desiredMode = expanded ? 'expanded' : 'compact';
    const modeChanged = mode !== desiredMode;
    if (modeChanged) {
      if (expanded) mountExpanded();
      else mountCompact();
    }
    const cueChanged = previousIndex !== safeIndex;

    if (expanded) {
      if (cueChanged) {
        if (previousIndex !== -1) expandedButtons[previousIndex].classList.remove('current');
        expandedButtons[safeIndex].classList.add('current');
      }
      if (follow && (cueChanged || modeChanged || forceScroll)) {
        followCueInsideScroller(expandedButtons[safeIndex]);
      }
    } else if (cueChanged || modeChanged) {
      // Keep the existing DOM nodes and their allocated layout positions.
      compactRows[0].textContent = lines[safeIndex - 1]?.text || '\u00a0';
      compactRows[1].textContent = lines[safeIndex]?.text || '\u00a0';
      compactRows[2].textContent = lines[safeIndex + 1]?.text || '\u00a0';
    }
    previousIndex = safeIndex;
  }

  return { render };
}
