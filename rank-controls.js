export function rankControl(inputMarkup) {
  return `<span class="rank-control">${inputMarkup.replace('type="number"', 'type="number" hidden')}<button type="button" data-rank-step="-1" aria-label="Decrease value">−</button><output aria-live="polite"></output><button type="button" data-rank-step="1" aria-label="Increase value">+</button></span>`;
}

const observedInputs = new WeakSet();
let installed = false;

function syncControl(input) {
  const control = input.closest('.rank-control');
  if (!control) return;
  const output = control.querySelector('output');
  const display = input.value || '—';
  if (output.textContent !== display) output.textContent = display;
  control.classList.toggle('number-readonly', input.readOnly);
  const label = input.getAttribute('aria-label') || control.dataset.label || input.name || 'value';
  output.setAttribute('aria-label', label);
  control.querySelectorAll('button').forEach(button => {
    const delta = Number(button.dataset.rankStep);
    const value = Number(input.value);
    button.hidden = input.readOnly;
    button.disabled = input.disabled || input.readOnly || (input.value !== '' && (delta < 0
      ? input.min !== '' && value <= Number(input.min)
      : input.max !== '' && value >= Number(input.max)));
    button.setAttribute('aria-label', `${delta < 0 ? 'Decrease' : 'Increase'} ${label}`);
  });
}

export function syncRankControls() {
  document.querySelectorAll('input[type="number"]').forEach(input => {
    let control = input.closest('.rank-control');
    if (!control) {
      // Fields deliberately hidden by the application stay hidden.
      if (input.hidden) return;
      control = document.createElement('span');
      control.className = 'rank-control';
      control.dataset.label = [...(input.labels || [])].map(label => label.textContent.trim()).join(' ') || input.id || input.name || 'value';
      input.before(control);
      control.innerHTML = '<button type="button" data-rank-step="-1">−</button><output aria-live="polite"></output><button type="button" data-rank-step="1">+</button>';
      control.prepend(input);
      input.hidden = true;
    }
    if (!observedInputs.has(input)) {
      observedInputs.add(input);
      // Calculated stats, loaded saves, and reset actions assign .value directly.
      const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      Object.defineProperty(input, 'value', {
        configurable: true,
        get() { return descriptor.get.call(this); },
        set(value) { descriptor.set.call(this, value); syncControl(this); }
      });
    }
    syncControl(input);
  });
}

export function installRankControls() {
  if (installed) return;
  installed = true;
  document.addEventListener('click', event => {
    const button = event.target.closest('button[data-rank-step]');
    if (!button) return;
    event.preventDefault();
    const input = button.closest('.rank-control').querySelector('input');
    if (input.disabled || input.readOnly) return;
    const direction = Number(button.dataset.rankStep);
    // Native stepping respects decimal steps, step bases, and min/max bounds.
    if (input.step === 'any') {
      const next = (Number(input.value) || 0) + direction;
      input.value = String(Math.max(input.min === '' ? -Infinity : Number(input.min), Math.min(input.max === '' ? Infinity : Number(input.max), next)));
    } else if (direction < 0) input.stepDown();
    else input.stepUp();
    input.dispatchEvent(new Event('input', {bubbles: true}));
    input.dispatchEvent(new Event('change', {bubbles: true}));
    syncRankControls();
  });
  document.addEventListener('input', syncRankControls);
  document.addEventListener('change', syncRankControls);
  document.addEventListener('reset', () => queueMicrotask(syncRankControls));
  const observer = new MutationObserver(records => {
    if (records.some(record => (record.type === 'attributes' && record.target.matches('input[type="number"]')) || [...record.addedNodes].some(node => node.nodeType === 1 && (node.matches('input[type="number"], .rank-control') || node.querySelector('input[type="number"]'))))) syncRankControls();
  });
  observer.observe(document.body, {childList: true, subtree: true, attributes: true, attributeFilter: ['min', 'max', 'step', 'disabled', 'readonly', 'value']});
  syncRankControls();
}
