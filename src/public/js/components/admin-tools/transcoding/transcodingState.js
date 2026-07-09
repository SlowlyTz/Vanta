import { AdminApi } from '../../../api/admin.api.js';

export function createTranscodingState({ onChange }) {
  let forceHlsTranscoding = null;
  let isSaving = false;
  let error = null;

  const emit = () => onChange({ forceHlsTranscoding, isSaving, error });

  const load = async () => {
    forceHlsTranscoding = null;
    isSaving = false;
    error = null;
    emit();

    try {
      const data = await AdminApi.getTranscoding();
      forceHlsTranscoding = data.forceHlsTranscoding === true;
      emit();
    } catch (err) {
      console.error('Failed to load transcoding settings:', err);
      error = err.message || 'Einstellung konnte nicht geladen werden.';
      emit();
    }
  };

  const setEnabled = async (newValue) => {
    if (isSaving || forceHlsTranscoding === null) return;

    isSaving = true;
    error = null;
    emit();

    try {
      const data = await AdminApi.updateTranscoding(newValue);
      forceHlsTranscoding = data.forceHlsTranscoding === true;
    } catch (err) {
      console.error('Failed to update transcoding settings:', err);
      error = err.message || 'Speichern fehlgeschlagen.';
    } finally {
      isSaving = false;
      emit();
    }
  };

  return { load, setEnabled };
}
