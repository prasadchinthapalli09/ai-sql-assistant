const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/auth.middleware");
const controller = require("../controllers/favorites.controller");

const router = express.Router();

router.use(protect);

router.get("/", controller.list);
router.post(
  "/",
  [body("historyId").notEmpty().withMessage("historyId is required")],
  validate,
  controller.create
);
router.delete("/:id", controller.remove);

module.exports = router;
