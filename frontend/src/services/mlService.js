import axios from "axios";

// Change this if your backend base URL changes
const ML_BASE_URL = "http://127.0.0.1:8090";

export async function healthCheck() {
  const res = await axios.get(`${ML_BASE_URL}/health`);
  return res.data;
}

/**
 * Single endpoint:
 * POST /forecast
 * form-data:
 *  - mode: "weekly"|"monthly"|"annual"
 *  - file: optional PDF
 */
export async function forecastFuel({ mode, file }) {
  const formData = new FormData();
  formData.append("mode", mode);

  if (file) {
    formData.append("file", file);
  }

  const res = await axios.post(`${ML_BASE_URL}/forecast`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
}
