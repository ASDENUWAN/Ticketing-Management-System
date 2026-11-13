import api from "../../api/client";

export const usersApi = {
  /**
   * Get paginated users.
   */
  async list({ page = 1, search = "", signal } = {}) {
    const response = await api.get("/api/users", {
      params: {
        page,
        ...(search ? { search } : {}),
      },
      signal,
    });

    return response.data;
  },

  /**
   * Get latest user details and assignments.
   */
  async get(id) {
    const response = await api.get(`/api/users/${id}`);

    return response.data.data;
  },

  async create(data) {
    const response = await api.post("/api/users", data);

    return response.data;
  },

  async update(id, data) {
    const response = await api.patch(`/api/users/${id}`, data);

    return response.data;
  },

  async remove(id) {
    const response = await api.delete(`/api/users/${id}`);

    return response.data;
  },

  /**
   * Replace assigned roles.
   */
  async syncRoles(id, roleIds) {
    const response = await api.put(`/api/users/${id}/roles`, {
      role_ids: roleIds,
    });

    return response.data;
  },

  /**
   * Replace DIRECT user permissions only.
   */
  async syncPermissions(id, permissionIds) {
    const response = await api.put(`/api/users/${id}/permissions`, {
      permission_ids: permissionIds,
    });

    return response.data;
  },

  /**
   * Load all paginated roles or permissions.
   */
  async allOptions(endpoint) {
    const items = [];
    let page = 1;

    while (page <= 100) {
      const response = await api.get(endpoint, {
        params: { page },
      });

      const data = response.data;

      items.push(...(data.data ?? []));

      const lastPage = Number(data.meta?.last_page ?? 1);

      if (page >= lastPage) {
        return items;
      }

      page += 1;
    }

    throw new Error("Too many access records to load.");
  },

  /**
   * Super Admin:
   * Enable or disable a user's own profile editing.
   */
  async updateProfileEditing(id, enabled) {
    const response = await api.patch(`/api/users/${id}/profile-edit`, {
      enabled: Boolean(enabled),
    });

    return response.data;
  },
};

export function apiErrorMessage(
  error,
  fallback = "Something went wrong. Please try again.",
) {
  const status = error?.response?.status;

  if (status === 401) {
    return "Your session expired. Please sign in again.";
  }

  if (status === 403) {
    return "You don't have permission to perform this action.";
  }

  if (status === 409) {
    return error.response?.data?.message || "This record is currently in use.";
  }

  if (status === 419) {
    return "Security session expired. Refresh and retry.";
  }

  if (status === 422) {
    return "Please check the entered information.";
  }

  if (status === 429) {
    return "Too many requests. Try again later.";
  }

  if (!error?.response) {
    return "Cannot connect to the Laravel server.";
  }

  return fallback;
}
