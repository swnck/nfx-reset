(function () {
  'use strict';

  const ICON_RESET = '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 3v5h5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
  const ICON_ERR = '<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>';
  const ICON_SPIN = '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-dasharray="28 28" stroke-linecap="round" style="animation:nfx-spin .8s linear infinite;transform-origin:center"/>';

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

  function findAllButtons() {
    const results = [];
    for (const sel of [
      '[data-uia*="my-list"]',
    ]) {
      document.querySelectorAll(sel).forEach((btn) => results.push(btn));
    }
    return results;
  }

  function injectClone(originalButton) {
    const btn = originalButton.parentNode.parentElement;

    if (!btn || !btn.parentNode) return;
    if (btn.parentNode.querySelector('[data-dup-clone="true"]')) return;

    const nfxButton = btn.cloneNode(true);
    const svgElement = nfxButton.querySelector('svg');
    svgElement.innerHTML = ICON_RESET;
    svgElement.setAttribute('fill', 'none');

    nfxButton.dataset.dupClone = "true";
    nfxButton.removeAttribute("data-uia");

    nfxButton.addEventListener("click", async (e) => {
      e.stopPropagation();
      e.preventDefault();

      const guid = getProfileGuid();
      if (!guid) return;

      svgElement.innerHTML = ICON_SPIN;

      const hrefVideo = btn.closest('.buttonControls--container').querySelector('a').getAttribute('href');
      const videoId = hrefVideo.split('?')[0].split('/')[2];

      console.log('[NFX Reset] Sending hide request for videoId', videoId, 'and profileGuid', guid);

      try {
        const resp = await chrome.runtime.sendMessage({
          type: 'HIDE_TITLE',
          videoId,
          profileGuid: guid,
          originUrl: window.location.href,
        });

        if (!resp?.ok) svgElement.innerHTML = ICON_RESET;

        window.location.reload();
      } catch (err) {
        svgElement.innerHTML = ICON_ERR;
      }
    })

    btn.parentNode.insertBefore(nfxButton, btn.nextSibling);
  }

  function removeStaleClones() {
    document.querySelectorAll("[data-dup-clone='true']").forEach((c) => c.remove());
  }

  function tryInject() {
    const buttons = findAllButtons();

    if (buttons.length > 0) {
      buttons.forEach(injectClone);
    } else {
      removeStaleClones();
    }
  }

  const observer = new MutationObserver(() => {
    tryInject();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  tryInject();
})();
