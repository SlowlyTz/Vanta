import express from 'express';
import { JellyfinService } from '../services/jellyfin.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  // Jellyfin allows empty passwords, but let's pass whatever we get
  try {
    const data = await JellyfinService.login(username, password || '');
    
    // Store critical data in the session
    req.session.accessToken = data.AccessToken;
    req.session.userId = data.User.Id;
    req.session.username = data.User.Name;

    return res.json({
      user: {
        id: data.User.Id,
        name: data.User.Name
      }
    });
  } catch (error) {
    console.error('[Login Error]', error.message);
    return res.status(401).json({ error: 'Invalid username or password' });
  }
}));

router.get('/me', (req, res) => {
  if (req.session && req.session.accessToken && req.session.userId) {
    return res.json({
      user: {
        id: req.session.userId,
        name: req.session.username
      }
    });
  }
  return res.status(401).json({ error: 'Not authenticated' });
});

router.post('/password', requireAuth, asyncHandler(async (req, res) => {
  const { currentPassword = '', newPassword } = req.body;
  const { userId, accessToken } = req.session;

  if (!newPassword || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'New password is required' });
  }

  try {
    await JellyfinService.changePassword(userId, accessToken, currentPassword || '', newPassword);
    return res.json({ success: true });
  } catch (error) {
    console.error('[Change Password Error]', error.message);
    const status = error.status === 400 || error.status === 401 || error.status === 403 ? 403 : 500;
    return res.status(status).json({
      error: status === 403 ? 'Current password is invalid' : 'Failed to change password'
    });
  }
}));

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('[Logout Error]', err);
      return res.status(500).json({ error: 'Failed to log out' });
    }
    res.clearCookie('connect.sid');
    return res.json({ success: true });
  });
});

export default router;
