# scripts/generate_from_real_data.py
import pandas as pd
import numpy as np
import random
import os
import sys
from datetime import datetime, timedelta

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.holidays import is_sri_lankan_holiday, is_vacation_period
from utils.weather_utils import simulate_weather_for_date

def load_real_data():
    """Loads and aggregates real fuel demand data from th.xlsx."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    real_data_path = os.path.join(base_dir, 'data', 'th.xlsx')
    
    try:
        df = pd.read_excel(real_data_path, skiprows=4)
        df = df.iloc[:, [2, 6, 7]]
        df.columns = ['Date', 'Item', 'Qty']
        df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
        df = df.dropna(subset=['Date', 'Qty'])
        df['Qty'] = pd.to_numeric(df['Qty'], errors='coerce')
        df = df.dropna(subset=['Qty'])
        
        daily_demand = df.groupby('Date')['Qty'].sum().to_dict()
        return {k.strftime('%Y-%m-%d'): v for k, v in daily_demand.items()}
    except Exception as e:
        print(f"Error loading real data: {e}")
        return {}


def generate_blended_data(start_date='2025-10-01', days=92):
    """
    Generates a dataset blending real data observations and scaled synthetic ones.
    """
    random.seed(42)
    np.random.seed(42)
    
    real_data_dict = load_real_data()
    print(f"Loaded {len(real_data_dict)} real data days.")
    
    date_list = [
        datetime.strptime(start_date, "%Y-%m-%d") + timedelta(days=x) 
        for x in range(days)
    ]
    
    data = []
    
    for current_date in date_list:
        date_str = current_date.strftime("%Y-%m-%d")
        
        # 1. Date/Time Features
        month = current_date.month
        day_of_week = current_date.weekday()
        day_of_month = current_date.day
        week_of_year = current_date.isocalendar()[1]
        is_weekend = 1 if day_of_week >= 5 else 0
        is_month_end = 1 if day_of_month >= 25 else 0
        
        # 2. Holiday features
        is_holiday = 1 if is_sri_lankan_holiday(current_date) else 0
        is_vacation = 1 if is_vacation_period(current_date) else 0
        
        # 3. Weather features
        weather_data = simulate_weather_for_date(current_date)
        weather = weather_data['weather']
        temperature = weather_data['temperature']
        
        # 4. Fuel Demand
        if date_str in real_data_dict:
            fuel_demand = int(real_data_dict[date_str])
        else:
            base_demand = 1600 # Based on real data avg
            
            if is_weekend: base_demand += random.randint(300, 600)
            if is_holiday: base_demand += random.randint(500, 1000)
            if is_vacation: base_demand += random.randint(200, 500)
            if is_month_end: base_demand += random.randint(100, 400)
            
            weather_demand_impact = {
                'Sunny': random.randint(100, 300),
                'Cloudy': random.randint(0, 100),
                'Rainy': random.randint(-400, -100),
                'Stormy': random.randint(-800, -400)
            }
            base_demand += weather_demand_impact.get(weather, 0)
            
            if month in [4, 12]: base_demand += random.randint(300, 600)
            
            fuel_demand = max(500, int(base_demand + np.random.normal(0, 200)))
            
        # 5. Target: Employee Count (scaled for new baseline)
        employees_needed = 2
        demand_factor = fuel_demand // 600
        employees_needed += demand_factor
        
        if weather == 'Stormy': employees_needed -= 1
        elif weather == 'Sunny': employees_needed += 1
        
        if is_holiday: employees_needed += 2
        if is_weekend: employees_needed += 1
        if is_vacation: employees_needed += 1
        if temperature > 32: employees_needed += 1
        
        employees_needed = max(2, min(employees_needed, 10))
        
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
            'weather': weather,
            'temperature': temperature,
            'predicted_fuel_demand': fuel_demand,
            'employee_count': employees_needed
        })
    
    return pd.DataFrame(data)

def save_data(df, filename='employee_demand_dataset.csv'):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(os.path.dirname(script_dir), 'data')
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    file_path = os.path.join(output_dir, filename)
    df.to_csv(file_path, index=False)
    print(f"Dataset generated with shape {df.shape} and saved to {file_path}")

if __name__ == "__main__":
    print("Generating blended synthetic-real data...")
    df = generate_blended_data()
    save_data(df)
