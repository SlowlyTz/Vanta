import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { ReportsApi } from '../api/reports.api.js';
import { appStore } from '../store/app.store.js';
import { notificationsStore } from '../store/notifications.store.js';
import { getProblemLabel } from '../shared/reports.js';
import { createSectionLoader } from '../components/loader.js';
import { createTitleStep } from './report/titleStep.js';
import { createScopeStep } from './report/scopeStep.js';
import { createProblemStep } from './report/problemStep.js';
import { renderMyReports } from './report/myReports.js';
import { iconElement } from './report/icons.js';

const itemFromHash = () => {
  const query = window.location.hash.split('?')[1] || '';
  return new URLSearchParams(query).get('item');
};

// "Meldung": report a problem with a title in the library. Three steps on one
// page — the title, what exactly (series only), what is wrong — then send.
// "Meine Meldungen" lists earlier reports with the admins' answer.
export default function ReportPage({ view = 'new' } = {}) {
  const activeView = view === 'mine' ? 'mine' : 'new';
  const state = { item: null, scope: 'all', seasonNumber: null, episodeNumber: null, scopeLabel: 'Ganze Serie', problem: null, message: '' };

  const container = createElement('div', { className: 'page-container content-section' });
  const page = createElement('div', { className: 'ui-page ui-page-narrow report-page' });
  container.appendChild(page);

  const mineDot = createElement('span', { className: 'ui-new-dot', hidden: true, 'aria-label': 'Neue Antworten' });
  const tabs = createElement('div', { className: 'ui-segmented ui-segmented-full report-tabs', role: 'tablist', 'aria-label': 'Meldungen' },
    createElement('button', {
      className: `ui-segment${activeView === 'new' ? ' is-active' : ''}`,
      type: 'button',
      role: 'tab',
      'aria-selected': String(activeView === 'new'),
      onClick: () => { window.location.hash = '#/report'; }
    }, 'Neue Meldung'),
    createElement('button', {
      className: `ui-segment${activeView === 'mine' ? ' is-active' : ''}`,
      type: 'button',
      role: 'tab',
      'aria-selected': String(activeView === 'mine'),
      onClick: () => { window.location.hash = '#/report/mine'; }
    }, 'Meine Meldungen', mineDot)
  );

  page.append(
    createElement('header', { className: 'ui-heading' },
      createElement('h1', { className: 'ui-title' }, 'Problem melden'),
      createElement('p', { className: 'ui-subtitle' }, 'Stimmt etwas mit einem Film oder einer Serie nicht? Sag uns Bescheid, wir kümmern uns darum.')
    ),
    tabs
  );

  const unsubscribe = notificationsStore.subscribe(({ mine }) => { mineDot.hidden = activeView === 'mine' || !mine.reports; });
  const stopWhenGone = () => {
    if (container.isConnected) return;
    unsubscribe();
    window.removeEventListener('hashchange', stopWhenGone);
  };
  window.addEventListener('hashchange', stopWhenGone);

  if (activeView === 'mine') {
    const list = createElement('div', { className: 'report-list' }, createSectionLoader({ label: 'Meldungen werden geladen', compact: true }));
    page.appendChild(list);
    Promise.all([ReportsApi.getMine(), notificationsStore.markSeen('reports')])
      .then(([reports, previousSeenAt]) => renderMyReports(list, reports || [], { previousSeenAt }))
      .catch(error => {
        list.innerHTML = '';
        list.appendChild(createElement('div', { className: 'ui-empty' }, error.message || 'Meldungen konnten nicht geladen werden.'));
      });
    return container;
  }

  // ----- New report -----
  const stepTitle = (number, text) => createElement('h2', { className: 'ui-group-title report-step-title' },
    createElement('span', { className: 'report-step-number' }, String(number)), text);

  const scopeTitle = stepTitle(2, 'Was genau?');
  const problemTitle = stepTitle(3, 'Was ist das Problem?');

  const titleStep = createTitleStep({ onSelect: item => selectItem(item) });
  const scopeStep = createScopeStep({
    onChange: ({ scope, seasonNumber, episodeNumber, label }) => {
      Object.assign(state, { scope, seasonNumber, episodeNumber, scopeLabel: label });
      update();
    }
  });
  const problemStep = createProblemStep({
    onChange: ({ problem, message }) => {
      Object.assign(state, { problem, message });
      update();
    }
  });

  const scopeSection = createElement('section', { className: 'ui-section', hidden: true }, scopeTitle, scopeStep.element);
  const problemSection = createElement('section', { className: 'ui-section', hidden: true }, problemTitle, problemStep.element);

  const summary = createElement('span', { className: 'ui-action-bar-text' });
  const sendButton = createElement('button', { className: 'ui-button ui-button-primary', type: 'button', disabled: true, onClick: () => send() }, 'Meldung senden');
  const actionBar = createElement('div', { className: 'ui-action-bar', hidden: true }, summary, sendButton);

  const flow = createElement('div', { className: 'report-flow' },
    createElement('section', { className: 'ui-section' }, stepTitle(1, 'Welcher Titel?'), titleStep.element),
    scopeSection,
    problemSection,
    actionBar
  );
  page.appendChild(flow);

  const missing = () => {
    if (!state.item) return 'Wähle einen Titel';
    if (state.item.Type === 'Series' && !state.scopeLabel) return state.scope === 'episode' ? 'Wähle eine Folge' : 'Wähle eine Staffel';
    if (!state.problem) return 'Wähle ein Problem';
    if (state.problem === 'other' && !state.message) return 'Beschreibe das Problem';
    return null;
  };

  function update() {
    const isSeries = state.item?.Type === 'Series';
    scopeSection.hidden = !isSeries;
    problemSection.hidden = !state.item;
    problemTitle.lastChild.textContent = 'Was ist das Problem?';
    problemTitle.firstChild.textContent = isSeries ? '3' : '2';
    actionBar.hidden = !state.item;

    const blocker = missing();
    sendButton.disabled = Boolean(blocker);
    summary.textContent = blocker
      || [state.item.Name, isSeries ? state.scopeLabel : null, getProblemLabel(state.problem)].filter(Boolean).join(' · ');
  }

  function selectItem(item) {
    state.item = item;
    titleStep.showChosen(item);
    scopeStep.setSeries(item?.Type === 'Series' ? item : null);
    Object.assign(state, { scope: 'all', seasonNumber: null, episodeNumber: null, scopeLabel: 'Ganze Serie' });
    update();
  }

  async function send() {
    if (missing()) return;
    sendButton.disabled = true;
    sendButton.textContent = 'Wird gesendet …';
    try {
      await ReportsApi.create({
        itemId: state.item.Id,
        scope: state.item.Type === 'Series' ? state.scope : 'all',
        seasonNumber: state.seasonNumber,
        episodeNumber: state.episodeNumber,
        problem: state.problem,
        message: state.message
      });
      showSuccess();
    } catch (error) {
      appStore.showToast(error.message || 'Meldung konnte nicht gesendet werden', 'error');
      sendButton.textContent = 'Meldung senden';
      update();
    }
  }

  function showSuccess() {
    flow.replaceWith(createElement('div', { className: 'ui-card report-success' },
      iconElement(createElement, 'success', 'report-success-icon'),
      createElement('h2', {}, 'Danke für deine Meldung!'),
      createElement('p', {}, `${state.item.Name} · ${getProblemLabel(state.problem)}. Sobald sich ein Admin darum gekümmert hat, siehst du es unter „Meine Meldungen“.`),
      createElement('div', { className: 'report-success-actions' },
        createElement('button', { className: 'ui-button ui-button-secondary', type: 'button', onClick: () => { window.location.hash = '#/report/mine'; } }, 'Meine Meldungen'),
        createElement('button', { className: 'ui-button ui-button-primary', type: 'button', onClick: () => { window.location.hash = `#/report?neu=${Date.now()}`; } }, 'Weitere Meldung')
      )
    ));
  }

  // "Problem melden" on a title's page opens this with the title chosen.
  const presetId = itemFromHash();
  if (presetId) {
    MediaApi.getItem(presetId)
      .then(item => { if (item && ['Movie', 'Series'].includes(item.Type)) selectItem(item); })
      .catch(() => {});
  } else {
    window.requestAnimationFrame(() => titleStep.focus());
  }

  return container;
}
