const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const controller = require("../controllers/history.controller");

const router = express.Router();

router.use(protect);

router.get("/", controller.list);
router.delete("/:id", controller.remove);

module.exports = router;
