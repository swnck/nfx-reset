(function () {
  'use strict';

  const INJECTED_ATTR = 'data-nfx-reset';
  const POLL_MS = 1000;
  const ICON_RESET = '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 3v5h5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
  const ICON_ERR = '<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>';
  const ICON_SPIN = '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-dasharray="28 28" stroke-linecap="round" style="animation:nfx-spin .8s linear infinite;transform-origin:center"/>';
  const PANEL_SEL = [
    '[data-uia="previewModal"]',
    '.previewModal--wrapper',
    '.previewModal',
    '.jawBone',
  ].join(',');

  function getProfileGuid() {
    try {
      const raw = localStorage.getItem('MDX_PROFILEID');
      if (!raw) return null;
      const p = JSON.parse(raw);
      return p?.id ?? p?.data ?? null;
    } catch {
      return null;
    }
  }

  function extractVideoId(root) {
    for (const attr of ['data-id', 'data-video-id', 'data-entity-id', 'data-title-id', 'data-videoid']) {
      const el = root.querySelector(`[${attr}]`);
      if (el) {
        const v = el.getAttribute(attr);
        if (/^\d+$/.test(v)) return v;
      }
    }

    for (const a of root.querySelectorAll('a[href]')) {
      const m = a.href.match(/\/(watch|title)\/(\d+)/);
      if (m) return m[2];
    }

    try {
      const seed = root.querySelector('[data-uia]') || root.firstElementChild;
      if (seed) {
        const fk = Object.keys(seed).find(
            k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance')
        );
        if (fk) {
          let f = seed[fk];
          let d = 0;
          while (f && d++ < 50) {
            const p = f.memoizedProps || f.pendingProps || {};
            const v = p.videoId || p.titleId || p.movieId;
            if (v && /^\d+$/.test(String(v))) return String(v);
            f = f.return;
          }
        }
      }
    } catch {}

    return null;
  }

  function setBtn(btn, state) {
    btn.dataset.state = state;
    btn.disabled = state === 'loading';

    const svg = btn.querySelector('.nfx-icon');
    const map = {
      idle: ['Reset watch history', ICON_RESET, 'Reset history'],
      loading: ['Resetting watch history', ICON_SPIN, ''],
      error: ['Reset failed', ICON_ERR, 'Try again'],
    };

    const [label, icon, tooltip] = map[state] || map.idle;
    btn.setAttribute('aria-label', label);
    btn.title = label;
    btn.dataset.tooltip = tooltip;
    if (svg) svg.innerHTML = icon;
  }

  function mountButton(row, videoId) {
    const originalButton = document.querySelector('[data-uia="add-to-my-list"]');
    const isInMyList = document.querySelector('[data-uia="add-to-my-list-added"]');

    let originalWrapper;
    if (originalButton) originalWrapper = originalButton.closest('.ptrack-content').parentElement;
    else originalWrapper = isInMyList.closest('.ptrack-content').parentElement;

    const clonedWrapper = originalWrapper.cloneNode(true);
    const newButton = clonedWrapper.querySelector('button');

    newButton.setAttribute('data-uia', 'reset-history-button');
    newButton.setAttribute('aria-label', 'Reset history');

    const svgElement = newButton.querySelector('svg');

    svgElement.innerHTML = ICON_RESET;
    svgElement.setAttribute('fill', 'none');

    newButton.onclick = async (e) => {
      e.stopPropagation();
      e.preventDefault();

      const guid = getProfileGuid();
      if (!guid) {
        setBtn(newButton, 'error');
        console.error('[NFX Reset] Profile ID not found. Reload the page and try again.');
        setTimeout(() => setBtn(newButton, 'idle'), 2000);
        return;
      }

      setBtn(newButton, 'loading');

      try {
        const resp = await chrome.runtime.sendMessage({
          type: 'HIDE_TITLE',
          videoId,
          profileGuid: guid,
          originUrl: window.location.href,
        });

        if (!resp?.ok) {
          setBtn(newButton, 'error');
          console.error('[NFX Reset]', resp?.error || 'Unknown background error');
          setTimeout(() => setBtn(newButton, 'idle'), 2000);
          return;
        }

        window.location.reload();
      } catch (err) {
        console.error('[NFX Reset]', err);
        setBtn(newButton, 'error');
        setTimeout(() => setBtn(newButton, 'idle'), 2000);
      }
    };

    originalWrapper.parentNode.insertBefore(clonedWrapper, originalWrapper.nextSibling);
  }

  function findActionRow(panel) {
    const candidates = [
      '[data-uia="play-button"]',
      '[data-uia="bob-play"]',
      '[data-uia="billboard-play"]',
      'a[href*="/watch/"]',
      'button[aria-label*="Play"]',
      'button[aria-label*="Wiedergabe"]',
      'button[aria-label*="Abspielen"]',
    ];

    for (const sel of candidates) {
      const el = panel.querySelector(sel);
      if (!el) continue;

      let node = el.parentElement;
      for (let i = 0; i < 6; i++) {
        if (!node || node === panel) break;
        if (node.children.length >= 2) return node;
        node = node.parentElement;
      }
      return el.parentElement;
    }

    return null;
  }

  function tryInject(panel) {
    if (panel.hasAttribute(INJECTED_ATTR)) return;

    const videoId = extractVideoId(panel);
    if (!videoId) {
      if (!panel.hasAttribute('data-nfx-pending')) {
        panel.setAttribute('data-nfx-pending', '1');
        setTimeout(() => {
          panel.removeAttribute('data-nfx-pending');
          tryInject(panel);
        }, 800);
      }
      return;
    }

    const row = findActionRow(panel);
    if (!row) return;

    panel.setAttribute(INJECTED_ATTR, videoId);
    mountButton(row, videoId);
  }

  function scanDOM() {
    document.querySelectorAll(PANEL_SEL).forEach(el => {
      if (el.closest('[data-nfx-reset]')) return;
      tryInject(el);
    });
  }

  const mo = new MutationObserver(mutations => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.(PANEL_SEL)) {
          tryInject(node);
        } else {
          node.querySelectorAll?.(PANEL_SEL).forEach(el => {
            if (!el.closest('[data-nfx-reset]')) tryInject(el);
          });
        }
      }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
  setInterval(scanDOM, POLL_MS);
  scanDOM();
  console.info('[NFX Reset] Loaded');
})();
