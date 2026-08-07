import apiClient from "./client";

export const listConnections = () =>
  apiClient.get("/connections").then((r) => r.data.data.connections);

export const createConnection = (payload) =>
  apiClient.post("/connections", payload).then((r) => r.data.data.connection);

export const testConnection = (id) =>
  apiClient.post(`/connections/${id}/test`).then((r) => r.data);

export const deleteConnection = (id) =>
  apiClient.delete(`/connections/${id}`).then((r) => r.data);

export const getConnectionSchema = (id) =>
  apiClient.get(`/connections/${id}/schema`).then((r) => r.data.data.schema);
