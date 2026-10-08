// Campus Tasks, IcyBox client preview. No accounts and no network calls:
// everything a visitor types stays in this browser.
const KEY = 'icybox-campus-tasks-preview-v2';
const $ = selector => document.querySelector(selector);
const cards = [...document.querySelectorAll('[data-task]')];
const saveStatus = $('#save-status');
const FILE_TYPES = '.pdf,.csv,.xlsx,.xls,.doc,.docx,.png,.jpg,.jpeg,.webp,.mp4,.mov';

let storage = null;
try { storage = window.localStorage; storage.getItem(KEY); } catch { storage = null; }

const blank = () => ({ version: 2, tasks: {}, steps: {}, referral: '' });
function load() {
  try {
    const data = JSON.parse(storage?.getItem(KEY) || 'null');
    if (data?.version === 2 && data.tasks && typeof data.tasks === 'object' && data.steps && typeof data.steps === 'object') return { ...blank(), ...data };
  } catch { /* Fall back to an empty workspace. */ }
  return blank();
}
let state = load();

function save() {
  try {
    if (!storage) throw Error('unavailable');
    storage.setItem(KEY, JSON.stringify(state));
    saveStatus.textContent = 'Drafts save in this browser only.';
  } catch {
    saveStatus.textContent = 'Browser saving is off, so drafts last until you close this tab.';
  }
}

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  for (const child of [].concat(children)) node.append(child);
  return node;
}

// Status ------------------------------------------------------------------
const stepsFor = id => Object.entries(state.steps).filter(([key]) => key.startsWith(id + ':')).map(([, value]) => value);
function taskStatus(id) {
  const task = state.tasks[id] || {}, steps = stepsFor(id);
  if (steps.some(step => step.sent)) return 'review';
  if (task.checks?.some(Boolean) || task.notes?.trim() || steps.some(step => step.notes?.trim())) return 'active';
  return 'available';
}
const isComplete = card => {
  const checks = [...card.querySelectorAll('[data-check]')];
  return checks.length > 0 && checks.every(check => check.checked);
};

let currentFilter = 'all';
const EMPTY = {
  active: ['Your next move is waiting.', 'Start any opportunity. Your drafts and steps will show up here.'],
  review: ['Nothing waiting on review.', 'Send a step when it’s ready. You can keep working while IcyBox reviews it.'],
  approved: ['Good things take follow-through.', 'Approved opportunities show up here after IcyBox reviews your work.'],
};

function paint() {
  const counts = { all: cards.length, active: 0, review: 0, approved: 0 };
  let completed = 0;
  for (const card of cards) {
    const status = taskStatus(card.dataset.task), checks = [...card.querySelectorAll('[data-check]')];
    const done = isComplete(card), count = checks.filter(check => check.checked).length;
    counts[status]++;
    if (done) completed++;
    card.classList.toggle('is-complete', done);
    card.hidden = currentFilter !== 'all' && status !== currentFilter;
    card.querySelector('[data-status]').textContent = status === 'review' ? 'In review' : done ? 'Completed' : status === 'active' ? 'In progress' : 'Available';
    card.querySelector('[data-count]').textContent = `${count} of ${checks.length} checklist ${checks.length === 1 ? 'item' : 'items'} complete`;
  }
  for (const node of document.querySelectorAll('[data-filter-count]')) node.textContent = counts[node.dataset.filterCount];
  for (const button of document.querySelectorAll('[data-filter]')) button.setAttribute('aria-pressed', String(button.dataset.filter === currentFilter));
  const empty = !cards.some(card => !card.hidden);
  $('#empty-opportunities').hidden = !empty;
  if (empty) [$('#empty-title').textContent, $('#empty-description').textContent] = EMPTY[currentFilter] || EMPTY.active;
  $('#completion-summary').textContent = completed ? `${completed} ${completed === 1 ? 'task' : 'tasks'} checked off. Choose what’s next.` : 'Pick a task. See what you get.';
  $('#bonus-progress').textContent = `${completed} of 5 tasks completed`;
  $('#bonus-next').textContent = completed === cards.length ? 'All five checked off. Send each step for review to claim your $100 bonus.' : 'Your choice. All five only if you want the bonus.';
  $('.completion-bonus').classList.toggle('earned', completed === cards.length);
}

for (const button of document.querySelectorAll('[data-filter]')) button.addEventListener('click', () => { currentFilter = button.dataset.filter; paint(); });
$('#show-all-tasks').addEventListener('click', () => { currentFilter = 'all'; paint(); $('[data-filter="all"]').focus(); });

