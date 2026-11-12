import api from "../../api/client";

export const rolesApi = {
  async list({ page = 1, search = "", signal } = {}) {
    const response = await api.get("/api/roles", {
      params: {
        page,
        ...(search ? { search } : {}),
      },
      signal,
    });

    return response.data;
  },

  async get(id) {
    const response = await api.get(`/api/roles/${id}`);
    return response.data.data;
  },

  async create(name) {
    const response = await api.post("/api/roles", {
      name,
    });

    return response.data;
  },

  async update(id, name) {
    const response = await api.patch(`/api/roles/${id}`, { name });

    return response.data;
  },

  async remove(id) {
    const response = await api.delete(`/api/roles/${id}`);

    return response.data;
  },

  async syncPermissions(id, permissionIds) {
    const response = await api.put(`/api/roles/${id}/permissions`, {
      permission_ids: permissionIds,
    });

    return response.data;
  },

  async allPermissions() {
    const items = [];
    let page = 1;

    while (true) {
      const response = await api.get("/api/permissions", { params: { page } });

      items.push(...response.data.data);

      const lastPage = Number(response.data.meta?.last_page ?? 1);

      if (page >= lastPage) {
        break;
      }

      // Safety limit to avoid excessive requests.
      if (page >= 100) {
        throw new Error("Permission list is too large to load.");
      }

      page += 1;
    }

    return items;
  },
};

export function roleApiError(error) {
  const status = error?.response?.status;

  if (status === 401) {
    return "Session expired. Please sign in again.";
  }

  if (status === 403) {
    return "You are not authorized to perform this action.";
  }

  if (status === 409) {
    return (
      error.response?.data?.message ||
      "This role is in use and cannot be deleted."
    );
  }

  if (status === 419) {
    return "Security session expired. Refresh and retry.";
  }

  if (status === 422) {
    return "Please correct the highlighted fields.";
  }

  if (status === 429) {
    return "Too many requests. Try again later.";
  }

  if (!error?.response) {
    return "Cannot connect to the server. Check your connection.";
  }

  return "An unexpected error occurred. Please try again.";
}
