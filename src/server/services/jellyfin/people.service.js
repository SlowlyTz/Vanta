import { jellyfinJson } from './client.js';
import { COMMON_ITEM_FIELDS } from './fields.js';

export class PeopleService {
  static async getPersonDetails(userId, token, personId) {
    return jellyfinJson(`/Users/${userId}/Items/${personId}`, { token });
  }

  static async getPersonDetailsByName(userId, token, personName) {
    const data = await jellyfinJson(`/Users/${userId}/Items`, {
      token,
      query: {
        SearchTerm: personName,
        IncludeItemTypes: 'Person',
        Recursive: 'true',
        Limit: 1
      }
    });

    if (data.Items && data.Items.length > 0) {
      return this.getPersonDetails(userId, token, data.Items[0].Id);
    }
    throw new Error(`Person not found: ${personName}`);
  }

  static async getPersonItems(userId, token, personId) {
    const data = await jellyfinJson(`/Users/${userId}/Items`, {
      token,
      query: {
        PersonIds: personId,
        Recursive: 'true',
        Fields: COMMON_ITEM_FIELDS,
        Limit: 100
      }
    });
    return data.Items || [];
  }

  static async getPersonItemsByName(userId, token, personName) {
    const data = await jellyfinJson(`/Users/${userId}/Items`, {
      token,
      query: {
        People: personName,
        Recursive: 'true',
        Fields: COMMON_ITEM_FIELDS,
        Limit: 100
      }
    });
    return data.Items || [];
  }
}
