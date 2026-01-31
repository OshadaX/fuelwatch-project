module.exports = (req, res, next) => {
  req.clientInfo = {
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date()
  };
  next();
};
