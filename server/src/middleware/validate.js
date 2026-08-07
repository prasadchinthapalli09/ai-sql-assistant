const { validationResult } = require("express-validator");
const ApiError = require("../utils/ApiError");

// Runs after express-validator check() chains; short-circuits with a 400
// ApiError (consistent shape) if any validation failed.
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
    return next(new ApiError(400, "Validation failed", details));
  }
  next();
}

module.exports = validate;
