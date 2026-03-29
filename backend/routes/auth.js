const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const { withDb, getDb } = require('../storage/fileDb');

const makeId = () => crypto.randomUUID();
const makeCode = () => String(Math.floor(100000 + Math.random() * 900000));
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizePhone = (value) => String(value || '').replace(/[^\d+]/g, '');
const signAuthToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign({ user: { id: userId } }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const withVerificationState = (user) => ({
  ...user,
  favoriteRoutes: user.favoriteRoutes || [],
  verification: {
    email: {
      verified: user.verification?.email?.verified ?? Boolean(user.email),
      pendingCode: user.verification?.email?.pendingCode || null,
      requestedAt: user.verification?.email?.requestedAt || null,
      verifiedAt: user.verification?.email?.verifiedAt || null
    },
    phone: {
      verified: user.verification?.phone?.verified ?? Boolean(user.phone),
      pendingCode: user.verification?.phone?.pendingCode || null,
      requestedAt: user.verification?.phone?.requestedAt || null,
      verifiedAt: user.verification?.phone?.verifiedAt || null
    }
  }
});

const findUserByIdentifier = (db, identifier) => {
  const email = normalizeEmail(identifier);
  const phone = normalizePhone(identifier);

  return db.users
    .map(withVerificationState)
    .find((user) => (email && user.email === email) || (phone && user.phone === phone));
};

router.post(
  '/register',
  [
    body('name').notEmpty(),
    body('email').optional({ checkFalsy: true }).isEmail(),
    body('phone').optional({ checkFalsy: true }).isLength({ min: 10 }),
    body('password').isLength({ min: 6 }),
    body().custom((value, { req }) => {
      if (!req.body.email && !req.body.phone) {
        throw new Error('Email or phone is required');
      }

      return true;
    })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, password } = req.body;
    const email = normalizeEmail(req.body.email);
    const phone = normalizePhone(req.body.phone);
    try {
      const db = await getDb();
      const existingByEmail = email ? db.users.find((user) => user.email === email) : null;
      const existingByPhone = phone ? db.users.find((user) => user.phone === phone) : null;

      if (existingByEmail && existingByPhone) {
        return res.status(400).json({ msg: 'Пользователь с такими e-mail и телефоном уже существует' });
      }

      if (existingByEmail) {
        return res.status(400).json({ msg: 'Пользователь с таким e-mail уже существует' });
      }

      if (existingByPhone) {
        return res.status(400).json({ msg: 'Пользователь с таким телефоном уже существует' });
      }

      const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));
      const user = {
        _id: makeId(),
        name,
        email,
        phone,
        password: hashedPassword,
        role: 'User',
        balance: 0,
        completedRoutes: [],
        scannedPoints: [],
        favoriteRoutes: [],
        avatar: '',
        hideFromLeaderboard: false,
        verification: {
          email: {
            verified: false,
            pendingCode: null,
            requestedAt: null,
            verifiedAt: null
          },
          phone: {
            verified: false,
            pendingCode: null,
            requestedAt: null,
            verifiedAt: null
          }
        },
        createdAt: new Date().toISOString()
      };

      const token = signAuthToken(user._id);

      await withDb(async (innerDb) => {
        innerDb.users.push(user);
      });

      res.json({ token });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  }
);

router.post(
  '/login',
  [
    body().custom((value, { req }) => {
      if (!req.body.identifier && !req.body.email && !req.body.phone) {
        throw new Error('Identifier is required');
      }

      return true;
    }),
    body('identifier').optional({ checkFalsy: true }).isString(),
    body('email').optional({ checkFalsy: true }).isString(),
    body('password').exists()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const identifier = req.body.identifier || req.body.email || req.body.phone || '';
    const { password } = req.body;
    try {
      const db = await getDb();
      const user = findUserByIdentifier(db, identifier);
      if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

      let isMatch = false;
      if (typeof user.password === 'string' && user.password.startsWith('$2')) {
        isMatch = await bcrypt.compare(password, user.password);
      } else if (user.password === password) {
        isMatch = true;
        const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));
        await withDb(async (innerDb) => {
          const innerUser = innerDb.users.find((item) => item._id === user._id);
          if (innerUser) innerUser.password = hashedPassword;
        });
      }

      if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

      const token = signAuthToken(user._id);
      res.json({ token });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  }
);

router.post(
  '/request-verification',
  auth,
  [
    body('channel').isIn(['email', 'phone']),
    body('value').optional({ checkFalsy: true }).isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { channel } = req.body;
    const rawValue = req.body.value;
    const code = makeCode();
    const requestedAt = new Date().toISOString();

    try {
      const db = await getDb();
      const user = db.users.find((item) => item._id === req.user.id);
      if (!user) return res.status(404).json({ msg: 'User not found' });

      const nextValue = channel === 'email' ? normalizeEmail(rawValue || user.email) : normalizePhone(rawValue || user.phone);
      if (!nextValue) return res.status(400).json({ msg: `Missing ${channel}` });

      if (channel === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextValue)) {
        return res.status(400).json({ msg: 'Invalid email' });
      }

      const conflict = db.users.find((item) => item._id !== req.user.id && item[channel] === nextValue);
      if (conflict) return res.status(400).json({ msg: `${channel} already used` });

      await withDb(async (innerDb) => {
        const innerUser = innerDb.users.find((item) => item._id === req.user.id);
        if (!innerUser) return;

        innerUser[channel] = nextValue;
        innerUser.verification = withVerificationState(innerUser).verification;
        innerUser.verification[channel] = {
          verified: false,
          pendingCode: code,
          requestedAt,
          verifiedAt: null
        };
      });

      res.json({
        success: true,
        channel,
        destination: nextValue,
        devCode: code
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  }
);

router.post(
  '/verify',
  auth,
  [
    body('channel').isIn(['email', 'phone']),
    body('code').isLength({ min: 4 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { channel, code } = req.body;
    try {
      const db = await getDb();
      const rawUser = db.users.find((item) => item._id === req.user.id);
      if (!rawUser) return res.status(404).json({ msg: 'User not found' });

      const user = withVerificationState(rawUser);

      if (user.verification[channel].pendingCode !== code) {
        return res.status(400).json({ msg: 'Invalid verification code' });
      }

      await withDb(async (innerDb) => {
        const innerUser = innerDb.users.find((item) => item._id === req.user.id);
        if (!innerUser) return;

        innerUser.verification = withVerificationState(innerUser).verification;
        innerUser.verification[channel] = {
          verified: true,
          pendingCode: null,
          requestedAt: null,
          verifiedAt: new Date().toISOString()
        };
      });

      res.json({ success: true, channel });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
