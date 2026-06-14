import env from '../config/env.js';

const JELLYFIN_BASE_URL = env.JELLYFIN_BASE_URL;

const getAuthHeader = (token = null) => {
  let header = 'MediaBrowser Client="Slowly Stream", Device="Web Browser", DeviceId="slowly-stream-client-id", Version="1.0.0"';
  if (token) {
    header += `, Token="${token}"`;
  }
  return header;
};

const COMMON_ITEM_FIELDS = [
  'PrimaryImageAspectRatio',
  'BasicSyncInfo',
  'Overview',
  'Genres',
  'ImageTags',
  'BackdropImageTags',
  'ParentBackdropItemId',
  'ParentBackdropImageTags',
  'SeriesPrimaryImageTag',
  'SeriesName',
  'SeriesId',
  'SeasonName',
  'ParentIndexNumber',
  'IndexNumber',
  'ParentId',
  'AlbumPrimaryImageTag',
  'AlbumId'
].join(',');

const DETAIL_ITEM_FIELDS = [
  COMMON_ITEM_FIELDS,
  'People',
  'Studios',
  'Taglines',
  'OfficialRating',
  'CommunityRating',
  'CriticRating',
  'OriginalTitle'
].join(',');

export class JellyfinService {
  static async login(username, password) {
    const url = `${JELLYFIN_BASE_URL}/Users/AuthenticateByName`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emby-Authorization': getAuthHeader()
      },
      body: JSON.stringify({
        Username: username,
        Pw: password
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Login failed: ${response.statusText || errorText}`);
    }

    return await response.json();
  }

  static async getCurrentUser(userId, token) {
    const url = `${JELLYFIN_BASE_URL}/Users/${userId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Emby-Authorization': getAuthHeader(token)
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch current user info: ${response.statusText}`);
    }

    return await response.json();
  }

  static async changePassword(userId, token, currentPassword, newPassword) {
    const url = `${JELLYFIN_BASE_URL}/Users/${userId}/Password`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emby-Authorization': getAuthHeader(token)
      },
      body: JSON.stringify({
        CurrentPw: currentPassword,
        NewPw: newPassword
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      const error = new Error(`Failed to change password: ${response.statusText || errorText}`);
      error.status = response.status;
      throw error;
    }

    return true;
  }

  static async getResumeItems(userId, token) {
    const url = `${JELLYFIN_BASE_URL}/Users/${userId}/Items?Filters=IsResumable&Recursive=true&SortBy=DatePlayed&SortOrder=Descending&Fields=${encodeURIComponent(COMMON_ITEM_FIELDS)}&Limit=12`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Emby-Authorization': getAuthHeader(token)
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch resume items: ${response.statusText}`);
    }

    const data = await response.json();
    return data.Items || [];
  }

