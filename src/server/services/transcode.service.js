import crypto from 'crypto';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import env from '../config/env.js';
import { LocalMediaService } from './localMedia.service.js';

const CACHE_MIME_TYPE = 'video/mp4';
const PREFERRED_AUDIO_LANGUAGES = ['ger', 'deu', 'de', 'und'];

const hashValue = (value) => crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);

const runProcess = (command, args, { timeoutMs = 0 } = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stdout = '';
  let stderr = '';
  let timeout = null;

  if (timeoutMs > 0) {
    timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`${command} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  }

  child.stdout.on('data', chunk => {
    stdout += chunk.toString();
  });

  child.stderr.on('data', chunk => {
    stderr += chunk.toString();
  });

  child.on('error', error => {
    if (timeout) clearTimeout(timeout);
    reject(error);
  });

  child.on('close', code => {
    if (timeout) clearTimeout(timeout);
    if (code === 0) {
      resolve({ stdout, stderr });
      return;
    }

    reject(new Error(`${command} exited with code ${code}: ${stderr || stdout}`));
  });
});

export class TranscodeService {
  static jobs = new Map();

  static async ensureAacVersion(itemId) {
    const source = await LocalMediaService.getStreamInfo(itemId);
    const target = await this.getCacheTarget(itemId, source);

    if (await this.fileExists(target.filePath)) {
      return this.buildPlayback(itemId, target);
    }

    const existingJob = this.jobs.get(target.key);
    if (existingJob) {
      return {
        status: 'preparing',
        mode: 'preparing',
        reason: 'audio-aac-cache-preparing',
        mediaSourceId: itemId
      };
    }

    const job = this.transcodeToAac(source.filePath, target)
      .catch(error => {
        target.error = error;
        throw error;
      })
      .finally(() => {
        this.jobs.delete(target.key);
      });

    this.jobs.set(target.key, job);

    return {
      status: 'preparing',
      mode: 'preparing',
      reason: 'audio-aac-cache-preparing',
      mediaSourceId: itemId
    };
  }

  static async waitForAacVersion(itemId) {
    const source = await LocalMediaService.getStreamInfo(itemId);
    const target = await this.getCacheTarget(itemId, source);

    if (await this.fileExists(target.filePath)) {
      return this.buildPlayback(itemId, target);
    }

    const existingJob = this.jobs.get(target.key);
    if (existingJob) {
      await existingJob;
      return this.buildPlayback(itemId, target);
    }

    await this.transcodeToAac(source.filePath, target);
    return this.buildPlayback(itemId, target);
  }

  static async getTranscodedStreamInfo(itemId) {
    const source = await LocalMediaService.getStreamInfo(itemId);
    const target = await this.getCacheTarget(itemId, source);
    const stats = await fsp.stat(target.filePath);

    if (!stats.isFile()) {
      const error = new Error('Transcoded media cache file is not available');
      error.status = 404;
      throw error;
    }

    return {
      filePath: target.filePath,
      size: stats.size,
      mimeType: CACHE_MIME_TYPE
    };
  }

  static async getCacheTarget(itemId, source) {
    const cacheRoot = path.resolve(process.cwd(), env.TRANSCODE_CACHE_PATH);
    const stats = await fsp.stat(source.filePath);
    const key = hashValue(`${itemId}:${source.filePath}:${stats.size}:${stats.mtimeMs}`);

    return {
      key,
      filePath: path.join(cacheRoot, `${key}.mp4`),
      tmpPath: path.join(cacheRoot, `${key}.tmp.mp4`)
    };
  }

  static buildPlayback(itemId, target) {
    return {
      status: 'ready',
      requestedMode: 'audio-transcoded',
      mode: 'audio-transcoded',
      url: `/api/media/transcoded/${encodeURIComponent(itemId)}`,
      mediaSourceId: itemId,
      cacheKey: target.key,
      isTranscoded: true,
      reason: 'audio-aac-cache'
    };
  }

  static async transcodeToAac(sourcePath, target) {
    await fsp.mkdir(path.dirname(target.filePath), { recursive: true });
    await fsp.rm(target.tmpPath, { force: true });

    const audioStream = await this.selectAudioStream(sourcePath);
    if (!audioStream) {
      throw new Error('No audio stream found for transcoding');
    }

    const args = [
      '-hide_banner',
      '-y',
      '-i', sourcePath,
      '-map', '0:v:0',
      '-map', `0:${audioStream.index}`,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-ac', String(env.TRANSCODE_AUDIO_CHANNELS),
      '-b:a', env.TRANSCODE_AUDIO_BITRATE,
      '-movflags', '+faststart',
      target.tmpPath
    ];

    await runProcess(env.FFMPEG_PATH, args);
    await fsp.rename(target.tmpPath, target.filePath);
  }

  static async selectAudioStream(sourcePath) {
    const { stdout } = await runProcess(env.FFPROBE_PATH, [
      '-v', 'error',
      '-select_streams', 'a',
      '-show_entries', 'stream=index,codec_name,channels:stream_tags=language,title',
      '-of', 'json',
      sourcePath
    ], { timeoutMs: 60_000 });

    const data = JSON.parse(stdout);
    const streams = Array.isArray(data.streams) ? data.streams : [];
    if (streams.length === 0) return null;

    const ranked = streams.map((stream, order) => ({
      ...stream,
      order,
      languageRank: this.getLanguageRank(stream.tags?.language),
      channelScore: Number(stream.channels || 0)
    }));

    ranked.sort((a, b) =>
      a.languageRank - b.languageRank ||
      b.channelScore - a.channelScore ||
      a.order - b.order
    );

    return ranked[0];
  }

  static getLanguageRank(language) {
    const normalized = String(language || 'und').toLowerCase();
    const index = PREFERRED_AUDIO_LANGUAGES.indexOf(normalized);
    return index === -1 ? PREFERRED_AUDIO_LANGUAGES.length : index;
  }

  static async fileExists(filePath) {
    try {
      const stats = await fsp.stat(filePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  static createReadStream(filePath, options = {}) {
    return fs.createReadStream(filePath, options);
  }
}
