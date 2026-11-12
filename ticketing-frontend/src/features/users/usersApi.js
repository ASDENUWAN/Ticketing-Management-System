import api from "../../api/client";

export const usersApi = {
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

  async syncRoles(id, roleIds) {
    const response = await api.put(`/api/users/${id}/roles`, {
      role_ids: roleIds,
    });
    return response.data;
  },

  async syncPermissions(id, permissionIds) {
    const response = await api.put(`/api/users/${id}/permissions`, {
      permission_ids: permissionIds,
    });
    return response.data;
  },

  async allOptions(endpoint) {
    const items = [];
    let page = 1;

    while (true) {
      const response = await api.get(endpoint, {
        params: { page },
      });

      items.push(...response.data.data);

      const lastPage = Number(response.data.meta?.last_page ?? 1);

      if (page >= lastPage) break;

      if (page >= 100) {
        throw new Error(
          "Too many access records to load. Contact your administrator.",
        );
      }

      page += 1;
    }

    return items;
  },
};

export function apiErrorMessage(
  error,
  fallback = "Something went wrong. Please try again.",
) {
  const status = error?.response?.status;

  if (status === 401) {
    return "Your session expired. Refresh the page to sign in again.";
  }

  if (status === 403) {
    return "You don't have permission to perform this action.";
  }

  if (status === 419) {
    return "Your session expired. Refresh the page and try again.";
  }

  if (status === 409) {
    return (
      error.response?.data?.message ||
      "This record cannot be changed because it is in use."
    );
  }

  if (status === 422) {
    return "Please check the entered information.";
  }

  if (!error?.response) {
    return "Unable to connect to the server. Check your connection.";
  }

  return fallback;
}