// Task cards ----------------------------------------------------------------
function collect(card) {
  state.tasks[card.dataset.task] = {
    checks: [...card.querySelectorAll('[data-check]')].map(check => check.checked),
    chapter: card.querySelector('[data-chapter]').value,
    notes: card.querySelector('[data-notes]').value,
  };
  save();
  paint();
}
for (const card of cards) {
  const onEdit = event => { if (!event.target.closest('.step-editor')) collect(card); };
  card.addEventListener('input', onEdit);
  card.addEventListener('change', onEdit);
  card.querySelector('.update-form').addEventListener('submit', event => event.preventDefault());
}

// Per-step editors, built here because they only work with JavaScript on.
const stepEditors = [];
for (const card of cards) {
  const taskId = card.dataset.task;
  for (const slot of card.querySelectorAll('[data-step]')) {
    const index = Number(slot.dataset.step), key = `${taskId}:${index}`, id = `step-${taskId}-${index}`;
    const status = el('span', { textContent: 'Not sent' });
    status.dataset.stepStatus = '';
    const notes = el('textarea', { id, rows: 3, maxLength: 6000, placeholder: slot.dataset.placeholder || '' });
    const upload = el('input', { type: 'file', multiple: true, accept: FILE_TYPES });
    const files = el('ul', { className: 'step-files' });
    const send = el('button', { type: 'button', textContent: 'Send step for review' });
    const message = el('p', { className: 'step-message' });
    message.setAttribute('role', 'status');
    message.setAttribute('aria-live', 'polite');
    const editor = el('div', { className: 'step-editor' }, [
      el('div', { className: 'step-editor-top' }, [el('span', { textContent: `STEP ${index + 1}` }), status]),
      el('label', { htmlFor: id, textContent: 'Your update for this step' }),
      notes,
      el('label', { className: 'step-upload' }, ['Add files', upload]),
      el('p', { className: 'step-help', textContent: 'In this preview, files stay on your device and aren’t uploaded.' }),
      files, send, message,
    ]);
    slot.replaceWith(editor);

    const paintStep = () => {
      const sent = Boolean(state.steps[key]?.sent);
      status.textContent = sent ? 'In review' : 'Not sent';
      status.classList.toggle('is-sent', sent);
      send.textContent = sent ? 'Resend with changes' : 'Send step for review';
    };
    const restore = () => { notes.value = state.steps[key]?.notes || ''; files.replaceChildren(); message.textContent = ''; paintStep(); };
    notes.addEventListener('input', () => {
      state.steps[key] = { ...state.steps[key], notes: notes.value };
      save(); paint();
    });
    upload.addEventListener('change', () => {
      files.replaceChildren(...[...upload.files].slice(0, 5).map(file => el('li', { textContent: file.name })));
    });
    send.addEventListener('click', () => {
      if (!notes.value.trim() && !upload.files.length) { message.textContent = 'Add an update or a file first.'; notes.focus(); return; }
      state.steps[key] = { notes: notes.value, sent: true };
      save(); paintStep(); paint();
      message.textContent = 'Marked as sent. This is a preview, so nothing left your browser.';
    });
    stepEditors.push(restore);
  }
}

// Referral, experience dates, reset ------------------------------------------
const referralNotes = $('#referral-notes');
referralNotes.addEventListener('input', () => { state.referral = referralNotes.value; save(); });
$('#chapter-referral').addEventListener('submit', event => {
  event.preventDefault();
  $('#referral-status').textContent = referralNotes.value.trim()
    ? 'Saved here. This is a preview, so the referral wasn’t sent.'
    : 'Add the chapter, school, and a contact first.';
});

const month = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date());
$('#experience-dates').textContent = `${month} – Present · 1 mo`;

function restore() {
  for (const card of cards) {
    const saved = state.tasks[card.dataset.task] || {};
    card.querySelectorAll('[data-check]').forEach((check, index) => { check.checked = saved.checks?.[index] === true; });
    card.querySelector('[data-chapter]').value = typeof saved.chapter === 'string' ? saved.chapter.slice(0, 160) : '';
    card.querySelector('[data-notes]').value = typeof saved.notes === 'string' ? saved.notes.slice(0, 6000) : '';
  }
  stepEditors.forEach(fn => fn());
  referralNotes.value = state.referral || '';
  $('#referral-status').textContent = '';
  paint();
}

$('#reset-preview').addEventListener('click', () => {
  if (!confirm('Clear every draft on this page?')) return;
  state = blank();
  try { storage?.removeItem(KEY); } catch { /* Nothing saved to clear. */ }
  restore();
  $('#reset-message').textContent = 'Drafts cleared.';
});

restore();
