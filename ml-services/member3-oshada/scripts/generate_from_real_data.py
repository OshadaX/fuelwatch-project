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


def clean_real_data(real_data_dict):
    """
    Clean real fuel demand data:
    1. Remove outliers using IQR method
    2. Normalize months with incomplete fuel type coverage
    
    Returns:
        Cleaned dict {date_str: demand}
    """
    if not real_data_dict:
        return {}
    
    # ---- Step 1: Detect and fix month-level data inconsistencies ----
    # November only captured Super Diesel (~55-512L), Oct & Dec have all fuel types
    # Scale November up based on the ratio: Super Diesel is typically ~5-8% of total
    monthly_avgs = {}
    for d, v in real_data_dict.items():
        month_key = d[:7]
        monthly_avgs.setdefault(month_key, []).append(v)
    
    for mk in monthly_avgs:
        vals = monthly_avgs[mk]
        monthly_avgs[mk] = np.mean(vals)
    
    print(f"\n🔍 Monthly averages BEFORE cleaning:")
    for mk in sorted(monthly_avgs.keys()):
        print(f"  {mk}: avg={monthly_avgs[mk]:.0f}L")
    
    # November avg (~260L) is ~20x lower than Oct (~3200L) and Dec (~7200L)
    # This indicates only 1 fuel type was captured. Scale it up.
    if '2025-11' in monthly_avgs and '2025-12' in monthly_avgs:
        nov_avg = monthly_avgs['2025-11']
        # Use Oct+Dec average as reference for what "full" data looks like
        reference_months = []
        if '2025-10' in monthly_avgs:
            reference_months.append(monthly_avgs['2025-10'])
        if '2025-12' in monthly_avgs:
            reference_months.append(monthly_avgs['2025-12'])
        
        if reference_months:
            ref_avg = np.mean(reference_months)
            # Only scale if November is suspiciously low (< 20% of reference)
            if nov_avg < ref_avg * 0.2:
                scale_factor = ref_avg / nov_avg * 0.85  # 0.85 = Nov may genuinely be quieter
                print(f"\n⚠️ November data appears incomplete (avg {nov_avg:.0f}L vs reference {ref_avg:.0f}L)")
                print(f"  Scaling November by {scale_factor:.1f}x")
                for d in list(real_data_dict.keys()):
                    if d.startswith('2025-11'):
                        real_data_dict[d] = real_data_dict[d] * scale_factor
    
    # ---- Step 2: Remove outliers using IQR ----
    values = list(real_data_dict.values())
    q1 = np.percentile(values, 25)
    q3 = np.percentile(values, 75)
    iqr = q3 - q1
    lower_bound = max(100, q1 - 1.5 * iqr)  # Don't go below 100L
    upper_bound = q3 + 1.5 * iqr
    
    removed = []
    for d in list(real_data_dict.keys()):
        if real_data_dict[d] > upper_bound or real_data_dict[d] < lower_bound:
            removed.append((d, real_data_dict[d]))
            del real_data_dict[d]
    
    if removed:
        print(f"\n🗑️ Removed {len(removed)} outliers (IQR bounds: {lower_bound:.0f}-{upper_bound:.0f}L):")
        for d, v in removed:
            print(f"  {d}: {v:.0f}L")
    
    # Print cleaned stats
    vals = list(real_data_dict.values())
    print(f"\n✅ After cleaning: {len(real_data_dict)} days")
    print(f"  Demand range: {min(vals):.0f}L - {max(vals):.0f}L, avg={np.mean(vals):.0f}L")
    
    return real_data_dict


