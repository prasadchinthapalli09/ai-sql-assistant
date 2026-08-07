import apiClient from "./client";

export const registerUser = (payload) =>
  apiClient.post("/auth/register", payload).then((r) => r.data.data);

export const loginUser = (payload) =>
  apiClient.post("/auth/login", payload).then((r) => r.data.data);

export const fetchProfile = () =>
  apiClient.get("/auth/profile").then((r) => r.data.data.user);
