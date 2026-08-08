const multer = require("multer");

const ALLOWED_EXTENSIONS = /\.(csv|sql|db|sqlite|sqlite3)$/i;
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB — generous for a demo app

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_EXTENSIONS.test(file.originalname)) {
      const err = new Error("Only .csv, .sql, .db, and .sqlite files are allowed");
      err.statusCode = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

module.exports = upload;
