# scripts/generate_from_real_data.py
"""
Generate training dataset from real fuel sales data.
Reads Excel and PDF files from data/real/, deduplicates,
aggregates daily totals across fuel types, and generates
features + employee count targets.
"""

import pandas as pd
import numpy as np
import random
import re
import os
import sys
from datetime import datetime, timedelta

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.holidays import is_sri_lankan_holiday, is_vacation_period, is_day_before_holiday
from utils.weather_utils import simulate_weather_for_date


def load_real_data():
    """
    Loads and aggregates real fuel demand data from all files in data/real/.
    
    Handles three data formats:
    1. Excel (.xlsx) — Dhanushka Engineering sales reports with columns:
       Site, Type, Date, Class, Site, Item, Qty, Amount, Balance
       
    2. PDF (Dhanushka) — Same format as Excel but in PDF tables.
       Files like: 'Sale by Site Detail From - YYYY-MM-DD To - YYYY-MM-DD ... Tank.xls.pdf'
       and 'sale-by-site-YYYY-MM-DD-to-YYYY-MM-DD (N).pdf'
       
    3. PDF (Ceylon Petroleum summary) — Pre-aggregated daily totals:
       Date, Fuel Type, Qty (L), Unit Price, Amount
       File: 'Sale by Site Detail From - YYYY-MM-DD To - YYYY-MM-DD.pdf' (4 pages, no tank name)
    
    Deduplication strategy:
    - Duplicate downloads (1).pdf, (2).pdf etc. are detected and only one is used.
    - When a Ceylon Petroleum summary exists for a month, it's preferred over
      individual Dhanushka tank-level files to avoid double-counting.
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, 'data', 'real')
    
    if not os.path.exists(data_dir):
        print(f"⚠️ Real data directory not found: {data_dir}")
        return {}
    
    daily_demand = {}
    
    # ================================================================
    # Step 1: Identify files and deduplicate
    # ================================================================
    files = sorted(os.listdir(data_dir))
    
    # Group duplicate downloads — keep only one per base name
    seen_bases = {}
    unique_files = []
    for f in files:
        if not (f.endswith('.xlsx') or f.endswith('.pdf')):
            continue
        # Strip " (N)" suffix for dedup
        base = re.sub(r'\s*\(\d+\)', '', f)
        if base not in seen_bases:
            seen_bases[base] = f
            unique_files.append(f)
        else:
            pass  # Skip duplicate download
    
    print(f"📁 Found {len(files)} total files, {len(unique_files)} unique after dedup")
    
    # ================================================================
    # Step 2: Identify Ceylon Petroleum summary PDFs (preferred source)
    # These have pre-aggregated daily data across ALL fuel types
    # ================================================================
    summary_months = set()  # Track months covered by summary reports
    summary_files = []
    dhanushka_files = []
    
    for f in unique_files:
        if f.endswith('.pdf'):
            # Ceylon Petroleum summaries are shorter PDFs with "Fuel Type" in content
            # and don't have tank names in the filename
            is_summary = (
                'Tank' not in f and 
                'os ' not in f.lower() and 
                not f.startswith('sale-by-site')
            )
            if is_summary:
                summary_files.append(f)
            else:
                dhanushka_files.append(f)
        else:
            dhanushka_files.append(f)
    
    # ================================================================
    # Step 3: Extract from Ceylon Petroleum summary PDFs first
    # ================================================================
    try:
        import pdfplumber
        has_pdfplumber = True
    except ImportError:
        has_pdfplumber = False
        print("⚠️ pdfplumber not installed. PDF extraction will be skipped.")
    
    for f in summary_files:
        if not has_pdfplumber:
            break
        path = os.path.join(data_dir, f)
        count = 0
        try:
            with pdfplumber.open(path) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if not text:
                        continue
                    for line in text.split('\n'):
                        # Pattern: YYYY-MM-DD FuelTypeName qty unit_price amount
                        match = re.match(
                            r'^(\d{4}-\d{2}-\d{2})\s+'     # Date
                            r'(Lanka[^0-9]+?)\s+'           # Fuel type name
                            r'([\d,]+\.?\d*)\s+'            # Qty (L)
                            r'[\d,]+\.?\d*\s+'              # Unit price
                            r'[\d,]+\.?\d*$',               # Amount
                            line.strip()
                        )
                        if match:
                            date_str = match.group(1)
                            qty = float(match.group(3).replace(',', ''))
                            daily_demand[date_str] = daily_demand.get(date_str, 0) + qty
                            count += 1
                            # Track which months are covered
                            summary_months.add(date_str[:7])
            
            print(f"  ✅ {f}: {count} records (Ceylon Petroleum summary)")
        except Exception as e:
            print(f"  ❌ {f}: Error - {e}")
    
    # ================================================================
    # Step 4: Extract from Dhanushka files (Excel + PDF)
    # Skip months already covered by summary reports
    # ================================================================
    for f in dhanushka_files:
        path = os.path.join(data_dir, f)
        count = 0
        
        # Determine the month this file covers from filename
        date_match = re.search(r'(\d{4}-\d{2}-\d{2})', f) or re.search(r'(\d{4}-\d{2})', f)
        file_month = date_match.group(1)[:7] if date_match else None
        
        if file_month and file_month in summary_months:
            print(f"  ⏭️ {f}: Skipped (month {file_month} covered by summary)")
            continue
        
        if f.endswith('.xlsx'):
            try:
                import openpyxl  # Ensure available
                df = pd.read_excel(path, skiprows=4)
                if df.shape[1] >= 7:
                    date_col = pd.to_datetime(df.iloc[:, 2], errors='coerce')
                    qty_col = pd.to_numeric(df.iloc[:, 6], errors='coerce')
                    for i in range(len(df)):
                        if pd.notna(date_col.iloc[i]) and pd.notna(qty_col.iloc[i]):
                            d = date_col.iloc[i].strftime('%Y-%m-%d')
                            daily_demand[d] = daily_demand.get(d, 0) + qty_col.iloc[i]
                            count += 1
                print(f"  ✅ {f}: {count} records (Excel)")
            except Exception as e:
                print(f"  ❌ {f}: Error - {e}")
        
        elif f.endswith('.pdf') and has_pdfplumber:
            try:
                with pdfplumber.open(path) as pdf:
                    for page in pdf.pages:
                        # Try table extraction first
                        tables = page.extract_tables()
                        for table in tables:
                            # Find Date and Qty column indices from header
                            date_idx, qty_idx = None, None
                            for row in table:
                                cells = [str(c or '').strip() for c in row]
                                for i, c in enumerate(cells):
                                    if c.lower() == 'date': date_idx = i
                                    if c.lower() == 'qty': qty_idx = i
                                if date_idx is not None and qty_idx is not None:
                                    break
                            
                            if date_idx is None or qty_idx is None:
                                continue
                            
                            for row in table:
                                if len(row) <= max(date_idx, qty_idx):
                                    continue
                                raw_date = str(row[date_idx] or '').strip().split('\n')[0]
                                raw_qty = str(row[qty_idx] or '').strip().split('\n')[0]
                                if 'date' in raw_date.lower():
                                    continue
                                try:
                                    parsed_date = pd.to_datetime(raw_date)
                                    parsed_qty = float(raw_qty.replace(',', ''))
                                    d = parsed_date.strftime('%Y-%m-%d')
                                    daily_demand[d] = daily_demand.get(d, 0) + parsed_qty
                                    count += 1
                                except (ValueError, TypeError):
                                    pass
                        
                        # Fallback: text-based extraction for PDFs without tables
                        if count == 0:
                            text = page.extract_text()
                            if not text:
                                continue
                            for line in text.split('\n'):
                                # Match date patterns
                                m = re.search(r'(\d{1,2}/\d{1,2}/\d{4}|\d{4}-\d{2}-\d{2})', line)
                                if not m:
                                    continue
                                date_str = m.group(1)
                                # Find qty: number before the amount (which is larger)
                                nums = re.findall(r'([\d,]+\.?\d*)', line[m.end():])
                                if len(nums) >= 1:
                                    try:
                                        qty = float(nums[0].replace(',', ''))
                                        if 0 < qty < 50000:  # Sanity check
                                            d = pd.to_datetime(date_str).strftime('%Y-%m-%d')
                                            daily_demand[d] = daily_demand.get(d, 0) + qty
                                            count += 1
                                    except (ValueError, TypeError):
                                        pass
                
                print(f"  ✅ {f}: {count} records (PDF)")
            except Exception as e:
                print(f"  ❌ {f}: Error - {e}")
    
    return daily_demand


def generate_blended_data(start_date=None, end_date=None):
    """
    Generates a training dataset using real fuel demand data where available,
    filling gaps with scaled synthetic data.
    
    Args:
        start_date: Override start date (YYYY-MM-DD). Auto-detected from data if None.
        end_date: Override end date. Auto-detected from data if None.
    
    Returns:
        DataFrame with features and employee_count target
    """
    random.seed(42)
    np.random.seed(42)
    
    real_data_dict = load_real_data()
    print(f"\n📊 Loaded {len(real_data_dict)} unique days of real data")
    
    if not real_data_dict:
        print("⚠️ No real data found. Generating fully synthetic data.")
        start_date = start_date or '2024-01-01'
        end_date = end_date or '2025-12-31'
    
    # Start from 2024-01-01 to build a larger dataset
    # Real data fills in where available, rest is synthetic
    if start_date is None:
        start_date = '2024-01-01'  # ~2 years of data for better learning
    if end_date is None:
        real_dates = sorted(real_data_dict.keys())
        end_date = real_dates[-1] if real_dates else '2025-12-31'
        
        # Stats
        real_vals = list(real_data_dict.values())
        print(f"📅 Date range: {start_date} to {end_date}")
        print(f"📈 Fuel demand stats: min={min(real_vals):.0f}L, max={max(real_vals):.0f}L, avg={np.mean(real_vals):.0f}L")
    
    # Generate date range
    start_dt = datetime.strptime(start_date, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date, "%Y-%m-%d")
    days = (end_dt - start_dt).days + 1
    
    date_list = [start_dt + timedelta(days=x) for x in range(days)]
    
    data = []
    real_count = 0
    synthetic_count = 0
    
    # Calculate real data average for synthetic fill baseline
    real_avg = np.mean(list(real_data_dict.values())) if real_data_dict else 5000
    real_median = np.median(list(real_data_dict.values())) if real_data_dict else 3000
    
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
        pre_holiday = 1 if is_day_before_holiday(current_date) else 0
        is_friday = 1 if day_of_week == 4 else 0
        
        # 3. Weather features (simulated for historical dates)
        weather_data = simulate_weather_for_date(current_date)
        weather = weather_data['weather']
        temperature = weather_data['temperature']
        
        # 4. Fuel Demand — use real data if available, otherwise synthesize
        if date_str in real_data_dict:
            fuel_demand = real_data_dict[date_str]
            real_count += 1
        else:
            # Generate synthetic demand scaled to real data average
            base_demand = real_avg * 0.8  # Start slightly below average
            
            if is_weekend: base_demand *= 1.15
            if is_holiday: base_demand *= 1.35
            if is_vacation: base_demand *= 1.10
            if is_month_end: base_demand *= 1.08
            
            weather_factors = {
                'Sunny': 1.05,
                'Cloudy': 1.00,
                'Rainy': 0.85,
                'Stormy': 0.65
            }
            base_demand *= weather_factors.get(weather, 1.0)
            
            if month in [4, 12]: base_demand *= 1.15
            
            fuel_demand = max(500, int(base_demand + np.random.normal(0, real_avg * 0.1)))
            synthetic_count += 1
        
        # ============================================
        # 5. Target: Employee Count (Weighted Point System)
        # Each factor contributes independently to staffing need
        # ============================================
        points = 3.0  # Base minimum staff
        
        # --- Fuel demand contribution (capped at ~3.5 points) ---
        # Normalize fuel demand relative to median, cap contribution
        demand_normalized = min(fuel_demand / max(real_median, 500), 3.5)
        points += demand_normalized * 1.2  # max ~4.2 points from demand
        
        # --- Day of week (strong independent effect: 0-2.5 points) ---
        day_weights = {
            0: 1.5,  # Monday — commute rush, fleet refueling
            1: 0.5,  # Tuesday — typically quiet
            2: 0.5,  # Wednesday — typically quiet
            3: 1.0,  # Thursday — pre-weekend buildup
            4: 2.0,  # Friday — weekend travel prep
            5: 2.5,  # Saturday — peak weekend
            6: 1.5,  # Sunday — moderate
        }
        points += day_weights.get(day_of_week, 1.0)
        
        # --- Holiday effects (0-2.5 points) ---
        if is_holiday:
            points += 2.0  # Holiday itself needs extra staff
        if pre_holiday:
            points += 2.5  # Day before holiday = massive fuel rush
        
        # --- Weather (independent effect: -1.5 to +1.0 points) ---
        weather_points = {
            'Sunny': 1.0,   # Good weather = more traffic
            'Cloudy': 0.5,  # Normal
            'Rainy': -0.5,  # Reduced traffic
            'Stormy': -1.5  # Safety concerns, much less traffic
        }
        points += weather_points.get(weather, 0.0)
        
        # --- Vacation/seasonal (0-1.5 points) ---
        if is_vacation:
            points += 1.5  # School holidays = family travel
        if month in [4, 12]:
            points += 1.0  # Festival months (New Year, Christmas)
        
        # --- Temperature effect (0-1.0 points) ---
        if temperature > 33:
            points += 1.0  # Very hot = more breaks = need more staff
        elif temperature > 31:
            points += 0.5
        
        # --- Month-end salary period (0-1.0 points) ---
        if is_month_end:
            points += 1.0  # Salary week = more economic activity
        
        # Add controlled noise for realism
        points += np.random.normal(0, 0.4)
        
        # Clamp to [2, 15]
        employees_needed = int(np.ceil(max(2, min(points, 15))))
        
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
    
    print(f"\n✅ Dataset generated: {len(data)} days ({real_count} real, {synthetic_count} synthetic)")
    
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
    print(f"\nFuel demand distribution:")
    print(df['predicted_fuel_demand'].describe())
    print(f"\nWeather distribution:")
    print(df['weather'].value_counts())
    print(f"\nHoliday count: {df['is_holiday'].sum()} days")
    print(f"Day-before-holiday count: {df['is_day_before_holiday'].sum()} days")
    print(f"Friday count: {df['is_friday'].sum()} days")
    print(f"Vacation period count: {df['is_vacation'].sum()} days")
    print(f"\nSample data:")
    print(df.head(10).to_string())


if __name__ == "__main__":
    print("=" * 60)
    print("GENERATING DATASET FROM REAL FUEL DATA")
    print("=" * 60)
    print("Reading real data from data/real/ directory...\n")
    
    df = generate_blended_data()
    save_data(df)