  static async getMovies(userId, token) {
    const url = `${JELLYFIN_BASE_URL}/Users/${userId}/Items?IncludeItemTypes=Movie&Recursive=true&SortBy=DateCreated,SortName&SortOrder=Descending&Fields=${encodeURIComponent(COMMON_ITEM_FIELDS)}&Limit=24`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Emby-Authorization': getAuthHeader(token)
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch movies: ${response.statusText}`);
    }

    const data = await response.json();
    return data.Items || [];
  }

  static async getSeries(userId, token) {
    const url = `${JELLYFIN_BASE_URL}/Users/${userId}/Items?IncludeItemTypes=Series&Recursive=true&SortBy=DateCreated,SortName&SortOrder=Descending&Fields=${encodeURIComponent(COMMON_ITEM_FIELDS)}&Limit=24`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Emby-Authorization': getAuthHeader(token)
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch series: ${response.statusText}`);
    }

    const data = await response.json();
    return data.Items || [];
  }

  static async search(userId, token, query) {
    const url = `${JELLYFIN_BASE_URL}/Users/${userId}/Items?SearchTerm=${encodeURIComponent(query)}&Recursive=true&Fields=${encodeURIComponent(COMMON_ITEM_FIELDS)}&Limit=50`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Emby-Authorization': getAuthHeader(token)
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to execute search: ${response.statusText}`);
    }

    const data = await response.json();
    return data.Items || [];
  }

  static async getItemDetails(userId, token, itemId) {
    // Request additional fields like People, Studios, Similar, Taglines etc.
    const url = `${JELLYFIN_BASE_URL}/Users/${userId}/Items/${itemId}?Fields=${encodeURIComponent(DETAIL_ITEM_FIELDS)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Emby-Authorization': getAuthHeader(token)
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch item details: ${response.statusText}`);
    }

    return await response.json();
  }

  static async getSimilarItems(userId, token, itemId) {
    const url = `${JELLYFIN_BASE_URL}/Items/${itemId}/Similar?userId=${userId}&limit=12&fields=${encodeURIComponent(COMMON_ITEM_FIELDS)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Emby-Authorization': getAuthHeader(token)
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch similar items: ${response.statusText}`);
    }

    const data = await response.json();
    return data.Items || [];
  }

  static async getSeasons(userId, token, seriesId) {
    const url = `${JELLYFIN_BASE_URL}/Shows/${seriesId}/Seasons?userId=${userId}&fields=${encodeURIComponent(COMMON_ITEM_FIELDS)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Emby-Authorization': getAuthHeader(token)
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch seasons: ${response.statusText}`);
    }

    const data = await response.json();
    return data.Items || [];
  }

  static async getEpisodes(userId, token, seriesId, seasonId) {
    let url = `${JELLYFIN_BASE_URL}/Shows/${seriesId}/Episodes?userId=${userId}&fields=${encodeURIComponent(COMMON_ITEM_FIELDS)}`;
    if (seasonId) {
      url += `&seasonId=${seasonId}`;
    }
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Emby-Authorization': getAuthHeader(token)
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch episodes: ${response.statusText}`);
    }

    const data = await response.json();
    return data.Items || [];
  }

  static async getGenres(userId, token, type) {
    const url = `${JELLYFIN_BASE_URL}/Genres?userId=${userId}&IncludeItemTypes=${type}&Recursive=true`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Emby-Authorization': getAuthHeader(token)
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch genres: ${response.statusText}`);
    }

    const data = await response.json();
    return data.Items || [];
  }

  static async getStudios(userId, token) {
    const url = `${JELLYFIN_BASE_URL}/Studios?userId=${userId}&Recursive=true&SortBy=SortName&SortOrder=Ascending`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Emby-Authorization': getAuthHeader(token)
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch studios: ${response.statusText}`);
    }

    const data = await response.json();
    return data.Items || [];
  }

  static async getLibrary(userId, token, type, genre = null, studio = null) {
    let url = `${JELLYFIN_BASE_URL}/Users/${userId}/Items?IncludeItemTypes=${type}&Recursive=true&Fields=${encodeURIComponent(COMMON_ITEM_FIELDS)}&SortBy=SortName&SortOrder=Ascending&Limit=100`;
    if (genre) {
      url += `&Genres=${encodeURIComponent(genre)}`;
    }
    if (studio) {
      url += `&Studios=${encodeURIComponent(studio)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Emby-Authorization': getAuthHeader(token)
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch library: ${response.statusText}`);
    }

    const data = await response.json();
    return data.Items || [];
  }

  static async fetchImageStream(itemId, token, type = 'Primary', query = {}) {
    const urlParams = new URLSearchParams();
    if (query.tag) urlParams.append('tag', query.tag);
    if (query.width) urlParams.append('width', query.width);
    if (query.height) urlParams.append('height', query.height);
    if (query.maxWidth) urlParams.append('maxWidth', query.maxWidth);
    if (query.maxHeight) urlParams.append('maxHeight', query.maxHeight);
    if (query.quality) urlParams.append('quality', query.quality);

    const queryString = urlParams.toString();
    const url = `${JELLYFIN_BASE_URL}/Items/${itemId}/Images/${type}${queryString ? '?' + queryString : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Emby-Authorization': getAuthHeader(token)
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    return response;
  }

  static async fetchVideoStream(itemId, token, rangeHeader) {
    // container=mp4, videoCodec=h264, audioCodec=aac, audioChannels=2, api_key=token
    // We add high-quality bitrate parameters to prevent Jellyfin from defaulting to low quality.
    const url = `${JELLYFIN_BASE_URL}/Videos/${itemId}/stream?container=mp4&videoCodec=h264&audioCodec=aac&audioChannels=2&maxBitrate=100000000&videoBitrate=40000000&audioBitrate=320000&api_key=${token}`;
    const headers = {};

    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    return response;
  }

  static async getPersonDetails(userId, token, personId) {
    const url = `${JELLYFIN_BASE_URL}/Users/${userId}/Items/${personId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Emby-Authorization': getAuthHeader(token)
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch person details: ${response.statusText}`);
    }

    return await response.json();
  }

  static async getPersonDetailsByName(userId, token, personName) {
    const searchUrl = `${JELLYFIN_BASE_URL}/Users/${userId}/Items?SearchTerm=${encodeURIComponent(personName)}&IncludeItemTypes=Person&Recursive=true&Limit=1`;
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'X-Emby-Authorization': getAuthHeader(token)
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to find person: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.Items && data.Items.length > 0) {
      return await this.getPersonDetails(userId, token, data.Items[0].Id);
    }
    throw new Error(`Person not found: ${personName}`);
  }

  static async getPersonItems(userId, token, personId) {
    const url = `${JELLYFIN_BASE_URL}/Users/${userId}/Items?PersonIds=${personId}&Recursive=true&Fields=${encodeURIComponent(COMMON_ITEM_FIELDS)}&Limit=100`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Emby-Authorization': getAuthHeader(token)
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch person items: ${response.statusText}`);
    }

    const data = await response.json();
    return data.Items || [];
  }

  static async getPersonItemsByName(userId, token, personName) {
    const url = `${JELLYFIN_BASE_URL}/Users/${userId}/Items?People=${encodeURIComponent(personName)}&Recursive=true&Fields=${encodeURIComponent(COMMON_ITEM_FIELDS)}&Limit=100`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Emby-Authorization': getAuthHeader(token)
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch person items: ${response.statusText}`);
    }

    const data = await response.json();
    return data.Items || [];
  }
}
