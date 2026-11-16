import api from "../../api/client";

export const systemsApi = {
  async list({ page = 1, search = "", signal } = {}) {
    const response = await api.get("/api/systems", {
      params: {
        page,
        ...(search ? { search } : {}),
      },
      signal,
    });

    return response.data;
  },

  async mine({ signal } = {}) {
    const response = await api.get("/api/my-systems", {
      signal,
    });

    return response.data;
  },

  async create(data) {
    const response = await api.post("/api/systems", data);

    return response.data;
  },

  async update(id, data) {
    const response = await api.patch(`/api/systems/${id}`, data);

    return response.data;
  },

  async remove(id) {
    const response = await api.delete(`/api/systems/${id}`);

    return response.data;
  },

  async categories(systemId, { signal } = {}) {
    const response = await api.get(`/api/systems/${systemId}/categories`, {
      signal,
    });

    return response.data;
  },

  async createCategory(systemId, data) {
    const response = await api.post(
      `/api/systems/${systemId}/categories`,
      data,
    );

    return response.data;
  },

  async updateCategory(systemId, categoryId, data) {
    const response = await api.patch(
      `/api/systems/${systemId}/categories/${categoryId}`,
      data,
    );

    return response.data;
  },

  async deleteCategory(systemId, categoryId) {
    const response = await api.delete(
      `/api/systems/${systemId}/categories/${categoryId}`,
    );

    return response.data;
  },

  async members(systemId, { page = 1, search = "", signal } = {}) {
    const response = await api.get(`/api/systems/${systemId}/members`, {
      params: {
        page,
        ...(search ? { search } : {}),
      },
      signal,
    });

    return response.data;
  },

  async candidates(search, { signal } = {}) {
    const response = await api.get("/api/system-user-candidates", {
      params: { search },
      signal,
    });

    return response.data;
  },

  async saveMember(systemId, userId, isHead) {
    const response = await api.put(
      `/api/systems/${systemId}/members/${userId}`,
      {
        is_head: Boolean(isHead),
      },
    );

    return response.data;
  },

  async removeMember(systemId, userId) {
    const response = await api.delete(
      `/api/systems/${systemId}/members/${userId}`,
    );

    return response.data;
  },
};

export function systemApiError(error) {
  const status = error?.response?.status;

  if (status === 401) {
    return "Session expired. Please sign in again.";
  }

  if (status === 403) {
    return "You are not authorized to perform this action.";
  }

  if (status === 404) {
    return "The requested system or user no longer exists.";
  }

  if (status === 409) {
    return error.response?.data?.message || "This record is currently in use.";
  }

  if (status === 422) {
    return (
      error.response?.data?.message || "Please check the entered information."
    );
  }

  if (status === 419) {
    return "Security session expired. Refresh and retry.";
  }

  if (status === 429) {
    return "Too many requests. Please try again later.";
  }

  if (!error?.response) {
    return "Cannot connect to the Laravel server.";
  }

  return "An unexpected error occurred.";
}
