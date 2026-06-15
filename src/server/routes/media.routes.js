import express from 'express';
import { Readable } from 'stream';
import { JellyfinService } from '../services/jellyfin.service.js';
import { PlaybackService } from '../services/playback.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

const getSvgPlaceholder = (type) => {
  const width = type === 'Backdrop' ? 320 : 200;
  const height = type === 'Backdrop' ? 180 : 300;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="hsl(240, 10%, 10%)"/>
      <circle cx="${width / 2}" cy="${height / 2 - 20}" r="24" fill="hsl(240, 10%, 18%)" />
      <path d="M${width / 2 - 8} ${height / 2 - 28} L${width / 2 + 12} ${height / 2 - 20} L${width / 2 - 8} ${height / 2 - 12} Z" fill="hsl(240, 5%, 65%)"/>
      <text x="50%" y="${height / 2 + 30}" dominant-baseline="middle" text-anchor="middle" font-family="-apple-system, sans-serif" font-weight="500" font-size="12" fill="hsl(240, 5%, 65%)">Bild nicht verfügbar</text>
    </svg>
  `.trim();
};

router.get('/home', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;

  try {
    const [resume, movies, series] = await Promise.all([
      JellyfinService.getResumeItems(userId, accessToken),
      JellyfinService.getMovies(userId, accessToken),
      JellyfinService.getSeries(userId, accessToken)
    ]);

    return res.json({
      resume,
      movies,
      series
    });
  } catch (error) {
    console.error('[Media Home Error]', error.message);
    return res.status(500).json({ error: 'Failed to fetch media library data' });
  }
}));

router.get('/search', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { q } = req.query;

  if (!q) {
    return res.json([]);
  }

  try {
    const results = await JellyfinService.search(userId, accessToken, q);
    return res.json(results);
  } catch (error) {
    console.error('[Media Search Error]', error.message);
    return res.status(500).json({ error: 'Failed to search media items' });
  }
}));

router.get('/item/:id', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;

  try {
    const item = await JellyfinService.getItemDetails(userId, accessToken, id);
    return res.json(item);
  } catch (error) {
    console.error('[Media Item Error]', error.message);
    return res.status(500).json({ error: 'Failed to fetch item details' });
  }
}));

router.get('/item/:id/similar', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;

  try {
    const items = await JellyfinService.getSimilarItems(userId, accessToken, id);
    return res.json(items);
  } catch (error) {
    console.error('[Media Similar Error]', error.message);
    return res.status(500).json({ error: 'Failed to fetch similar items' });
  }
}));

router.get('/item/:id/seasons', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;

  try {
    const seasons = await JellyfinService.getSeasons(userId, accessToken, id);
    return res.json(seasons);
  } catch (error) {
    console.error('[Media Seasons Error]', error.message);
    return res.status(500).json({ error: 'Failed to fetch seasons' });
  }
}));

router.get('/item/:id/episodes', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;
  const { seasonId } = req.query;

  try {
    const episodes = await JellyfinService.getEpisodes(userId, accessToken, id, seasonId);
    return res.json(episodes);
  } catch (error) {
    console.error('[Media Episodes Error]', error.message);
    return res.status(500).json({ error: 'Failed to fetch episodes' });
  }
}));

router.get('/genres', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { type } = req.query;

  if (!type) {
    return res.status(400).json({ error: 'Type is required' });
  }

  try {
    const genres = await JellyfinService.getGenres(userId, accessToken, type);
    return res.json(genres);
  } catch (error) {
    console.error('[Media Genres Error]', error.message);
    return res.status(500).json({ error: 'Failed to fetch genres' });
  }
}));

router.get('/studios', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;

  try {
    const studios = await JellyfinService.getStudios(userId, accessToken);
    return res.json(studios);
  } catch (error) {
    console.error('[Media Studios Error]', error.message);
    return res.status(500).json({ error: 'Failed to fetch studios' });
  }
}));

router.get('/library', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { type, genre, studio, page, limit } = req.query;

  if (!type) {
    return res.status(400).json({ error: 'Type is required' });
  }

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 50));

  try {
    const result = await JellyfinService.getLibrary(userId, accessToken, type, genre, studio, pageNum, limitNum);
    return res.json({
      items: result.items,
      totalItems: result.totalRecordCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(result.totalRecordCount / limitNum)
    });
  } catch (error) {
    console.error('[Media Library Error]', error.message);
    return res.status(500).json({ error: 'Failed to fetch library items' });
  }
}));

router.get('/image/:id', requireAuth, asyncHandler(async (req, res) => {
  const { accessToken } = req.session;
  const { id } = req.params;
  const { type = 'Primary', tag, width, height, maxWidth, maxHeight, quality } = req.query;

  try {
    const imageResponse = await JellyfinService.fetchImageStream(id, accessToken, type, {
      tag,
      width, height, maxWidth, maxHeight, quality
    });
    
    res.setHeader('Content-Type', imageResponse.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    const readable = Readable.fromWeb(imageResponse.body);
    readable.pipe(res);
  } catch (error) {
    console.error(`[Image Proxy Error] Failed to proxy image ${id} (${type}):`, error.message);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache');
    res.status(200).send(getSvgPlaceholder(type));
  }
}));

router.get('/stream/:id', requireAuth, asyncHandler(async (req, res) => {
  const { accessToken } = req.session;
  const { id } = req.params;
  const rangeHeader = req.headers.range;

  try {
    const streamResponse = await JellyfinService.fetchVideoStream(id, accessToken, rangeHeader);

    res.status(streamResponse.status);

    const headersToForward = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'cache-control'
    ];

    headersToForward.forEach(header => {
      const value = streamResponse.headers.get(header);
      if (value) {
        res.setHeader(header, value);
      }
    });

    const contentType = res.getHeader('content-type');
    if (!contentType || contentType === 'application/octet-stream') {
      res.setHeader('content-type', 'video/mp4');
    }

    const readable = Readable.fromWeb(streamResponse.body);

    req.on('close', () => {
      readable.destroy();
    });

    readable.pipe(res);
  } catch (error) {
    console.error(`[Stream Proxy Error] Failed to stream video ${id}:`, error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to stream media content' });
    }
  }
}));

router.get('/playback/:id', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;
  const { mode } = req.query;

  try {
    const playbackMode = PlaybackService.normalizeMode(mode);
    const userAgent = req.headers['user-agent'] || '';
    const playbackInfo = await JellyfinService.getPlaybackInfo(
      userId,
      accessToken,
      id,
      PlaybackService.getPlaybackInfoOptions(playbackMode, userAgent)
    );
    const playback = PlaybackService.resolvePlayback(playbackInfo, id, {
      mode: playbackMode,
      userAgent
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.json(playback);
  } catch (error) {
    console.error(`[Playback Resolve Error] Failed to resolve playback for ${id}:`, error.message);
    return res.status(500).json({ error: 'Failed to resolve playback media source' });
  }
}));

router.get('/playback-proxy', requireAuth, asyncHandler(async (req, res) => {
  const { accessToken } = req.session;
  const { path: targetPath } = req.query;
  const rangeHeader = req.headers.range;

  try {
    const normalizedPath = PlaybackService.normalizeJellyfinPath(targetPath);
    const upstreamResponse = await JellyfinService.fetchPlaybackResource(normalizedPath, accessToken, rangeHeader);
    const contentType = upstreamResponse.headers.get('content-type') || '';
    const isPlaylist = PlaybackService.isPlaylistResponse(contentType, normalizedPath);

    res.status(upstreamResponse.status);

    const headersToForward = [
      'content-type',
      'content-range',
      'accept-ranges',
      'cache-control'
    ];

    if (!isPlaylist) {
      headersToForward.push('content-length');
    }

    headersToForward.forEach(header => {
      const value = upstreamResponse.headers.get(header);
      if (value) {
        res.setHeader(header, value);
      }
    });

    if (isPlaylist) {
      res.setHeader('content-type', contentType || 'application/vnd.apple.mpegurl');
      res.setHeader('cache-control', 'no-store');
      const playlist = await upstreamResponse.text();
      return res.send(PlaybackService.rewritePlaylist(playlist, normalizedPath));
    }

    const readable = Readable.fromWeb(upstreamResponse.body);

    req.on('close', () => {
      readable.destroy();
    });

    return readable.pipe(res);
  } catch (error) {
    console.error('[Playback Proxy Error] Failed to proxy playback resource:', error.message);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to proxy playback resource' });
    }
  }
}));

router.get('/person/:id', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;

  try {
    const person = await JellyfinService.getPersonDetails(userId, accessToken, id);
    return res.json(person);
  } catch (error) {
    console.error(`[Media Person Error] ID ${id}:`, error.message);
    return res.status(500).json({ error: 'Failed to fetch person details' });
  }
}));

router.get('/person/:id/items', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;

  try {
    const items = await JellyfinService.getPersonItems(userId, accessToken, id);
    return res.json(items);
  } catch (error) {
    console.error(`[Media Person Items Error] ID ${id}:`, error.message);
    return res.status(500).json({ error: 'Failed to fetch person items' });
  }
}));

router.get('/person/by-name/:name', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { name } = req.params;

  try {
    const person = await JellyfinService.getPersonDetailsByName(userId, accessToken, name);
    return res.json(person);
  } catch (error) {
    console.error(`[Media Person By Name Error] ${name}:`, error.message);
    return res.status(500).json({ error: 'Failed to find person details' });
  }
}));

router.get('/person/by-name/:name/items', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { name } = req.params;

  try {
    const items = await JellyfinService.getPersonItemsByName(userId, accessToken, name);
    return res.json(items);
  } catch (error) {
    console.error(`[Media Person Items By Name Error] ${name}:`, error.message);
    return res.status(500).json({ error: 'Failed to fetch person items' });
  }
}));

export default router;
