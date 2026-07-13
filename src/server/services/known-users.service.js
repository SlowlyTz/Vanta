export class KnownUsersService {
  static usersById = new Map();
  static userIdByNormalizedName = new Map();

  static normalize(username) {
    return String(username || '').trim().toLowerCase();
  }

  static remember({ userId, username }) {
    const normalizedUsername = this.normalize(username);
    if (!userId || !normalizedUsername) return null;

    const entry = {
      userId,
      username: String(username).trim(),
      normalizedUsername,
      lastSeenAt: Date.now()
    };

    this.usersById.set(userId, entry);
    this.userIdByNormalizedName.set(normalizedUsername, userId);
    return entry;
  }

  static findByExactUsername(username) {
    const userId = this.userIdByNormalizedName.get(this.normalize(username));
    return userId ? this.usersById.get(userId) : null;
  }
}
