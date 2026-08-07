const asyncHandler = require("../utils/asyncHandler");
const databaseService = require("../services/database.service");

const create = asyncHandler(async (req, res) => {
  const { name, connectionString } = req.body;
  const connection = await databaseService.createConnection(req.user.id, { name, connectionString });
  res.status(201).json({ success: true, data: { connection } });
});

const list = asyncHandler(async (req, res) => {
  const connections = await databaseService.listConnections(req.user.id);
  res.status(200).json({ success: true, data: { connections } });
});

const testConnection = asyncHandler(async (req, res) => {
  await databaseService.testExistingConnection(req.user.id, req.params.id);
  res.status(200).json({ success: true, message: "Connection successful" });
});

const remove = asyncHandler(async (req, res) => {
  await databaseService.deleteConnection(req.user.id, req.params.id);
  res.status(200).json({ success: true, message: "Connection removed" });
});

const getSchema = asyncHandler(async (req, res) => {
  const schema = await databaseService.getSchema(req.user.id, req.params.id);
  res.status(200).json({ success: true, data: { schema: schema.tables } });
});

module.exports = { create, list, testConnection, remove, getSchema };
