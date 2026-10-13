import { createElement } from '../../utils/dom.js';
import { AdminDashboardApi } from '../../api/admin-dashboard.api.js';
import { AdminSettingsApi } from '../../api/admin-settings.api.js';
import { appStore } from '../../store/app.store.js';
import { confirmDialog } from '../../components/confirmDialog.js';
import { createAdminMenu } from './adminMenu.js';

const REFRESH_MS = 10_000;

const number = value => new Intl.NumberFormat('de-DE').format(Number(value) || 0);

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '–';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: value < 10 && unit > 0 ? 1 : 0 }).format(value)} ${units[unit]}`;
}

export function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} Std.`;
  return `${Math.floor(hours / 24)} Tagen`;
}

const formatTime = timestamp => (timestamp
  ? new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp))
  : '–');

const STATUS_LABELS = { pending: 'offen', approved: 'angenommen', rejected: 'abgelehnt', imported: 'verfügbar', open: 'offen', resolved: 'erledigt', dismissed: 'geschlossen' };

// `key` names a focusable card, so the focus survives the next refresh.
const card = ({ title, className = '', onClick = null, key = null }, ...children) => {
  const tag = onClick ? 'button' : 'section';
  return createElement(tag, {
    className: `admin-dash-card ${className}`.trim(),
    type: onClick ? 'button' : undefined,
    'data-key': key,
    onClick
  }, createElement('h2', { className: 'admin-dash-card-title' }, title), ...children);
};

const stat = (value, label) => createElement('div', { className: 'admin-dash-stat' },
  createElement('strong', {}, value),
  createElement('span', {}, label)
);

const dot = (ok) => createElement('span', { className: `admin-dash-dot ${ok ? 'is-ok' : 'is-bad'}`, 'aria-hidden': 'true' });

