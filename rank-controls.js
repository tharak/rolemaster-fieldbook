export function rankControl(inputMarkup) {
  return `<span class="rank-control">${inputMarkup.replace('type="number"', 'type="number" hidden')}<button type="button" data-rank-step="-1" aria-label="Decrease ranks">−</button><output aria-live="polite"></output><button type="button" data-rank-step="1" aria-label="Increase ranks">+</button></span>`;
}

export function syncRankControls() {
  document.querySelectorAll('.rank-control').forEach(control => {
    const input = control.querySelector('input');
    const value = Number(input.value) || 0;
    control.querySelector('output').textContent = String(value);
    control.querySelectorAll('button').forEach(button => {
      const delta = Number(button.dataset.rankStep);
      button.disabled = input.disabled || (delta < 0 ? value <= Number(input.min) : input.max !== '' && value >= Number(input.max));
      button.setAttribute('aria-label', `${delta < 0 ? 'Decrease' : 'Increase'} ${input.getAttribute('aria-label') || 'ranks'}`);
    });
  });
}

export function installRankControls() {
  document.addEventListener('click', event => {
    const button = event.target.closest('button[data-rank-step]');
    if (!button) return;
    event.preventDefault();
    const input = button.closest('.rank-control').querySelector('input');
    if (input.disabled) return;
    const next = (Number(input.value) || 0) + Number(button.dataset.rankStep);
    if (next < Number(input.min) || (input.max !== '' && next > Number(input.max))) return;
    input.value = String(next);
    input.dispatchEvent(new Event('change', {bubbles: true}));
    syncRankControls();
  });
  // Pickers are rendered on demand and may be rebuilt after an allocation.
  const observer = new MutationObserver(records => {
    if (records.some(record => [...record.addedNodes].some(node => node.nodeType === 1 && (node.matches('.rank-control') || node.querySelector('.rank-control'))))) syncRankControls();
  });
  observer.observe(document.body, {childList: true, subtree: true});
}
