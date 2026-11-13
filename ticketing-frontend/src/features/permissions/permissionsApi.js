import api from "../../api/client";

export const permissionsApi = {
  async list({ page = 1, search = "", signal } = {}) {
    const response = await api.get("/api/permissions", {
      params: {
        page,
        ...(search ? { search } : {}),
      },
      signal,
    });

    return response.data;
  },

  async create(name) {
    const response = await api.post("/api/permissions", {
      name,
    });

    return response.data;
  },

  async remove(id) {
    const response = await api.delete(`/api/permissions/${id}`);

    return response.data;
  },
};

export function permissionApiError(error) {
  const status = error?.response?.status;

  switch (status) {
    case 401:
      return "Your session expired. Please sign in again.";

    case 403:
      return "You do not have permission to perform this action.";

    case 404:
      return "This permission no longer exists.";

    case 409:
      return (
        error.response?.data?.message ||
        "This permission is assigned to a user or role."
      );

    case 419:
      return "Your security session expired. Refresh and try again.";

    case 422:
      return "Please check the entered information.";

    case 429:
      return "Too many requests. Try again later.";

    default:
      return error?.response
        ? "Something went wrong. Please try again."
        : "Unable to connect to the Laravel server.";
  }
}
