import { createDialogContext } from './createWatchPartyDialog/context.js';
import { bindSearch } from './createWatchPartyDialog/search.js';
import { bindEpisodePicker } from './createWatchPartyDialog/episodePicker.js';
import { bindPartyCreation } from './createWatchPartyDialog/partyCreation.js';
import { bindShell } from './createWatchPartyDialog/shell.js';

export function createWatchPartyDialog() {
  const ctx = createDialogContext();

  bindSearch(ctx);
  bindEpisodePicker(ctx);
  bindPartyCreation(ctx);
  bindShell(ctx);

  return {
    element: ctx.backdrop,
    open: () => ctx.setOpen(true),
    close: () => ctx.setOpen(false),
    isOpen: () => ctx.open
  };
}
