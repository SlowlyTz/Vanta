import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequestScopeSelector } from '../../../../src/public/js/pages/requests/scopeSelector.js';
import { buildRequestCoverage } from '../../../../src/public/js/pages/requests/helpers.js';
import { RequestsApi } from '../../../../src/public/js/api/requests.api.js';
import { appStore } from '../../../../src/public/js/store/app.store.js';

vi.mock('../../../../src/public/js/api/requests.api.js', () => ({
  RequestsApi: {
    getSeason: vi.fn(),
    createRequest: vi.fn()
  }
}));

vi.mock('../../../../src/public/js/store/app.store.js', () => ({
  appStore: { showToast: vi.fn() }
}));

async function flush() {
  for (let i = 0; i < 12; i++) await Promise.resolve();
}

// Hand-controlled promise so a test can observe the gap between two awaits.
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

// Shape produced by mergeSeasons(), which is what the detail page feeds in.
const makeSeason = (number, overrides = {}) => ({
  season_number: number,
  name: number === 0 ? 'Specials' : `Staffel ${number}`,
  episode_count: 10,
  poster_path: null,
  exists: false,
  requestable: number !== 0,
  special: number === 0,
  ...overrides
});

const defaultSeasons = () => [makeSeason(0), makeSeason(1), makeSeason(2)];

const modeBtn = (el, scope) => el.querySelector(`.request-scope-mode[data-scope="${scope}"]`);
const modeLabels = el => Array.from(el.querySelectorAll('.request-scope-mode')).map(b => b.textContent);
const activeMode = el => el.querySelector('.request-scope-mode.active')?.getAttribute('data-scope') ?? null;
const seasonBtn = (el, n) => el.querySelector(`.request-scope-season[data-season-number="${n}"]`);
const toggleBtn = (el, n) => el.querySelector(`.request-scope-season-toggle[data-season-number="${n}"]`);
const episodeBtn = (el, s, e) =>
  el.querySelector(`.request-scope-episode[data-season-number="${s}"][data-episode-number="${e}"]`);
const submitBtn = el => el.querySelector('.request-scope-submit');
const hintText = el => el.querySelector('.request-scope-hint').textContent;
const noteText = el => el.querySelector('.request-scope-note')?.textContent ?? null;
const seasonState = (el, n) => seasonBtn(el, n).querySelector('.request-scope-season-state')?.textContent ?? null;

function mount(options = {}) {
  const selector = createRequestScopeSelector({ tmdbId: 42, seasons: defaultSeasons(), ...options });
  document.body.appendChild(selector.element);
  return selector.element;
}

// Opens the episode mode and expands one season, awaiting the getSeason round trip.
async function expandSeason(el, number) {
  modeBtn(el, 'episode').click();
  toggleBtn(el, number).click();
  await flush();
}

