const jwt = require('jsonwebtoken');

const authenticationMiddleware = async (req, res, next) => {
  const authHeader = (req.headers.authorization || '').trim();

  
  if (!authHeader) {
    return next();
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ message: 'Invalid authorization header' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET_KEY);
    return next();
  } catch (error) {
    console.log('JWT verification failed:', error.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const ensureAuthenticated = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  next();
};

const restrictToRole = (role) => (req, res, next) => {
  const userRole = req.user?.role;
  const hasRole = Array.isArray(userRole) ? userRole.includes(role) : userRole === role;

  if (!hasRole) {
    return res.status(403).json({ message: 'Forbidden: Insufficient privileges' });
  }

  next();
};

module.exports = {
  authenticationMiddleware,
  ensureAuthenticated,
  restrictToRole,
};

