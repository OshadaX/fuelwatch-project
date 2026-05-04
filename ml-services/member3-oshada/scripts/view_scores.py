# scripts/view_scores.py
"""
Quickly view model performance scores (R2, F2, MAE, etc.) for Member 3.
"""

import pandas as pd
import numpy as np
import joblib
import os
from sklearn.metrics import (
    mean_absolute_error, 
    mean_squared_error, 
    r2_score, 
    fbeta_score,
    precision_score,
    recall_score
)
from sklearn.model_selection import train_test_split

def calculate_scores():
    # Define paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.dirname(script_dir)
    data_path = os.path.join(base_dir, 'data', 'employee_demand_dataset.csv')
    model_path = os.path.join(base_dir, 'models', 'employee_model.joblib')

    if not os.path.exists(data_path) or not os.path.exists(model_path):
        print("Error: Data or Model not found.")
        return

    # Load data and model
    df = pd.read_csv(data_path)
    model = joblib.load(model_path)

    # Prepare features
    feature_cols = [
        'month', 'day_of_week', 'day_of_month', 'week_of_year',
        'is_weekend', 'is_month_end', 'is_holiday', 'is_vacation',
        'is_day_before_holiday', 'is_friday',
        'weather', 'temperature', 'predicted_fuel_demand'
    ]
    target_col = 'employee_count'

    X = df[feature_cols]
    y = df[target_col]

    # Split (same as training)
    _, X_test, _, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Predict
    y_pred = model.predict(X_test)

    # 1. Regression Metrics
    mae = mean_absolute_error(y_test, y_pred)
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test, y_pred)

    # 2. Classification Metrics (High Demand Detection)
    # Define 'High Demand' as top 30%
    threshold = np.percentile(y, 70)
    y_test_class = (y_test >= threshold).astype(int)
    y_pred_class = (y_pred >= threshold).astype(int)

    f2 = fbeta_score(y_test_class, y_pred_class, beta=2)
    precision = precision_score(y_test_class, y_pred_class)
    recall = recall_score(y_test_class, y_pred_class)

    print("\n" + "="*45)
    print("   MEMBER 3 MODEL PERFORMANCE REPORT")
    print("="*45)
    
    print("\n--- REGRESSION METRICS ---")
    print(f"R2 Score:   {r2:.4f}")
    print(f"MAE:        {mae:.4f} employees")
    print(f"RMSE:       {rmse:.4f} employees")
    print(f"MSE:        {mse:.4f}")

    print("\n--- CLASSIFICATION METRICS (High Demand) ---")
    print(f"Threshold:  >= {threshold} employees")
    print(f"F2-Score:   {f2:.4f} (Recall-optimized)")
    print(f"Precision:  {precision:.4f}")
    print(f"Recall:     {recall:.4f}")
    
    print("\n" + "="*45)
    print("   READY FOR FINAL ANALYSIS")
    print("="*45)

if __name__ == "__main__":
    calculate_scores()
