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

export const uploadDatabaseFile = (formData, onUploadProgress) =>
  apiClient
    .post("/connections/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress,
    })
    .then((r) => r.data.data.connection);

export const listSampleDatasets = () =>
  apiClient.get("/connections/samples").then((r) => r.data.data.samples);

export const importSampleDataset = (key) =>
  apiClient.post(`/connections/samples/${key}`).then((r) => r.data.data.connection);