describe('createRequestScopeSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    RequestsApi.createRequest.mockResolvedValue({ id: 'req-1' });
    RequestsApi.getSeason.mockResolvedValue({
      season_number: 1,
      name: 'Staffel 1',
      episodes: [
        { episode_number: 1, name: 'Pilot' },
        { episode_number: 2, name: 'Zweite Folge' }
      ]
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Modi', () => {
    it('bietet die drei Modi an und startet bei der kompletten Serie', () => {
      const el = mount();

      expect(modeLabels(el)).toEqual(['Komplette Serie', 'Einzelne Staffeln', 'Einzelne Folge']);
      expect(activeMode(el)).toBe('all');
      expect(noteText(el)).toBe('Es werden alle Staffeln der Serie angefragt.');
      expect(submitBtn(el).textContent).toBe('Komplette Serie anfragen');
      expect(submitBtn(el).disabled).toBe(false);
    });

    it('wechselt auf die Staffel- und die Folgenauswahl', () => {
      const el = mount();

      modeBtn(el, 'season').click();
      expect(activeMode(el)).toBe('season');
      expect(el.querySelector('.request-scope-season-grid')).toBeTruthy();
      expect(hintText(el)).toBe('Wähle mindestens eine Staffel.');

      modeBtn(el, 'episode').click();
      expect(activeMode(el)).toBe('episode');
      expect(el.querySelector('.request-scope-episode-seasons')).toBeTruthy();
      expect(hintText(el)).toBe('Wähle eine Folge aus.');
    });

    it('blendet die Specials in der Folgenauswahl aus', () => {
      const el = mount();

      modeBtn(el, 'episode').click();

      expect(toggleBtn(el, 0)).toBeNull();
      expect(toggleBtn(el, 1)).toBeTruthy();
      expect(toggleBtn(el, 2)).toBeTruthy();
    });

    it('zeigt ohne Staffeldaten keine Modus-Umschaltung', () => {
      const el = mount({ seasons: [] });

      expect(el.querySelectorAll('.request-scope-mode')).toHaveLength(0);
      expect(noteText(el)).toBe('Es werden alle Staffeln der Serie angefragt.');
    });

    it('startet bei den Einzelstaffeln, wenn die Serie schon in der Bibliothek liegt', () => {
      const el = mount({ seriesExists: true });

      expect(activeMode(el)).toBe('season');
      modeBtn(el, 'all').click();
      expect(noteText(el)).toBe('Die Serie ist bereits in der Bibliothek. Frage einzelne Staffeln oder Folgen an.');
      expect(submitBtn(el).disabled).toBe(true);
      expect(hintText(el)).toBe('Bereits in der Bibliothek.');
    });

    it('startet bei den Einzelstaffeln, wenn die komplette Serie schon angefragt ist', () => {
      const coverage = buildRequestCoverage([
        { tmdb_id: 42, tmdb_type: 'tv', request_scope: 'all', status: 'pending' }
      ], 42, 'tv');
      const el = mount({ coverage });

      expect(activeMode(el)).toBe('season');
      modeBtn(el, 'all').click();
      expect(noteText(el)).toBe('Die komplette Serie ist bereits angefragt.');
      expect(submitBtn(el).disabled).toBe(true);
      expect(hintText(el)).toBe('Bereits angefragt.');
    });

    it('bleibt bei der kompletten Serie, wenn es gar keine Staffelliste gibt', () => {
      const el = mount({ seasons: [], seriesExists: true });

      expect(el.querySelectorAll('.request-scope-mode')).toHaveLength(0);
      expect(submitBtn(el).disabled).toBe(true);
    });
  });

  describe('gesperrter Titel', () => {
    it('startet bei den Einzelstaffeln und begründet die Sperre', () => {
      const el = mount({ banned: true });

      expect(activeMode(el)).toBe('season');
      expect(submitBtn(el).disabled).toBe(true);
      expect(hintText(el)).toBe('Dieser Titel wurde abgelehnt.');
    });

    it('lässt keine Staffel auswählen und keine Anfrage abschicken', () => {
      const el = mount({ banned: true });

      expect(seasonBtn(el, 1).disabled).toBe(true);
      expect(seasonBtn(el, 2).disabled).toBe(true);

      seasonBtn(el, 1).click();
      expect(seasonBtn(el, 1).getAttribute('aria-pressed')).toBe('false');

      submitBtn(el).click();
      expect(RequestsApi.createRequest).not.toHaveBeenCalled();
    });

    it('sperrt auch die komplette Serie und nennt den Grund im Panel', () => {
      const el = mount({ banned: true });

      modeBtn(el, 'all').click();

      expect(noteText(el)).toBe('Dieser Titel wurde abgelehnt und kann nicht angefragt werden.');
      expect(submitBtn(el).disabled).toBe(true);
      expect(hintText(el)).toBe('Dieser Titel wurde abgelehnt.');

      submitBtn(el).click();
      expect(RequestsApi.createRequest).not.toHaveBeenCalled();
    });

    it('sperrt jede einzelne Folge', async () => {
      const el = mount({ banned: true });

      await expandSeason(el, 1);

      expect(episodeBtn(el, 1, 1).disabled).toBe(true);
      expect(episodeBtn(el, 1, 2).disabled).toBe(true);

      episodeBtn(el, 1, 1).click();
      expect(submitBtn(el).disabled).toBe(true);
      expect(RequestsApi.createRequest).not.toHaveBeenCalled();
    });
  });

  describe('nicht anfragbare Staffeln', () => {
    it('sperrt Specials und Staffeln, die schon in der Bibliothek liegen', () => {
      const el = mount({
        seriesExists: true,
        seasons: [makeSeason(0), makeSeason(1, { exists: true, requestable: false }), makeSeason(2)]
      });

      expect(seasonBtn(el, 0).disabled).toBe(true);
      expect(seasonState(el, 0)).toBe('Specials');

      expect(seasonBtn(el, 1).disabled).toBe(true);
      expect(seasonState(el, 1)).toBe('In Bibliothek');

      expect(seasonBtn(el, 2).disabled).toBe(false);
      expect(seasonState(el, 2)).toBeNull();
    });

    it('sperrt bereits angefragte Staffeln und markiert sie als angefragt', () => {
      const coverage = buildRequestCoverage([
        { tmdb_id: 42, tmdb_type: 'tv', request_scope: 'season', season_number: 1, status: 'pending' }
      ], 42, 'tv');
      const el = mount({ coverage });

      modeBtn(el, 'season').click();

      expect(seasonBtn(el, 1).disabled).toBe(true);
      expect(seasonState(el, 1)).toBe('Angefragt');
      expect(seasonBtn(el, 2).disabled).toBe(false);
    });

    it('sperrt bereits angefragte Folgen', async () => {
      const coverage = buildRequestCoverage([
        { tmdb_id: 42, tmdb_type: 'tv', request_scope: 'episode', season_number: 1, episode_number: 2, status: 'pending' }
      ], 42, 'tv');
      const el = mount({ coverage });

      await expandSeason(el, 1);

      expect(episodeBtn(el, 1, 1).disabled).toBe(false);
      expect(episodeBtn(el, 1, 2).disabled).toBe(true);
      expect(episodeBtn(el, 1, 2).textContent).toContain('Angefragt');
    });
  });

  describe('Folgen laden', () => {
    it('lädt die Folgen einer aufgeklappten Staffel', async () => {
      const el = mount();

      await expandSeason(el, 2);

      expect(RequestsApi.getSeason).toHaveBeenCalledWith(42, 2);
      expect(episodeBtn(el, 2, 1).textContent).toContain('S02E01');
      expect(el.querySelector('.section-loader')).toBeNull();
    });

    it('zeigt einen Ladezustand, solange die Folgen unterwegs sind', async () => {
      const pending = deferred();
      RequestsApi.getSeason.mockReturnValue(pending.promise);
      const el = mount();

      modeBtn(el, 'episode').click();
      toggleBtn(el, 1).click();

      expect(el.querySelector('.section-loader')).toBeTruthy();

      pending.resolve({ episodes: [] });
      await flush();

      expect(el.querySelector('.section-loader')).toBeNull();
      expect(noteText(el)).toBe('Keine Folgen gefunden.');
    });

    it('zeigt die Fehlermeldung und lässt keinen Spinner zurück, wenn getSeason ablehnt', async () => {
      RequestsApi.getSeason.mockRejectedValue(new Error('TMDB nicht erreichbar'));
      const el = mount();

      await expandSeason(el, 1);

      expect(el.querySelector('.request-scope-note-error').textContent).toBe('TMDB nicht erreichbar');
      expect(el.querySelector('.section-loader')).toBeNull();
      expect(el.querySelector('.request-scope-episodes-retry')).toBeTruthy();
    });

    it('lädt nach einem Fehler über den Wiederholen-Knopf neu', async () => {
      RequestsApi.getSeason.mockRejectedValueOnce(new Error('TMDB nicht erreichbar'));
      const el = mount();

      await expandSeason(el, 1);
      expect(RequestsApi.getSeason).toHaveBeenCalledTimes(1);

      el.querySelector('.request-scope-episodes-retry').click();
      await flush();

      expect(RequestsApi.getSeason).toHaveBeenCalledTimes(2);
      expect(el.querySelector('.request-scope-note-error')).toBeNull();
      expect(episodeBtn(el, 1, 1)).toBeTruthy();
    });

    it('lädt eine fehlgeschlagene Staffel beim erneuten Aufklappen wieder', async () => {
      RequestsApi.getSeason.mockRejectedValueOnce(new Error('TMDB nicht erreichbar'));
      const el = mount();

      await expandSeason(el, 1);
      expect(RequestsApi.getSeason).toHaveBeenCalledTimes(1);

      toggleBtn(el, 1).click();
      expect(toggleBtn(el, 1).getAttribute('aria-expanded')).toBe('false');

      toggleBtn(el, 1).click();
      await flush();

      expect(RequestsApi.getSeason).toHaveBeenCalledTimes(2);
      expect(episodeBtn(el, 1, 1)).toBeTruthy();
    });

    it('lädt eine erfolgreich geladene Staffel nicht erneut', async () => {
      const el = mount();

      await expandSeason(el, 1);
      toggleBtn(el, 1).click();
      toggleBtn(el, 1).click();
      await flush();

      expect(RequestsApi.getSeason).toHaveBeenCalledTimes(1);
    });

    it('zeigt bei einem 401 keine Fehlermeldung, weil der Client zum Login umleitet', async () => {
      const authError = new Error('Unauthorized');
      authError.isAuthError = true;
      RequestsApi.getSeason.mockRejectedValue(authError);
      const el = mount();

      await expandSeason(el, 1);

      expect(el.querySelector('.request-scope-note-error')).toBeNull();
      expect(el.querySelector('.request-scope-episodes-retry')).toBeNull();
      // Der Ladezustand bleibt absichtlich stehen: die Seite wechselt ohnehin zum Login.
      expect(el.querySelector('.section-loader')).toBeTruthy();
      expect(appStore.showToast).not.toHaveBeenCalled();
    });
  });

  describe('Anfragen abschicken', () => {
    it('fragt die komplette Serie an', async () => {
      const el = mount();

      submitBtn(el).click();
      await flush();

      expect(RequestsApi.createRequest).toHaveBeenCalledTimes(1);
      expect(RequestsApi.createRequest).toHaveBeenCalledWith(42, 'tv', '', { scope: 'all' });
      expect(appStore.showToast).toHaveBeenCalledWith('„Komplette Serie“ angefragt', 'success');
    });

    it('fragt eine einzelne Folge an und meldet sie zurück', async () => {
      const onCreated = vi.fn();
      const el = mount({ onCreated });

      await expandSeason(el, 1);
      episodeBtn(el, 1, 2).click();
      expect(submitBtn(el).textContent).toBe('Folge anfragen');

      submitBtn(el).click();
      await flush();

      expect(RequestsApi.createRequest).toHaveBeenCalledWith(42, 'tv', '', {
        scope: 'episode',
        seasonNumber: 1,
        episodeNumber: 2
      });
      expect(onCreated).toHaveBeenCalledWith([{ scope: 'episode', seasonNumber: 1, episodeNumber: 2 }]);
      expect(appStore.showToast).toHaveBeenCalledWith('„S01E02“ angefragt', 'success');
    });

    it('schickt mehrere Staffeln nacheinander, nicht parallel', async () => {
      const first = deferred();
      const second = deferred();
      RequestsApi.createRequest
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise);

      const el = mount();
      modeBtn(el, 'season').click();
      seasonBtn(el, 1).click();
      seasonBtn(el, 2).click();
      expect(submitBtn(el).textContent).toBe('2 Staffeln anfragen');

      submitBtn(el).click();
      await flush();

      // The loop awaits each call, so the second must not have started yet.
      expect(RequestsApi.createRequest).toHaveBeenCalledTimes(1);
      expect(RequestsApi.createRequest).toHaveBeenNthCalledWith(1, 42, 'tv', '', { scope: 'season', seasonNumber: 1 });
      expect(submitBtn(el).textContent).toBe('Wird angefragt...');
      expect(submitBtn(el).getAttribute('aria-busy')).toBe('true');
      expect(submitBtn(el).disabled).toBe(true);

      first.resolve({ id: 'req-1' });
      await flush();

      expect(RequestsApi.createRequest).toHaveBeenCalledTimes(2);
      expect(RequestsApi.createRequest).toHaveBeenNthCalledWith(2, 42, 'tv', '', { scope: 'season', seasonNumber: 2 });

      second.resolve({ id: 'req-2' });
      await flush();

      expect(appStore.showToast).toHaveBeenCalledWith('2 Anfragen erstellt', 'success');
      expect(submitBtn(el).hasAttribute('aria-busy')).toBe(false);
    });

    it('meldet Erfolg und Fehlschlag einer Teilauswahl und behält nur die gescheiterte Staffel', async () => {
      const conflict = new Error('Bereits angefragt');
      conflict.status = 409;
      RequestsApi.createRequest
        .mockRejectedValueOnce(conflict)
        .mockResolvedValueOnce({ id: 'req-2' });

      const onCreated = vi.fn();
      const el = mount({ onCreated });
      modeBtn(el, 'season').click();
      seasonBtn(el, 1).click();
      seasonBtn(el, 2).click();

      submitBtn(el).click();
      await flush();

      const expected = '1 von 2 Anfragen erstellt. Fehlgeschlagen: Staffel 1 (Bereits angefragt)';
      expect(appStore.showToast).toHaveBeenCalledWith(expected, 'error');
      expect(hintText(el)).toBe(expected);
      expect(el.querySelector('.request-scope-hint-error')).toBeTruthy();

      expect(onCreated).toHaveBeenCalledWith([{ scope: 'season', seasonNumber: 2 }]);

      // Staffel 2 ist raus aus der Auswahl und gilt jetzt als angefragt.
      expect(seasonBtn(el, 2).getAttribute('aria-pressed')).toBe('false');
      expect(seasonBtn(el, 2).disabled).toBe(true);
      expect(seasonState(el, 2)).toBe('Angefragt');

      // Staffel 1 bleibt ausgewählt, damit der Nutzer es erneut versuchen kann.
      expect(seasonBtn(el, 1).getAttribute('aria-pressed')).toBe('true');
      expect(submitBtn(el).textContent).toBe('Staffel anfragen');
      expect(submitBtn(el).disabled).toBe(false);
    });

    it('zeigt bei einem reinen Auth-Fehler keinen Toast', async () => {
      const authError = new Error('Unauthorized');
      authError.isAuthError = true;
      RequestsApi.createRequest.mockRejectedValue(authError);

      const el = mount();
      modeBtn(el, 'season').click();
      seasonBtn(el, 1).click();

      submitBtn(el).click();
      await flush();

      expect(RequestsApi.createRequest).toHaveBeenCalledTimes(1);
      expect(appStore.showToast).not.toHaveBeenCalled();
      expect(hintText(el)).toBe('');
      expect(el.querySelector('.request-scope-hint-error')).toBeNull();
    });

    it('schickt ohne Auswahl gar nichts ab', () => {
      const el = mount();
      modeBtn(el, 'season').click();

      expect(submitBtn(el).disabled).toBe(true);
      submitBtn(el).click();

      expect(RequestsApi.createRequest).not.toHaveBeenCalled();
    });
  });
});
