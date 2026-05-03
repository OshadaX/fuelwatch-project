# scripts/generate_dataset.py
"""
Generate synthetic dataset for employee demand prediction.
Uses Sri Lankan holidays, weather patterns, and fuel demand correlation.
"""

import pandas as pd
import numpy as np
import random
import os
import sys
from datetime import datetime, timedelta

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.holidays import is_sri_lankan_holiday, is_vacation_period, is_day_before_holiday
from utils.weather_utils import simulate_weather_for_date


def generate_synthetic_data(start_date='2023-01-01', days=1095):
    """
    Generates a synthetic dataset for employee demand prediction.
    
    Args:
        start_date: Start date for the dataset (YYYY-MM-DD)
        days: Number of days to generate (default 1095 = 3 years)
    
    Returns:
        DataFrame with features and target
    """
    random.seed(42)
    np.random.seed(42)
    
    date_list = [
        datetime.strptime(start_date, "%Y-%m-%d") + timedelta(days=x) 
        for x in range(days)
    ]
    
    data = []
    
    for current_date in date_list:
        date_str = current_date.strftime("%Y-%m-%d")
        
        # ============================================
        # 1. Date/Time Features
        # ============================================
        month = current_date.month
        day_of_week = current_date.weekday()  # 0=Monday, 6=Sunday
        day_of_month = current_date.day
        week_of_year = current_date.isocalendar()[1]
        is_weekend = 1 if day_of_week >= 5 else 0
        is_month_end = 1 if day_of_month >= 25 else 0  # Salary time = more traffic
        
        # ============================================
        # 2. Holiday & Vacation Features
        # ============================================
        is_holiday = 1 if is_sri_lankan_holiday(current_date) else 0
        is_vacation = 1 if is_vacation_period(current_date) else 0
        pre_holiday = 1 if is_day_before_holiday(current_date) else 0
        is_friday = 1 if day_of_week == 4 else 0
        
        # ============================================
        # 3. Weather Features (Simulated based on monsoon patterns)
        # ============================================
        weather_data = simulate_weather_for_date(current_date)
        weather = weather_data['weather']
        temperature = weather_data['temperature']
        
        # ============================================
        # 4. Simulated Fuel Demand (from Member 1)
        # ============================================
        # Base demand varies by day type and conditions
        base_demand = 5000  # Liters
        
        # Weekend effect: More personal travel
        if is_weekend:
            base_demand += random.randint(1500, 2500)
        
        # Holiday effect: Major increase
        if is_holiday:
            base_demand += random.randint(2500, 4000)
        
        # Vacation period: Moderate increase
        if is_vacation:
            base_demand += random.randint(1000, 2000)
        
        # Month-end salary effect
        if is_month_end:
            base_demand += random.randint(500, 1500)
        
        # Weather impact on fuel demand
        weather_demand_impact = {
            'Sunny': random.randint(300, 800),
            'Cloudy': random.randint(0, 300),
            'Rainy': random.randint(-1500, -500),
            'Stormy': random.randint(-3000, -1500)
        }
        base_demand += weather_demand_impact.get(weather, 0)
        
        # Seasonal variation (higher in April New Year, December)
        if month in [4, 12]:
            base_demand += random.randint(1000, 2000)
        
        # Add random noise
        fuel_demand = max(2000, int(base_demand + np.random.normal(0, 500)))
        
        # ============================================
        # 5. Target: Employee Count (Weighted Point System)
        # Each factor contributes independently
        # ============================================
        points = 3.0  # Base minimum staff
        
        # Fuel demand (capped contribution, ~30-40%)
        demand_normalized = min(fuel_demand / 3000, 3.5)
        points += demand_normalized * 1.2
        
        # Day of week (strong independent effect)
        day_weights = {
            0: 1.5,  # Monday
            1: 0.5,  # Tuesday
            2: 0.5,  # Wednesday
            3: 1.0,  # Thursday
            4: 2.0,  # Friday
            5: 2.5,  # Saturday
            6: 1.5,  # Sunday
        }
        points += day_weights.get(day_of_week, 1.0)
        
        # Holiday effects
        if is_holiday:
            points += 2.0
        if pre_holiday:
            points += 2.5
        
        # Weather (independent effect)
        weather_points = {
            'Sunny': 1.0,
            'Cloudy': 0.5,
            'Rainy': -0.5,
            'Stormy': -1.5
        }
        points += weather_points.get(weather, 0.0)
        
        # Vacation/seasonal
        if is_vacation:
            points += 1.5
        if month in [4, 12]:
            points += 1.0
        
        # Temperature
        if temperature > 33:
            points += 1.0
        elif temperature > 31:
            points += 0.5
        
        # Month-end
        if is_month_end:
            points += 1.0
        
        # Noise
        points += np.random.normal(0, 0.4)
        
        # Clamp
        employees_needed = int(np.ceil(max(2, min(points, 15))))
        
        # ============================================
        # Append record
        # ============================================
        data.append({
            'date': date_str,
            'month': month,
            'day_of_week': day_of_week,
            'day_of_month': day_of_month,
            'week_of_year': week_of_year,
            'is_weekend': is_weekend,
            'is_month_end': is_month_end,
            'is_holiday': is_holiday,
            'is_vacation': is_vacation,
            'is_day_before_holiday': pre_holiday,
            'is_friday': is_friday,
            'weather': weather,
            'temperature': temperature,
            'predicted_fuel_demand': fuel_demand,
            'employee_count': employees_needed
        })
    
    return pd.DataFrame(data)


def save_data(df, filename='employee_demand_dataset.csv'):
    """Save dataset to the data directory."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(os.path.dirname(script_dir), 'data')
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    file_path = os.path.join(output_dir, filename)
    df.to_csv(file_path, index=False)
    
    print(f"\n{'='*60}")
    print("DATASET GENERATION COMPLETE")
    print(f"{'='*60}")
    print(f"Output: {file_path}")
    print(f"Shape: {df.shape} ({df.shape[0]} rows, {df.shape[1]} columns)")
    print(f"\nFeatures: {list(df.columns)}")
    print(f"\nTarget (employee_count) distribution:")
    print(df['employee_count'].describe())
    print(f"\nWeather distribution:")
    print(df['weather'].value_counts())
    print(f"\nHoliday count: {df['is_holiday'].sum()} days")
    print(f"Vacation period count: {df['is_vacation'].sum()} days")
    print(f"\nSample data:")
    print(df.head(10).to_string())


if __name__ == "__main__":
    print("Generating synthetic data for Employee Demand Prediction...")
    print("Using Sri Lankan holidays and weather patterns...")
    
    df = generate_synthetic_data()
    save_data(df)
