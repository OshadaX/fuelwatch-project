import axios from "axios";

// Member 1 - Fuel Demand Prediction
const ML_BASE_URL = "http://127.0.0.1:8090";

// Member 3 - Employee Demand Prediction
const EMP_ML_API_URL = "http://127.0.0.1:5003";

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

/**
 * Member 3: Predict employees needed based on Member 1's forecast
 * POST /predict/batch
 */
export async function predictStaffBatch(forecastData) {
  const res = await axios.post(`${EMP_ML_API_URL}/predict/batch`, {
    daily: forecastData
  });
  return res.data;
}
