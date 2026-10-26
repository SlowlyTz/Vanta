// Accounts seen at login (or in a stored session), so a watch party can
// invite them by exact username.
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

    // A renamed account is no longer found under its old name.
    const previous = this.usersById.get(userId);
    if (previous && previous.normalizedUsername !== normalizedUsername
      && this.userIdByNormalizedName.get(previous.normalizedUsername) === userId) {
      this.userIdByNormalizedName.delete(previous.normalizedUsername);
    }
    this.usersById.set(userId, entry);
    this.userIdByNormalizedName.set(normalizedUsername, userId);
    return entry;
  }

  static findByExactUsername(username) {
    const userId = this.userIdByNormalizedName.get(this.normalize(username));
    return userId ? this.usersById.get(userId) : null;
  }
}