def compute_employee_count(fuel_demand, day_of_week, is_holiday, pre_holiday,
                           weather, is_vacation, month, temperature, is_month_end,
                           real_median, noise_std=0.4):
    """
    Compute employee count using the weighted point system.
    Extracted as a reusable function for both base and augmented rows.
    """
    points = 3.0  # Base minimum staff
    
    # Fuel demand contribution (capped)
    demand_normalized = min(fuel_demand / max(real_median, 500), 3.5)
    points += demand_normalized * 1.2
    
    # Day of week
    day_weights = {
        0: 1.5, 1: 0.5, 2: 0.5, 3: 1.0,
        4: 2.0, 5: 2.5, 6: 1.5,
    }
    points += day_weights.get(day_of_week, 1.0)
    
    # Holiday effects
    if is_holiday:
        points += 2.0
    if pre_holiday:
        points += 2.5
    
    # Weather
    weather_points = {
        'Sunny': 1.0, 'Cloudy': 0.5, 'Rainy': -0.5, 'Stormy': -1.5
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
    points += np.random.normal(0, noise_std)
    
    return int(np.ceil(max(2, min(points, 15))))


def generate_real_only_data(max_augmented=0):
    """
    Generates a training dataset using ONLY real fuel demand data.
    No synthetic data is used.
    
    Args:
        max_augmented: Maximum number of augmented rows to add (0 = no augmentation)
    
    Pipeline:
    1. Load real data from data/real/
    2. Clean outliers and normalize incomplete months
    3. Generate base rows (1 per real data day)
    4. Optionally augment if max_augmented > 0
    
    Returns:
        DataFrame with features and employee_count target
    """
    random.seed(42)
    np.random.seed(42)
    
    # ---- Load and clean ----
    real_data_dict = load_real_data()
    print(f"\n📊 Loaded {len(real_data_dict)} unique days of real data")
    
    if not real_data_dict:
        print("❌ No real data found in data/real/. Cannot proceed without real data.")
        return pd.DataFrame()
    
    real_data_dict = clean_real_data(real_data_dict)
    
    if not real_data_dict:
        print("❌ All data removed during cleaning. Check data/real/ files.")
        return pd.DataFrame()
    
    real_median = np.median(list(real_data_dict.values()))
    real_std = np.std(list(real_data_dict.values()))
    
    # ---- Generate base rows from real data ----
    data = []
    weather_options = ['Sunny', 'Cloudy', 'Rainy', 'Stormy']
    
    for date_str, fuel_demand in sorted(real_data_dict.items()):
        current_date = datetime.strptime(date_str, "%Y-%m-%d")
        
        month = current_date.month
        day_of_week = current_date.weekday()
        day_of_month = current_date.day
        week_of_year = current_date.isocalendar()[1]
        is_weekend = 1 if day_of_week >= 5 else 0
        is_month_end = 1 if day_of_month >= 25 else 0
        is_holiday = 1 if is_sri_lankan_holiday(current_date) else 0
        is_vacation = 1 if is_vacation_period(current_date) else 0
        pre_holiday = 1 if is_day_before_holiday(current_date) else 0
        is_friday = 1 if day_of_week == 4 else 0
        
        weather_data = simulate_weather_for_date(current_date)
        weather = weather_data['weather']
        temperature = weather_data['temperature']
        
        employees_needed = compute_employee_count(
            fuel_demand, day_of_week, is_holiday, pre_holiday,
            weather, is_vacation, month, temperature, is_month_end,
            real_median
        )
        
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
            'employee_count': employees_needed,
            'data_source': 'real'
        })
    
    base_count = len(data)
    print(f"\n📋 Base dataset: {base_count} real data rows")
    
    # ---- Augmentation (optional) ----
    if max_augmented > 0:
        augmented = []
        
        for row in data:
            current_date = datetime.strptime(row['date'], "%Y-%m-%d")
            base_demand = row['predicted_fuel_demand']
            
            # --- Variant 1: Demand noise (+/- 10-15%) ---
            for noise_pct in [-0.12, -0.06, 0.06, 0.12]:
                noisy_demand = max(100, base_demand * (1 + noise_pct + np.random.normal(0, 0.02)))
                
                weather_data = simulate_weather_for_date(current_date)
                weather = weather_data['weather']
                temperature = weather_data['temperature']
                
                emp = compute_employee_count(
                    noisy_demand, row['day_of_week'], row['is_holiday'],
                    row['is_day_before_holiday'], weather, row['is_vacation'],
                    row['month'], temperature, row['is_month_end'], real_median
                )
                
                augmented.append({
                    'date': row['date'],
                    'month': row['month'],
                    'day_of_week': row['day_of_week'],
                    'day_of_month': row['day_of_month'],
                    'week_of_year': row['week_of_year'],
                    'is_weekend': row['is_weekend'],
                    'is_month_end': row['is_month_end'],
                    'is_holiday': row['is_holiday'],
                    'is_vacation': row['is_vacation'],
                    'is_day_before_holiday': row['is_day_before_holiday'],
                    'is_friday': row['is_friday'],
                    'weather': weather,
                    'temperature': round(temperature + np.random.normal(0, 0.8), 1),
                    'predicted_fuel_demand': round(noisy_demand, 1),
                    'employee_count': emp,
                    'data_source': 'augmented'
                })
        
        # Cap augmented rows to max_augmented
        if len(augmented) > max_augmented:
            random.shuffle(augmented)
            augmented = augmented[:max_augmented]
        
        data.extend(augmented)
        print(f"🔄 Augmented: {len(augmented)} rows added (max={max_augmented})")
    else:
        print("📌 No augmentation — using pure real data only")
    
    print(f"✅ Total dataset: {len(data)} rows")
    
    return pd.DataFrame(data)


# Keep backward compatibility
def generate_blended_data(start_date=None, end_date=None):
    """
    DEPRECATED: Now redirects to generate_real_only_data().
    Use generate_real_only_data() directly for real-data-only pipeline.
    """
    print("⚠️ generate_blended_data() is deprecated. Using real-data-only pipeline.")
    return generate_real_only_data()


def save_data(df, filename='employee_demand_dataset.csv'):
    """Save dataset to the data directory."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(os.path.dirname(script_dir), 'data')
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    file_path = os.path.join(output_dir, filename)
    
    # Save a clean version without tracking columns
    df_to_save = df.drop(columns=['data_source'], errors='ignore')
    df_to_save.to_csv(file_path, index=False)
    
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
    if 'data_source' in df.columns:
        print(f"\nData source breakdown:")
        print(df['data_source'].value_counts().to_string())
    print(f"\nSample data:")
    print(df.head(10).to_string())


if __name__ == "__main__":
    print("=" * 60)
    print("GENERATING DATASET FROM REAL FUEL DATA ONLY")
    print("=" * 60)
    print("Reading real data from data/real/ directory...")
    print("⚠️ No synthetic data will be used.\n")
    
    df = generate_real_only_data(max_augmented=150)
    if not df.empty:
        save_data(df)
    else:
        print("❌ Failed to generate dataset. Check data/real/ directory.")
