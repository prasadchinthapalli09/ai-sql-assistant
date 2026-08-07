const asyncHandler = require("../utils/asyncHandler");
const queryService = require("../services/query.service");

const askQuestion = asyncHandler(async (req, res) => {
  const { connectionId, question, conversationHistory } = req.body;
  const result = await queryService.runNaturalLanguageQuery(req.user.id, {
    connectionId,
    question,
    conversationHistory,
  });
  res.status(200).json({ success: true, data: result });
});

module.exports = { askQuestion };
