# Member 3: Full Documentation
**Author:** Oshada Navindra (IT22079022)  
**Scope:** Employee Prediction System (ML) & Internal Management Platform (Full-Stack)

---

## 1. Project Context & Role

In the FuelWatch ecosystem, Member 3 is responsible for the **Internal Management & Operational Intelligence** layer. This involves two primary domains:
1.  **Research Domain**: Developing a predictive model to optimize human resource allocation at fuel stations.
2.  **Application Domain**: Building the administrative and employee-facing interfaces that handle attendance, shift management, and workforce visualization.

---

## 2. Research Component: Employee Prediction System

### 2.1 Problem Statement
Retail fuel station management often suffers from inefficient staffing. Overstaffing leads to high overhead, while understaffing results in poor customer service and revenue loss. This research aims to solve the "Static Rostering Problem" by introducing a context-aware, machine learning-driven staffing model.

### 2.2 Methodology & Algorithm
The system employs a **Random Forest Regressor** to predict the daily worker requirement. 
*   **Why Random Forest?**: It handles non-linear relationships (e.g., the combined impact of rain and a holiday) better than linear models and is resistant to overfitting.
*   **Model Specs**: 150 Estimators, Max Depth of 15.

### 2.3 Feature Engineering
The model's accuracy is derived from its multi-dimensional input set:
*   **Operational**: `predicted_fuel_demand` (Directly synced from Member 1's forecasting module).
*   **Environmental**: Daily categorical weather (Sunny, Rainy, Stormy) and Temperature.
*   **Temporal**: 
    *   `is_weekend`: Binary flag for Saturday/Sunday.
    *   `is_holiday`: Specific to Sri Lankan public holidays.
    *   `is_month_end`: Captures the traffic surge during payday periods.

### 2.4 Data Preprocessing
*   **Dataset**: 3 months of authentic operational data from a high-traffic Colombo station.
*   **Cleanup**: Missing weather data imputed via historical averages.
*   **Encoding**: Categorical weather states converted via One-Hot Encoding.
*   **Scaling**: Normalization applied to fuel volumes and temperature for uniform weighting.

### 2.5 Results & Evaluation
The model achieved high reliability in the metropolitan testing phase:
*   **R² (Coefficient of Determination)**: High correlation between predicted and actual staffing needs.
*   **MAE (Mean Absolute Error)**: Minimal deviation, providing actionable rounding for staffing.

---

## 3. Application Features & Functionality

### 3.1 Staff Prediction Dashboard (`StaffPrediction.jsx`)
The centerpiece of the Admin interface. It provides a visual bridge between AI predictions and management decisions.
*   **Live Sync with Member 1**: An "Interoperability Bridge" that pulls live fuel demand forecasts from Member 1's API to drive staffing needs.
*   **Dynamic Visualizations**: 
    *   **Dual-Layer Charts**: Composed charts showing Staffing Needs (Area) vs. Fuel Demand (Bar).
    *   **Aesthetic UI**: Support for Dark/Light modes with premium `framer-motion` transitions.
*   **Smart Alerts**: Visual badges like "High Alert: Holiday + High Demand" to warn managers of potential bottlenecks.

### 3.2 Smart Attendance System (`EmployeePortal.jsx`)
A modern replacement for manual logbooks using QR technology.
*   **QR Check-in/Out**: Employees scan a station-generated dynamic QR code to log their shifts.
*   **Real-time Status**: Displays current shift duration and active status to the employee.
*   **Admin Verification**: Admins can monitor live attendance through the `AdminQRView.jsx`.

### 3.3 Internal Employee Management
*   **Profile Management**: CRUD operations for employee records, including role assignments and station mapping.
*   **Shift History**: Detailed records of historical attendance for payroll and performance auditing.

---

## 4. Technical Architecture

### 4.1 Technology Stack
*   **Frontend**: React 18 with Recharts, Tailwind CSS, and Lucide Icons.
*   **Backend**: Node.js & Express (API logic, MongoDB integration).
*   **ML Service**: Python & Flask (Model serving on port 5003).

### 4.2 API Integration Flow
1.  **Request**: React dashboard requests a 7-day forecast.
2.  **Sync**: Backend fetches Fuel Demand from Member 1's service.
3.  **Predict**: Data is sent to the Flask ML Service.
4.  **Visualize**: Resulting predictions are rendered with interactive charts in the UI.

---

## 5. Security & Best Practices

> [!WARNING]
> While the prototype is functional, the following security implementations are currently in the development roadmap:

1.  **Data Integrity**: Implementation of password hashing for the user update flow.
2.  **Anti-Spoofing**: 
    *   **Geo-fencing**: Verifying GPS coordinates during QR scan to ensure the employee is physically at the station.
    *   **QR TTL**: Implementing Time-To-Live logic for QR codes to prevent reuse of old screenshots.

---

## 6. Accessing Documentation
*   **ML API Docs**: `http://localhost:5003/docs` (Swagger)
*   **Front-end Components**: `frontend/src/components/member3-oshada/`
