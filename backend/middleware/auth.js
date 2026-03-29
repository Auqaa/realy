const jwt = require('jsonwebtoken');
const { getDb } = require('../storage/fileDb');

const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    const db = await getDb();
    const user = db.users.find((item) => item._id === req.user.id);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    if (user.role !== 'Administrator') {
      return res.status(403).json({ msg: 'Administrator access required' });
    }

    req.adminUser = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Failed to validate administrator access' });
  }
};

module.exports = auth;
module.exports.requireAdmin = requireAdmin;
