// What a party keeps of its title: name, numbers and artwork for the lobby.

// The wide artwork for the lobby: the item's own backdrop, else the one it
// inherits (an episode shows its series' backdrop), else the selected item's.
function resolveBackdrop(playableItem, fallbackItem) {
  if (playableItem.BackdropImageTags?.length) return { id: playableItem.Id, tag: playableItem.BackdropImageTags[0] };
  if (playableItem.ParentBackdropItemId && playableItem.ParentBackdropImageTags?.length) {
    return { id: playableItem.ParentBackdropItemId, tag: playableItem.ParentBackdropImageTags[0] };
  }
  if (fallbackItem?.BackdropImageTags?.length) return { id: fallbackItem.Id, tag: fallbackItem.BackdropImageTags[0] };
  return null;
}

function resolveLogo(playableItem, fallbackItem) {
  if (playableItem.ImageTags?.Logo) return { id: playableItem.Id, tag: playableItem.ImageTags.Logo };
  if (playableItem.ParentLogoItemId && playableItem.ParentLogoImageTag) {
    return { id: playableItem.ParentLogoItemId, tag: playableItem.ParentLogoImageTag };
  }
  if (fallbackItem?.ImageTags?.Logo) return { id: fallbackItem.Id, tag: fallbackItem.ImageTags.Logo };
  return null;
}

export function createItemSnapshot(playableItem, fallbackItem) {
  const isEpisode = playableItem.Type === 'Episode';
  return {
    id: playableItem.Id,
    name: playableItem.Name || playableItem.SeriesName || fallbackItem.Name,
    type: playableItem.Type,
    seriesName: playableItem.SeriesName || null,
    seasonNumber: isEpisode ? playableItem.ParentIndexNumber ?? null : null,
    episodeNumber: isEpisode ? playableItem.IndexNumber ?? null : null,
    productionYear: playableItem.ProductionYear || fallbackItem.ProductionYear || null,
    officialRating: playableItem.OfficialRating || fallbackItem.OfficialRating || null,
    communityRating: playableItem.CommunityRating || fallbackItem.CommunityRating || null,
    criticRating: playableItem.CriticRating || fallbackItem.CriticRating || null,
    runtimeTicks: playableItem.RunTimeTicks || fallbackItem.RunTimeTicks || null,
    backdrop: resolveBackdrop(playableItem, fallbackItem),
    logo: resolveLogo(playableItem, fallbackItem)
  };
}
