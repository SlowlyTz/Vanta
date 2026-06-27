export default {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", 'https://www.youtube.com', 'https://s.ytimg.com'],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com'],
  imgSrc: ["'self'", 'data:', 'blob:', 'https://image.tmdb.org', 'https://img.youtube.com', 'https://i.ytimg.com'],
  mediaSrc: ["'self'", 'blob:'],
  frameSrc: ["'self'", 'https://www.youtube.com', 'https://www.youtube-nocookie.com'],
  connectSrc: ["'self'", 'https://www.youtube.com']
};
