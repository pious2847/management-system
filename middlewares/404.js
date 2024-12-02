
// 404 Not Found middleware
const notFoundHandler = (req, res, next) => {
    const error = new Error(`Page Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
  };
  
module.exports = notFoundHandler;