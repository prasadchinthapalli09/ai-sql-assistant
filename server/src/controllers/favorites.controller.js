const asyncHandler = require("../utils/asyncHandler");
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");

const list = asyncHandler(async (req, res) => {
  const favorites = await prisma.favorite.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    include: { history: true, connection: { select: { name: true } } },
  });
  res.status(200).json({ success: true, data: { favorites } });
});

const create = asyncHandler(async (req, res) => {
  const { historyId, title } = req.body;

  const history = await prisma.queryHistory.findFirst({
    where: { id: historyId, userId: req.user.id },
  });
  if (!history) throw new ApiError(404, "History item not found");

  const existing = await prisma.favorite.findUnique({ where: { historyId } });
  if (existing) throw new ApiError(409, "This query is already a favorite");

  const favorite = await prisma.favorite.create({
    data: {
      title: title || history.naturalLanguage,
      userId: req.user.id,
      historyId,
      connectionId: history.connectionId,
    },
  });

  res.status(201).json({ success: true, data: { favorite } });
});

const remove = asyncHandler(async (req, res) => {
  const favorite = await prisma.favorite.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!favorite) throw new ApiError(404, "Favorite not found");

  await prisma.favorite.delete({ where: { id: req.params.id } });
  res.status(200).json({ success: true, message: "Favorite removed" });
});

module.exports = { list, create, remove };
