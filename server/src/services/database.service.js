const { URL } = require("url");
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { encrypt, decrypt } = require("../utils/crypto");
const { testConnection, closePool } = require("../utils/pgPoolManager");
const { discoverSchema } = require("./schema.service");

function parseConnectionString(connStr) {
  try {
    const u = new URL(connStr);
    return {
      host: u.hostname,
      port: u.port ? parseInt(u.port, 10) : 5432,
      database: u.pathname.replace(/^\//, ""),
    };
  } catch (err) {
    throw new ApiError(400, "Invalid PostgreSQL connection string format");
  }
}

async function createConnection(userId, { name, connectionString }) {
  await testConnection(connectionString); // throws if unreachable/invalid

  const { host, port, database } = parseConnectionString(connectionString);
  const encryptedConnStr = encrypt(connectionString);

  const connection = await prisma.databaseConnection.create({
    data: {
      name,
      encryptedConnStr,
      host,
      port,
      database,
      isActive: true,
      lastConnectedAt: new Date(),
      userId,
    },
    select: { id: true, name: true, host: true, port: true, database: true, isActive: true, lastConnectedAt: true, createdAt: true },
  });

  return connection;
}

async function listConnections(userId) {
  return prisma.databaseConnection.findMany({
    where: { userId },
    select: { id: true, name: true, host: true, port: true, database: true, isActive: true, lastConnectedAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

async function getConnectionOrThrow(userId, connectionId) {
  const connection = await prisma.databaseConnection.findFirst({
    where: { id: connectionId, userId },
  });
  if (!connection) {
    throw new ApiError(404, "Database connection not found");
  }
  return connection;
}

async function testExistingConnection(userId, connectionId) {
  const connection = await getConnectionOrThrow(userId, connectionId);
  const connStr = decrypt(connection.encryptedConnStr);
  await testConnection(connStr);
  await prisma.databaseConnection.update({
    where: { id: connectionId },
    data: { lastConnectedAt: new Date(), isActive: true },
  });
  return true;
}

async function deleteConnection(userId, connectionId) {
  await getConnectionOrThrow(userId, connectionId);
  await closePool(connectionId);
  await prisma.databaseConnection.delete({ where: { id: connectionId } });
}

async function getSchema(userId, connectionId) {
  const connection = await getConnectionOrThrow(userId, connectionId);
  const connStr = decrypt(connection.encryptedConnStr);
  return discoverSchema(connectionId, connStr);
}

module.exports = {
  createConnection,
  listConnections,
  getConnectionOrThrow,
  testExistingConnection,
  deleteConnection,
  getSchema,
};
