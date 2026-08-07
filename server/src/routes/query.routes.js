const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/auth.middleware");
const controller = require("../controllers/query.controller");

const router = express.Router();

router.use(protect);

router.post(
  "/ask",
  [
    body("connectionId").notEmpty().withMessage("connectionId is required"),
    body("question").trim().isLength({ min: 3 }).withMessage("question must be at least 3 characters"),
  ],
  validate,
  controller.askQuestion
);

module.exports = router;
