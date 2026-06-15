import env from '../config/env.js';

const SEER_BASE_URL = env.SEER_BASE_URL;
const SEER_API_KEY = env.SEER_API_KEY;

class SeerService {
  static async signIn(username, password) {
    const url = `${SEER_BASE_URL}/api/v1/auth/signin`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        password
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Seer signin failed: ${response.status} ${errorText}`);
    }

    return await response.json();
  }

  static async search(query, apiKey) {
    const url = `${SEER_BASE_URL}/api/v1/search?query=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Seer search failed: ${response.statusText}`);
    }

    return await response.json();
  }

  static async getMovieDetails(movieId, apiKey) {
    const url = `${SEER_BASE_URL}/api/v1/movie/${movieId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Seer movie details failed: ${response.statusText}`);
    }

    return await response.json();
  }

  static async getTvDetails(tvId, apiKey) {
    const url = `${SEER_BASE_URL}/api/v1/tv/${tvId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Seer TV details failed: ${response.statusText}`);
    }

    return await response.json();
  }

  static async requestMedia(data, userToken) {
    const url = `${SEER_BASE_URL}/api/v1/request`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMsg = `Seer request failed: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMsg = errorJson.message || errorMsg;
      } catch {}
      const error = new Error(errorMsg);
      error.status = response.status;
      throw error;
    }

    return await response.json();
  }

  static async getMyRequests(userToken, filter = {}) {
    const params = new URLSearchParams();
    if (filter.take) params.set('take', filter.take);
    if (filter.skip) params.set('skip', filter.skip);
    if (filter.filter) params.set('filter', filter.filter);

    const queryString = params.toString();
    const url = `${SEER_BASE_URL}/api/v1/request${queryString ? '?' + queryString : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Seer get requests failed: ${response.statusText}`);
    }

    return await response.json();
  }

  static async deleteRequest(requestId, userToken) {
    const url = `${SEER_BASE_URL}/api/v1/request/${requestId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Seer delete request failed: ${response.statusText}`);
    }

    return true;
  }
}

export { SeerService };