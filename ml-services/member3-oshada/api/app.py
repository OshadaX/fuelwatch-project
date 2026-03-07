# api/app.py
"""
Flask API for Employee Demand Prediction Service.
Provides endpoints for single and batch predictions with weather API integration.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import joblib
import json
import os
import sys
from datetime import datetime, timedelta
import numpy as np

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.holidays import is_sri_lankan_holiday, is_vacation_period
from utils.weather_utils import (
    fetch_weather_forecast,
    simulate_weather_for_date,
    get_weather_for_date
)

app = Flask(__name__)
CORS(app)

# ============================================
# Load Model and Metadata
# ============================================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'employee_model.joblib')
META_PATH = os.path.join(BASE_DIR, 'models', 'model_meta.json')

model = None
model_meta = None


def load_employee_model():
    """Load the trained model and metadata."""
    global model, model_meta
    
    if os.path.exists(MODEL_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            print(f"✅ Model loaded from {MODEL_PATH}")
        except Exception as e:
            print(f"❌ Error loading model: {e}")
    else:
        print(f"⚠️ Warning: Model not found at {MODEL_PATH}")
    
    if os.path.exists(META_PATH):
        try:
            with open(META_PATH, 'r') as f:
                model_meta = json.load(f)
            print(f"✅ Metadata loaded from {META_PATH}")
        except Exception as e:
            print(f"❌ Error loading metadata: {e}")


load_employee_model()


def prepare_features(date_str: str, fuel_demand: float, weather: str = None, temperature: float = None):
    """
    Prepare feature DataFrame for a single prediction.
    
    If weather/temperature not provided, fetches from API or simulates.
    """
    try:
        # Handle formats like "YYYY-MM-DD" or "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:MM:SS..."
        date_str_clean = str(date_str).strip().split('T')[0].split(' ')[0]
        date_obj = datetime.strptime(date_str_clean, "%Y-%m-%d")
    except ValueError:
        raise ValueError(f"Invalid date format: {date_str}. Expected YYYY-MM-DD")
    
    # Get weather data if not provided
    if weather is None or temperature is None:
        weather_data = get_weather_for_date(date_str)
        if weather is None:
            weather = weather_data['weather']
        if temperature is None:
            temperature = weather_data['temperature']
    
    # Calculate features
    features = {
        'month': date_obj.month,
        'day_of_week': date_obj.weekday(),
        'day_of_month': date_obj.day,
        'week_of_year': date_obj.isocalendar()[1],
        'is_weekend': 1 if date_obj.weekday() >= 5 else 0,
        'is_month_end': 1 if date_obj.day >= 25 else 0,
        'is_holiday': 1 if is_sri_lankan_holiday(date_obj) else 0,
        'is_vacation': 1 if is_vacation_period(date_obj) else 0,
        'weather': weather,
        'temperature': temperature,
        'predicted_fuel_demand': float(fuel_demand)
    }
    
    return pd.DataFrame([features]), weather, temperature


# ============================================
# API Endpoints
# ============================================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'member3-employee-demand-ml',
        'model_loaded': model is not None,
        'meta_loaded': model_meta is not None
    }), 200


@app.route('/model/info', methods=['GET'])
def model_info():
    """Get model information and metrics."""
    if model_meta is None:
        return jsonify({'error': 'Model metadata not loaded'}), 503
    
    return jsonify({
        'features': model_meta.get('feature_columns', []),
        'metrics': model_meta.get('metrics', {}),
        'training_info': model_meta.get('training_info', {}),
        'top_features': model_meta.get('feature_importance', [])[:5]
    })


@app.route('/predict', methods=['POST'])
def predict_employee_demand():
    """
    Predict employee demand for a single day.
    
    Request JSON:
    {
        "date": "YYYY-MM-DD",
        "predicted_fuel_demand": <float>,
        "weather": "Sunny|Cloudy|Rainy|Stormy" (optional - fetches from API if not provided),
        "temperature": <float> (optional)
    }
    """
    if model is None:
        load_employee_model()
        if model is None:
            return jsonify({'error': 'Model not initialized. Please train the model first.'}), 503
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No input data provided'}), 400
        
        date_str = data.get('date')
        fuel_demand = data.get('predicted_fuel_demand')
        weather = data.get('weather')
        temperature = data.get('temperature')
        
        if not date_str or fuel_demand is None:
            return jsonify({'error': 'Missing required fields: date, predicted_fuel_demand'}), 400
        
        # Prepare features
        df, used_weather, used_temp = prepare_features(date_str, fuel_demand, weather, temperature)
        
        # Predict
        prediction = model.predict(df)[0]
        employees_needed = int(np.ceil(max(2, min(prediction, 15))))
        
        return jsonify({
            'date': date_str,
            'predicted_employee_count': employees_needed,
            'confidence': 'high' if model_meta and model_meta.get('metrics', {}).get('r2', 0) > 0.9 else 'medium',
            'metadata': {
                'weather_used': used_weather,
                'temperature_used': used_temp,
                'fuel_demand_used': fuel_demand,
                'is_holiday': bool(df['is_holiday'].iloc[0]),
                'is_weekend': bool(df['is_weekend'].iloc[0]),
                'is_vacation': bool(df['is_vacation'].iloc[0])
            }
        })
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f"Prediction failed: {str(e)}"}), 500


@app.route('/predict/batch', methods=['POST'])
def predict_batch():
    """
    Batch prediction for multiple days (typically 7-day forecast).
    
    Accepts Member 1's forecast format:
    {
        "daily": [
            {"Date": "2026-02-01", "total_demand": 5000, ...},
            {"Date": "2026-02-02", "total_demand": 5200, ...}
        ]
    }
    
    OR simplified format:
    {
        "forecasts": [
            {"date": "2026-02-01", "fuel_demand": 5000},
            {"date": "2026-02-02", "fuel_demand": 5200}
        ]
    }
    """
    if model is None:
        load_employee_model()
        if model is None:
            return jsonify({'error': 'Model not initialized'}), 503
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No input data provided'}), 400
        
        # Support both formats
        forecasts = data.get('forecasts') or data.get('daily', [])
        if not forecasts:
            return jsonify({'error': 'No forecast data provided'}), 400
        
        predictions = []
        total_employees = 0
        
        for forecast in forecasts:
            # Handle both field naming conventions
            date_str = forecast.get('date') or forecast.get('Date')
            
            # Get fuel demand - try multiple field names
            fuel_demand = (
                forecast.get('fuel_demand') or
                forecast.get('predicted_fuel_demand') or
                forecast.get('total_demand')
            )
            
            # If fuel types are provided individually, sum them
            if fuel_demand is None:
                fuel_cols = [k for k in forecast.keys() if k not in ['date', 'Date']]
                if fuel_cols:
                    fuel_demand = sum(float(forecast.get(fc, 0)) for fc in fuel_cols if isinstance(forecast.get(fc), (int, float)))
            
            if not date_str or fuel_demand is None:
                continue
            
            # Force truncation of date string explicitly for Member 1 prediction
            if date_str and "T" in str(date_str):
                date_str = str(date_str).split("T")[0]
            elif date_str and " " in str(date_str):
                date_str = str(date_str).split(" ")[0]
                
            # Prepare and predict
            df, used_weather, used_temp = prepare_features(date_str, float(fuel_demand))
            prediction = model.predict(df)[0]
            employees_needed = int(np.ceil(max(2, min(prediction, 15))))
            total_employees += employees_needed
            
            predictions.append({
                'date': date_str,
                'employees_needed': employees_needed,
                'weather': used_weather,
                'temperature': used_temp,
                'fuel_demand': float(fuel_demand),
                'is_holiday': bool(df['is_holiday'].iloc[0]),
                'is_weekend': bool(df['is_weekend'].iloc[0])
            })
        
        if not predictions:
            return jsonify({'error': 'No valid forecasts could be processed'}), 400
        
        return jsonify({
            'ok': True,
            'total_days': len(predictions),
            'total_employee_days': total_employees,
            'average_daily_employees': round(total_employees / len(predictions), 1),
            'predictions': predictions
        })
    
    except Exception as e:
        return jsonify({'error': f"Batch prediction failed: {str(e)}"}), 500


@app.route('/predict/weekly', methods=['GET'])
def predict_weekly():
    """
    Get weekly employee forecast from today.
    Uses weather API for real weather data.
    Requires fuel demand estimate or uses average.
    
    Query params:
    - base_demand: Base daily fuel demand (default: 5000)
    """
    if model is None:
        load_employee_model()
        if model is None:
            return jsonify({'error': 'Model not initialized'}), 503
    
    try:
        base_demand = float(request.args.get('base_demand', 5000))
        
        # Fetch 7-day weather forecast
        weather_forecast = fetch_weather_forecast(days=7)
        
        predictions = []
        today = datetime.now()
        
        for i in range(7):
            target_date = today + timedelta(days=i)
            date_str = target_date.strftime("%Y-%m-%d")
            
            # Get weather from forecast or simulate
            if weather_forecast and i < len(weather_forecast.get('dates', [])):
                weather = weather_forecast['weather_categories'][i]
                temperature = weather_forecast['temp_avg'][i]
            else:
                weather_data = simulate_weather_for_date(target_date)
                weather = weather_data['weather']
                temperature = weather_data['temperature']
            
            # Estimate fuel demand based on conditions
            fuel_demand = base_demand
            if target_date.weekday() >= 5:  # Weekend
                fuel_demand *= 1.3
            if is_sri_lankan_holiday(target_date):
                fuel_demand *= 1.5
            if weather == 'Stormy':
                fuel_demand *= 0.7
            elif weather == 'Rainy':
                fuel_demand *= 0.85
            
            # Prepare and predict
            df, _, _ = prepare_features(date_str, fuel_demand, weather, temperature)
            prediction = model.predict(df)[0]
            employees_needed = int(np.ceil(max(2, min(prediction, 15))))
            
            predictions.append({
                'date': date_str,
                'day_name': target_date.strftime("%A"),
                'employees_needed': employees_needed,
                'weather': weather,
                'temperature': round(temperature, 1),
                'estimated_fuel_demand': round(fuel_demand),
                'is_holiday': is_sri_lankan_holiday(target_date),
                'is_weekend': target_date.weekday() >= 5
            })
        
        return jsonify({
            'ok': True,
            'generated_at': datetime.now().isoformat(),
            'base_demand_used': base_demand,
            'predictions': predictions
        })
    
    except Exception as e:
        return jsonify({'error': f"Weekly prediction failed: {str(e)}"}), 500


if __name__ == '__main__':
    print("\n" + "="*60)
    print("MEMBER 3 - EMPLOYEE DEMAND PREDICTION API")
    print("="*60)
    print("Endpoints:")
    print("  GET  /health         - Health check")
    print("  GET  /model/info     - Model information")
    print("  POST /predict        - Single day prediction")
    print("  POST /predict/batch  - Batch prediction (7-day)")
    print("  GET  /predict/weekly - Weekly forecast from today")
    print("="*60 + "\n")
    
    app.run(host='0.0.0.0', port=5003, debug=True)
