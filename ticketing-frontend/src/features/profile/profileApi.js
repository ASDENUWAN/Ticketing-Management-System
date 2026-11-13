import api from "../../api/client";

export const profileApi = {
  /**
   * Update the logged-in user's own profile.
   */
  async update(data) {
    const response = await api.patch("/api/profile", data);

    return response.data;
  },
};

export function profileApiError(error) {
  const status = error?.response?.status;

  if (status === 401) {
    return "Your session expired. Please sign in again.";
  }

  if (status === 403) {
    return "Your administrator has disabled profile editing, or you do not have the required permission.";
  }

  if (status === 419) {
    return "Your security session expired. Refresh the page and try again.";
  }

  if (status === 422) {
    return "Please check the highlighted fields.";
  }

  if (status === 429) {
    return "Too many requests. Please try again later.";
  }

  if (!error?.response) {
    return "Cannot connect to the Laravel server.";
  }

  return "Unable to update your profile. Please try again.";
}
