const asyncHandler = require("../utils/asyncHandler");
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");

const list = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const where = {
    userId: req.user.id,
    ...(search
      ? {
          OR: [
            { naturalLanguage: { contains: search, mode: "insensitive" } },
            { generatedSql: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.queryHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: parseInt(limit, 10),
      include: { connection: { select: { name: true } }, favorite: true },
    }),
    prisma.queryHistory.count({ where }),
  ]);

  res.status(200).json({
    success: true,
    data: { items, total, page: parseInt(page, 10), limit: parseInt(limit, 10) },
  });
});

const remove = asyncHandler(async (req, res) => {
  const item = await prisma.queryHistory.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!item) throw new ApiError(404, "History item not found");

  await prisma.queryHistory.delete({ where: { id: req.params.id } });
  res.status(200).json({ success: true, message: "History item deleted" });
});

module.exports = { list, remove };
