import apiClient from "./client";

export const askQuestion = (payload) =>
  apiClient.post("/query/ask", payload).then((r) => r.data.data);

export const listHistory = (params) =>
  apiClient.get("/history", { params }).then((r) => r.data.data);

export const deleteHistoryItem = (id) =>
  apiClient.delete(`/history/${id}`).then((r) => r.data);

export const listFavorites = () =>
  apiClient.get("/favorites").then((r) => r.data.data.favorites);

export const addFavorite = (payload) =>
  apiClient.post("/favorites", payload).then((r) => r.data.data.favorite);

export const removeFavorite = (id) =>
  apiClient.delete(`/favorites/${id}`).then((r) => r.data);
