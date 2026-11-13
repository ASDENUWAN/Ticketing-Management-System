import api from "../../api/client";

export const categoriesApi = {
  // CATEGORY TYPES

  async listTypes() {
    const response = await api.get("/api/category-types");
    return response.data;
  },

  async createType(data) {
    const response = await api.post("/api/category-types", data);

    return response.data;
  },

  async updateType(id, data) {
    const response = await api.patch(`/api/category-types/${id}`, data);

    return response.data;
  },

  async deleteType(id) {
    const response = await api.delete(`/api/category-types/${id}`);

    return response.data;
  },

  // CATEGORIES

  async listCategories({ categoryTypeId, page = 1, search = "", signal }) {
    const response = await api.get("/api/categories", {
      params: {
        category_type_id: categoryTypeId,
        page,
        ...(search ? { search } : {}),
      },
      signal,
    });

    return response.data;
  },

  async createCategory(data) {
    const response = await api.post("/api/categories", data);

    return response.data;
  },

  async updateCategory(id, data) {
    const response = await api.patch(`/api/categories/${id}`, data);

    return response.data;
  },

  async deleteCategory(id) {
    const response = await api.delete(`/api/categories/${id}`);

    return response.data;
  },
};

export function categoryApiError(error) {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message;

  if (status === 401) {
    return "Session expired. Please sign in again.";
  }

  if (status === 403) {
    return "You do not have permission to perform this action.";
  }

  if (status === 404) {
    return "This category record no longer exists.";
  }

  if (status === 409) {
    return serverMessage || "This record is protected or currently in use.";
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
    return "Unable to connect to the Laravel backend.";
  }

  return "Something went wrong. Please try again.";
}
