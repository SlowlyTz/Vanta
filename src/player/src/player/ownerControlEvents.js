// An admin's own play, pause and seek go to the party as owner commands; the
// ones the sync performs itself are recognised by their echo tokens.
export function bindOwnerControlEvents(context) {
  const { player, listen, watchParty } = context;
  const positionMs = () => Math.round(player.currentTime * 1000);

  listen(player, 'play', () => {
    if (context.canEmitOwnerControl('play')) watchParty.onOwnerPlay?.(positionMs());
  });

  listen(player, 'pause', () => {
    if (context.canEmitOwnerControl('pause')) watchParty.onOwnerPause?.(positionMs());
  });

  // A sync seek into video that is not loaded yet only lands (`seeked`) once
  // the segment is there, often after its token has expired, and would then
  // go out as the admin jumping back to an old position. So its token is
  // taken as the seek starts (`seeking`), and that seek is remembered until
  // it lands.
  let syncSeekInFlight = false;
  listen(player, 'seeking', () => {
    if (context.echoTokens.consume('seek')) syncSeekInFlight = true;
  });

  listen(player, 'seeked', () => {
    const step = context.takePendingSeekStep?.() ?? null;
    if (syncSeekInFlight) {
      syncSeekInFlight = false;
      return;
    }
    if (context.canEmitOwnerControl('seek')) {
      watchParty.onOwnerSeek?.(positionMs(), step ? { step } : {});
    }
  });
}
