export function createBaseItem(overrides = {}) {
  return {
    Id: 'item-1',
    Type: 'Movie',
    Name: 'Test Movie',
    Overview: 'A test movie.',
    ProductionYear: 2024,
    ImageTags: { Primary: 'primary-tag' },
    BackdropImageTags: ['backdrop-tag'],
    UserData: { IsFavorite: false },
    ...overrides
  };
}
