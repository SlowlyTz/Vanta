import { describe, it, expect, vi } from 'vitest';
import { createSubtitleController } from '../../../src/player/src/subtitles.js';
import { createQualityController } from '../../../src/player/src/quality.js';

function fakeTextTracks() {
  const tracks = new Map();
  return {
    tracks,
    add: vi.fn(init => tracks.set(init.id, { ...init, mode: 'disabled', setMode(mode) { this.mode = mode; } })),
    getById: id => tracks.get(id) || null,
    remove: vi.fn(track => tracks.delete(track.id))
  };
}

describe('createSubtitleController', () => {
  const playback = { subtitles: [
    { index: 3, label: 'Deutsch', language: 'de', url: '/s/3.vtt', type: 'vtt' },
    { index: 4, label: 'English', language: 'en', url: '/s/4.vtt', type: 'vtt', isForced: true }
  ] };

  it('registriert die Spuren, zeigt die gewählte und meldet sie dem Reporter', () => {
    const textTracks = fakeTextTracks();
    const reporter = { setSubtitleStreamIndex: vi.fn() };
    const onChange = vi.fn();
    const controller = createSubtitleController({ player: { textTracks }, reporter, onChange });

    controller.update(playback);
    expect(textTracks.add).toHaveBeenCalledTimes(2);
    expect(controller.getCurrentLabel()).toBe('Aus');
    expect(controller.getOptions().map(option => option.label)).toEqual(['Aus', 'English · Forced', 'Deutsch']);

    controller.select('vanta-subtitle-3');
    expect(textTracks.getById('vanta-subtitle-3').mode).toBe('showing');
    expect(textTracks.getById('vanta-subtitle-4').mode).toBe('disabled');
    expect(reporter.setSubtitleStreamIndex).toHaveBeenLastCalledWith(3);
    expect(controller.getCurrentLabel()).toBe('Deutsch');
    expect(controller.getOptions().find(option => option.selected).id).toBe('vanta-subtitle-3');
    expect(onChange).toHaveBeenCalled();
  });

  it('behält die Auswahl beim Quellwechsel und nennt fehlende Untertitel', () => {
    const controller = createSubtitleController({ player: { textTracks: fakeTextTracks() }, reporter: { setSubtitleStreamIndex: vi.fn() } });
    controller.update(playback);
    controller.select('vanta-subtitle-4');
    controller.update(playback);
    expect(controller.getCurrentId()).toBe('vanta-subtitle-4');

    controller.update({ subtitles: [] });
    expect(controller.getCurrentLabel()).toBe('Keine');
  });
});

describe('createSubtitleController · toggle', () => {
  it('schaltet mit C zwischen aus und der zuletzt gezeigten Spur um', () => {
    const controller = createSubtitleController({ player: { textTracks: fakeTextTracks() }, reporter: { setSubtitleStreamIndex: vi.fn() } });
    controller.update({ subtitles: [{ index: 3, label: 'Deutsch' }, { index: 4, label: 'English' }] });

    controller.toggle();
    expect(controller.getCurrentId()).toBe('vanta-subtitle-3');
    controller.select('vanta-subtitle-4');
    controller.toggle();
    expect(controller.getCurrentId()).toBe('off');
    controller.toggle();
    expect(controller.getCurrentId()).toBe('vanta-subtitle-4');
  });
});

describe('createQualityController', () => {
  it('sortiert Profile, beschriftet die aktuelle Wahl und meldet nur echte Wechsel', () => {
    const onSelect = vi.fn();
    const controller = createQualityController({ onSelect });
    controller.update([{ id: '720p', label: '720p', maxStreamingBitrate: 4_000_000 }, { id: 'auto' }], 'auto');

    expect(controller.getOptions().map(option => option.id)).toEqual(['auto', '720p']);
    expect(controller.getCurrentLabel()).toBe('Auto');
    expect(controller.hasChoices()).toBe(true);

    controller.select('auto');
    expect(onSelect).not.toHaveBeenCalled();
    controller.select('720p');
    expect(onSelect).toHaveBeenCalledWith('720p');
  });
});
