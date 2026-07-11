import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEpisodeBrowser, formatEpisodeCode, findEpisode } from '../../src/episodes.js';

function makeContext(overrides = {}) {
  return {
    seriesId: 'series-1',
    seriesName: 'Test Series',
    currentEpisodeId: 'ep-1',
    seasons: [{ Id: 'season-1', Name: 'Staffel 1', IndexNumber: 1 }],
    episodesBySeason: {
      'season-1': [
        { Id: 'ep-1', Name: 'Pilot', ParentIndexNumber: 1, IndexNumber: 1 },
        { Id: 'ep-2', Name: 'Folge 2', ParentIndexNumber: 1, IndexNumber: 2 }
      ]
    },
    ...overrides
  };
}

describe('formatEpisodeCode', () => {
  it('formatiert Staffel und Episode zweistellig', () => {
    expect(formatEpisodeCode({ ParentIndexNumber: 1, IndexNumber: 2 })).toBe('S01E02');
    expect(formatEpisodeCode({ ParentIndexNumber: 12, IndexNumber: 34 })).toBe('S12E34');
  });
});

describe('findEpisode', () => {
  it('findet eine Episode über alle Staffeln hinweg', () => {
    const context = makeContext();
    expect(findEpisode(context, 'ep-2')?.Name).toBe('Folge 2');
    expect(findEpisode(context, 'unknown')).toBeNull();
  });
});

describe('createEpisodeBrowser', () => {
  let buttonContainer;
  let menuContainer;

  beforeEach(() => {
    buttonContainer = document.createElement('div');
    menuContainer = document.createElement('div');
    document.body.appendChild(buttonContainer);
    document.body.appendChild(menuContainer);
  });

  it('zeigt den Button erscheint bei Serienkontext und öffnet das Panel per Klick', () => {
    const browser = createEpisodeBrowser({
      buttonContainer,
      menuContainer,
      context: makeContext(),
      readonly: false,
      onSelectEpisode: vi.fn()
    });

    expect(buttonContainer.querySelector('.vanta-player-episodes-button')).toBeTruthy();
    const panel = menuContainer.querySelector('.vanta-player-episodes-panel');
    expect(panel.hidden).toBe(true);

    browser.button.click();
    expect(panel.hidden).toBe(false);

    browser.destroy();
  });

  it('markiert die aktuelle Episode und ruft onSelectEpisode beim Klick auf', () => {
    const onSelectEpisode = vi.fn();
    const browser = createEpisodeBrowser({
      buttonContainer,
      menuContainer,
      context: makeContext(),
      readonly: false,
      onSelectEpisode
    });

    const currentRow = menuContainer.querySelector('[data-episode-id="ep-1"]');
    expect(currentRow.classList.contains('is-current')).toBe(true);

    const otherRow = menuContainer.querySelector('[data-episode-id="ep-2"]');
    otherRow.click();

    expect(onSelectEpisode).toHaveBeenCalledWith(expect.objectContaining({ Id: 'ep-2', Name: 'Folge 2' }));

    browser.destroy();
  });

  it('deaktiviert den Episoden-Wechsel im readonly-Modus (Viewer)', () => {
    const onSelectEpisode = vi.fn();
    const browser = createEpisodeBrowser({
      buttonContainer,
      menuContainer,
      context: makeContext(),
      readonly: true,
      onSelectEpisode
    });

    const row = menuContainer.querySelector('[data-episode-id="ep-2"]');
    expect(row.disabled).toBe(true);

    row.click();
    expect(onSelectEpisode).not.toHaveBeenCalled();

    browser.destroy();
  });
});