// The admin start page (#/admin): how VANTA is doing right now, what waits,
// what happened lately, the tools, and a message to everyone. Refreshed
// every 10 s while the tab is visible; `scope` ends it with the page.
export function createAdminDashboard({ tools = [], onSelect, scope }) {
  const statusGrid = createElement('div', { className: 'admin-dash-grid' });
  const streamsSlot = createElement('div');
  const activitySlot = createElement('div', { className: 'admin-dash-columns' });
  const menu = createAdminMenu({ tools, onSelect });
  let data = null;
  let timer = null;
  let loading = false;
  let paused = false;

  const renderStatus = () => {
    if (!data) {
      statusGrid.replaceChildren(createElement('p', { className: 'admin-dash-muted' }, 'Wird geladen …'));
      return;
    }
    const { server, streams, work, catalog, storage, parties } = data;
    const cache = storage?.imageCache;
    const usage = cache?.maxBytes ? Math.min(1, cache.bytes / cache.maxBytes) : null;

    const syncButton = createElement('button', {
      type: 'button',
      className: 'admin-dash-inline-button',
      'data-key': 'catalog-sync',
      disabled: catalog?.running,
      onClick: async event => {
        event.stopPropagation();
        event.currentTarget.disabled = true;
        try {
          await AdminSettingsApi.runCatalogUpdate();
          appStore.showToast('Katalog wird aktualisiert', 'success');
        } catch (error) {
          appStore.showToast(error.message || 'Aktualisierung fehlgeschlagen', 'error');
        }
        refresh();
      }
    }, catalog?.running ? 'Läuft …' : 'Jetzt aktualisieren');

    statusGrid.replaceChildren(
      card({ title: 'Server' },
        createElement('p', { className: 'admin-dash-line' }, dot(server.jellyfin.ok),
          server.jellyfin.ok ? `Jellyfin erreichbar · ${server.jellyfin.latencyMs} ms` : 'Jellyfin nicht erreichbar'),
        createElement('p', { className: 'admin-dash-muted' }, `VANTA ${server.version} · läuft seit ${formatDuration(server.uptimeSeconds)}`)
      ),
      card({ title: 'Streams jetzt' },
        stat(number(streams.list.length), streams.available ? `${streams.direct} direkt · ${streams.transcoding} transkodiert` : 'Jellyfin antwortet nicht')
      ),
      card({ title: 'Offene Arbeit', key: 'work', className: work.requests + work.reports > 0 ? 'has-work' : '', onClick: () => onSelect?.('requests') },
        createElement('div', { className: 'admin-dash-stats' },
          stat(number(work.requests), 'Anfragen'),
          stat(number(work.reports), 'Meldungen')
        )
      ),
      card({ title: 'Katalog' },
        catalog ? createElement('div', { className: 'admin-dash-stats' },
          stat(number(catalog.library.movies), 'Filme'),
          stat(number(catalog.library.series), 'Serien'),
          stat(catalog.library.episodes === null ? '–' : number(catalog.library.episodes), 'Folgen')
        ) : createElement('p', { className: 'admin-dash-muted' }, 'Katalog noch nicht bereit'),
        catalog ? createElement('p', { className: 'admin-dash-muted' },
          `Zuletzt ${formatTime(catalog.lastRun?.finishedAt)}${catalog.lastRun?.error ? ' (Fehler)' : ''} · nächster Lauf ${formatTime(catalog.nextUpdateAt)}`) : null,
        createElement('div', { className: 'admin-dash-actions' }, syncButton)
      ),
      card({ title: 'Speicher' },
        createElement('p', { className: 'admin-dash-line' }, `Bild-Cache: ${formatBytes(cache?.bytes)} von ${formatBytes(cache?.maxBytes)}`),
        usage === null ? null : createElement('div', { className: 'admin-dash-meter', role: 'meter', 'aria-valuenow': String(Math.round(usage * 100)), 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': 'Bild-Cache belegt' },
          createElement('span', { style: { width: `${Math.round(usage * 100)}%` } })),
        createElement('p', { className: 'admin-dash-muted' }, (storage?.databases || []).map(file => `${file.name.replace('.db', '')} ${formatBytes(file.bytes)}`).join(' · '))
      ),
      card({ title: 'Watch Partys' },
        parties.length
          ? createElement('ul', { className: 'admin-dash-list' }, parties.map(party => createElement('li', {},
            createElement('span', {}, party.title),
            createElement('span', { className: 'admin-dash-muted' }, `${party.owner} · ${party.members} dabei`))))
          : createElement('p', { className: 'admin-dash-muted' }, 'Gerade keine')
      )
    );

    streamsSlot.replaceChildren(streams.list.length ? card({ title: 'Was gerade läuft', className: 'is-wide' },
      createElement('ul', { className: 'admin-dash-streams' }, streams.list.map(stream => createElement('li', {},
        createElement('div', { className: 'admin-dash-stream-head' },
          createElement('strong', {}, stream.title),
          createElement('span', { className: `admin-dash-badge ${stream.transcoding ? 'is-transcode' : ''}` },
            [stream.transcoding ? 'Transkodiert' : 'Direkt', stream.quality].filter(Boolean).join(' · '))
        ),
        createElement('span', { className: 'admin-dash-muted' }, `${stream.user} · ${stream.device}${stream.paused ? ' · pausiert' : ''}`),
        stream.progress === null ? null : createElement('div', { className: 'admin-dash-meter is-thin' }, createElement('span', { style: { width: `${Math.round(stream.progress * 100)}%` } }))
      )))
    ) : null);
  };

  const renderActivity = () => {
    if (!data) return;
    const { activity } = data;
    const entries = (list, label) => (list.length
      ? createElement('ul', { className: 'admin-dash-list' }, list.map(entry => createElement('li', {},
        createElement('span', {}, entry.title),
        createElement('span', { className: 'admin-dash-muted' }, `${entry.username || '?'} · ${STATUS_LABELS[entry.status] || entry.status} · ${formatTime(entry.created_at)}`))))
      : createElement('p', { className: 'admin-dash-muted' }, `Keine ${label}`));
    activitySlot.replaceChildren(
      card({ title: 'Letzte Anfragen' }, entries(activity.requests, 'Anfragen')),
      card({ title: 'Letzte Meldungen' }, entries(activity.reports, 'Meldungen')),
      card({ title: 'Anmeldungen seit dem Start' },
        createElement('div', { className: 'admin-dash-stats' },
          stat(number(activity.logins.successes), 'erfolgreich'),
          stat(number(activity.logins.failures), 'fehlgeschlagen'),
          stat(number(activity.logins.activeLocks), 'gesperrt')
        )
      ),
      card({ title: 'Letzte Sperren' }, activity.bans.length
        ? createElement('ul', { className: 'admin-dash-list' }, activity.bans.map(ban => createElement('li', {},
          createElement('span', {}, ban.username || '?'),
          createElement('span', { className: 'admin-dash-muted' }, `${ban.reason}${ban.bannedAt ? ` · ${formatTime(ban.bannedAt)}` : ''}`))))
        : createElement('p', { className: 'admin-dash-muted' }, 'Niemand gesperrt'))
    );
  };

  // The cards are built anew on every refresh; a focused card or button
  // (data-key) gets the focus back, so a keyboard user is not thrown out.
  const keepFocus = (render) => {
    const active = document.activeElement;
    const key = active && element.contains(active) ? active.closest('[data-key]')?.dataset.key : null;
    render();
    if (key && !element.contains(active)) element.querySelector(`[data-key="${key}"]`)?.focus({ preventScroll: true });
  };

  const refresh = async () => {
    if (loading) return;
    loading = true;
    try {
      data = await AdminDashboardApi.get({ signal: scope?.signal });
      keepFocus(() => {
        renderStatus();
        renderActivity();
      });
    } catch (error) {
      if (!data) statusGrid.replaceChildren(createElement('p', { className: 'admin-dash-muted' }, error.message || 'Dashboard konnte nicht geladen werden.'));
    } finally {
      loading = false;
    }
  };

  // --- Message to everyone ---------------------------------------------------
  const titleInput = createElement('input', { type: 'text', className: 'admin-dash-input', maxlength: '80', placeholder: 'Titel, z. B. „Wartung heute Abend“', 'aria-label': 'Titel' });
  const bodyInput = createElement('textarea', { className: 'admin-dash-input', rows: '2', maxlength: '300', placeholder: 'Text der Mitteilung', 'aria-label': 'Text' });
  const sendButton = createElement('button', {
    type: 'submit',
    className: 'btn-primary admin-dash-send'
  }, 'An alle senden');
  const announceForm = createElement('form', {
    className: 'admin-dash-announce',
    onSubmit: async event => {
      event.preventDefault();
      const title = titleInput.value.trim();
      const body = bodyInput.value.trim();
      if (!title || !body) {
        appStore.showToast('Titel und Text sind nötig', 'error');
        return;
      }
      const confirmed = await confirmDialog({
        title: 'Mitteilung an alle senden?',
        message: `Alle Nutzer bekommen „${title}“: ${body}`,
        confirmLabel: 'Senden',
        cancelLabel: 'Abbrechen'
      });
      if (!confirmed) return;
      sendButton.disabled = true;
      try {
        const { recipients, pushed } = await AdminDashboardApi.announce({ title, body });
        appStore.showToast(`An ${recipients} Nutzer gesendet, ${pushed} davon per Push`, 'success');
        titleInput.value = '';
        bodyInput.value = '';
      } catch (error) {
        appStore.showToast(error.message || 'Mitteilung konnte nicht gesendet werden', 'error');
      } finally {
        sendButton.disabled = false;
      }
    }
  }, titleInput, bodyInput, sendButton);

  const element = createElement('div', { className: 'admin-dashboard' },
    statusGrid,
    streamsSlot,
    createElement('h2', { className: 'admin-dash-heading' }, 'Werkzeuge'),
    menu.element,
    createElement('h2', { className: 'admin-dash-heading' }, 'Aktivität'),
    activitySlot,
    card({ title: 'Mitteilung an alle', className: 'is-wide' },
      createElement('p', { className: 'admin-dash-muted' }, 'Erscheint unter der Glocke und als Push bei allen, die „Mitteilungen“ erlauben.'),
      announceForm)
  );

  // Paused while an admin area lies over the dashboard (admin.page.js).
  const tick = () => {
    if (!paused && document.visibilityState === 'visible') refresh();
  };
  renderStatus();
  refresh();
  timer = window.setInterval(tick, REFRESH_MS);
  const onVisible = () => tick();
  document.addEventListener('visibilitychange', onVisible);
  scope?.onLeave?.(() => {
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
  });

  return {
    element,
    setBadge: menu.setBadge,
    refresh,
    stop: () => window.clearInterval(timer),
    pause: () => { paused = true; },
    resume: () => {
      if (!paused) return;
      paused = false;
      tick();
    }
  };
}
