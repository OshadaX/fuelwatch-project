export function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Not Found: ${req.originalUrl}`));
}

export function errorHandler(err, req, res, next) {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  // mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({ message: "Duplicate key error.", details: err.keyValue });
  }

  res.status(statusCode).json({
    message: err.message || "Server error",
  });
}
