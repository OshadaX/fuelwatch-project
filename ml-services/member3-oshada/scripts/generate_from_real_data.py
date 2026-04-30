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
    """Loads and aggregates real fuel demand data from all excel and pdf files in the data directory."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, 'data')
    
    daily_demand = {}
    
    try:
        # Import pdfplumber inline if available
        try:
            import pdfplumber
            import re
            has_pdfplumber = True
        except ImportError:
            has_pdfplumber = False
            print("pdfplumber not installed. PDF data extraction will be skipped.")

        for root, dirs, files in os.walk(data_dir):
            for filename in files:
                filepath = os.path.join(root, filename)
                
                # Handle Excel files
                if filename.endswith('.xlsx') or filename.endswith('.xls'):
                    try:
                        df = pd.read_excel(filepath, skiprows=4)
                        if df.shape[1] > 6:
                            df_sub = df.iloc[:, [2, 6]].copy()
                            df_sub.columns = ['Date', 'Qty']
                            df_sub['Date'] = pd.to_datetime(df_sub['Date'], errors='coerce')
                            df_sub = df_sub.dropna(subset=['Date', 'Qty'])
                            df_sub['Qty'] = pd.to_numeric(df_sub['Qty'], errors='coerce')
                            df_sub = df_sub.dropna(subset=['Qty'])
                            
                            for _, row in df_sub.iterrows():
                                date_str = row['Date'].strftime('%Y-%m-%d')
                                if date_str in daily_demand:
                                    daily_demand[date_str] += row['Qty']
                                else:
                                    daily_demand[date_str] = row['Qty']
                    except Exception as inner_e:
                        print(f"Skipping or error reading {filename}: {inner_e}")
                
                # Handle PDF files
                elif filename.endswith('.pdf') and has_pdfplumber:
                    try:
                        with pdfplumber.open(filepath) as pdf:
                            for page in pdf.pages:
                                text = page.extract_text()
                                if not text: continue
                                for line in text.split('\\n'):
                                    match = re.match(r'^(\\d{1,2}/\\d{1,2}/\\d{4})\\s+.*?\\s+([\\d,]+\\.?\\d*)\\s+[\\d,]+\\.?\\d*$', line)
                                    if match:
                                        date_str = match.group(1)
                                        qty_str = match.group(2).replace(',', '')
                                        try:
                                            date_obj = pd.to_datetime(date_str)
                                            qty = float(qty_str)
                                            formatted_date = date_obj.strftime('%Y-%m-%d')
                                            if formatted_date in daily_demand:
                                                daily_demand[formatted_date] += qty
                                            else:
                                                daily_demand[formatted_date] = qty
                                        except:
                                            pass
                    except Exception as inner_e:
                        print(f"Skipping or error reading PDF {filename}: {inner_e}")
                        
        return daily_demand
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
