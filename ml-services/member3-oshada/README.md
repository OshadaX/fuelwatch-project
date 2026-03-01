# Employee Demand Prediction Service (Member 3)

This service predicts the number of employees required for a specific day based on various factors such as predicted fuel demand, weather, and holidays.

## Overview
- **Goal**: Optimize staff allocation.
- **Inputs**: Date, Month, Weather, Holiday status, Predicted Fuel Demand (from Member 1).
- **Output**: Number of employees needed.

## Directory Structure
- `api/`: Contains the Flask `app.py`.
- `data/`: Contains the synthetic dataset `employee_demand_dataset.csv`.
- `models/`: Contains the trained model `employee_model.joblib`.
- `scripts/`: Python scripts for data generation and training.

## Setup
Ensure you have the dependencies installed:
```bash
pip install -r requirements.txt
```

## Usage

### 1. Generate Dataset
If you need to regenerate the synthetic data:
```bash
python scripts/generate_dataset.py
```
This produces `data/employee_demand_dataset.csv`.

### 2. Train Model
To train the Random Forest Regressor:
```bash
python scripts/train_model.py
```
This saves the trained model to `models/employee_model.joblib`.

### 3. Run API
Start the Flask API to serve predictions:
```bash
python api/app.py
```
Endpoint: `POST /predict`
Example Body:
```json
{
    "date": "2023-12-25",
    "predicted_fuel_demand": 8000,
    "weather": "Sunny"
}
```

## Logic
The logic assumes:
- Higher fuel demand = More employees.
- Weekends/Holidays = Higher base demand + extra staff.
- Severe weather (Stormy) = Reduced staff (less traffic).
