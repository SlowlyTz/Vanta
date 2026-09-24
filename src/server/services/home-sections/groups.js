export const groupMethods = {
  async getHomeSectionGroup(userId, accessToken, group) {
    if (group === 'now-playing') {
      const items = await this._buildIndex(userId, accessToken);
      return [await this._buildNowPlayingSection(items)];
    }

    if (group === 'genres') {
      const items = await this._buildIndex(userId, accessToken);
      return this._buildGenreSections(userId, accessToken, items);
    }

    if (group === 'featured') {
      const items = await this._buildIndex(userId, accessToken);
      return this._buildFeaturedSections(items);
    }

    if (group === 'publishers') {
      return this._buildPublisherSections(userId, accessToken);
    }

    const error = new Error(`Unknown home section group: ${group}`);
    error.status = 400;
    throw error;
  }
};
