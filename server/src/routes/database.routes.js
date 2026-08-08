const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");
const controller = require("../controllers/database.controller");

const router = express.Router();

router.use(protect);

router.post("/upload", upload.single("file"), controller.uploadFile);

router.post(
  "/",
  [
    body("name").trim().notEmpty().withMessage("A connection name is required"),
    body("connectionString")
      .trim()
      .matches(/^postgres(ql)?:\/\//)
      .withMessage("connectionString must be a valid postgres:// URL"),
  ],
  validate,
  controller.create
);

router.get("/", controller.list);
router.post("/:id/test", controller.testConnection);
router.get("/:id/schema", controller.getSchema);
router.delete("/:id", controller.remove);

module.exports = router;
