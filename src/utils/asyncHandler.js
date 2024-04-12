const asyncHandler = (fn) => async (req, res, next) => {
  try {
    return await fn(req, res, next);
  } catch (error) {
    res.status(error.code || 500).json({
      success: false,
      code: error.code,
      message: error.message || "Internal Server Error",
    })
  }
};

// const asyncHandler = (requestHandler) => {
//   return (req, res, next) => {
//     Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
//   }
// }

export { asyncHandler };