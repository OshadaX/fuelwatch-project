# scripts/train_model.py
"""
Train Random Forest model for employee demand prediction.
"""

import pandas as pd
import numpy as np
import joblib
import json
import os
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import OneHotEncoder
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline


def train_model():
    """Train and save the employee demand prediction model."""
    
    # ============================================
    # 1. Load Data
    # ============================================
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.dirname(script_dir)
    data_path = os.path.join(base_dir, 'data', 'employee_demand_dataset.csv')
    
    if not os.path.exists(data_path):
        print(f"Error: Dataset not found at {data_path}")
        print("Please run 'python scripts/generate_dataset.py' first.")
        return
    
    df = pd.read_csv(data_path)
    
    # Drop tracking columns that aren't features
    if 'data_source' in df.columns:
        print(f"Data source breakdown:")
        print(f"  {df['data_source'].value_counts().to_dict()}")
        df = df.drop(columns=['data_source'])
    
    print(f"\n{'='*60}")
    print("TRAINING EMPLOYEE DEMAND MODEL")
    print(f"{'='*60}")
    print(f"Dataset: {data_path}")
    print(f"Shape: {df.shape}")
    
    # ============================================
    # 2. Define Features and Target
    # ============================================
    feature_cols = [
        'month', 'day_of_week', 'day_of_month', 'week_of_year',
        'is_weekend', 'is_month_end', 'is_holiday', 'is_vacation',
        'is_day_before_holiday', 'is_friday',
        'weather', 'temperature', 'predicted_fuel_demand'
    ]
    target_col = 'employee_count'
    
    X = df[feature_cols]
    y = df[target_col]
    
    print(f"\nFeatures ({len(feature_cols)}): {feature_cols}")
    print(f"Target: {target_col}")
    
    # ============================================
    # 3. Preprocessing Pipeline
    # ============================================
    categorical_features = ['weather']
    numeric_features = [col for col in feature_cols if col not in categorical_features]
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', 'passthrough', numeric_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ]
    )
    
    # Pipeline: Preprocessing + Random Forest
    model = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', RandomForestRegressor(
            n_estimators=150,
            max_depth=15,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        ))
    ])
    
    # ============================================
    # 4. Train/Test Split
    # ============================================
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    print(f"\nTraining samples: {len(X_train)}")
    print(f"Testing samples: {len(X_test)}")
    
    # ============================================
    # 5. Cross-Validation
    # ============================================
    print("\nPerforming 5-fold cross-validation...")
    cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='neg_mean_absolute_error')
    print(f"CV MAE scores: {[-s for s in cv_scores]}")
    print(f"CV MAE mean: {-cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
    
    # ============================================
    # 6. Train Final Model
    # ============================================
    print("\nTraining Random Forest Regressor...")
    model.fit(X_train, y_train)
    
    # ============================================
    # 7. Evaluate on Test Set
    # ============================================
    y_pred = model.predict(X_test)
    
    mae = mean_absolute_error(y_test, y_pred)
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test, y_pred)
    
    print(f"\n{'='*40}")
    print("MODEL PERFORMANCE (Test Set)")
    print(f"{'='*40}")
    print(f"MAE:  {mae:.4f} employees (average prediction error)")
    print(f"RMSE: {rmse:.4f} employees")
    print(f"MSE:  {mse:.4f}")
    print(f"R²:   {r2:.4f} (variance explained)")
    
    # ============================================
    # 8. Plot Performance Charts
    # ============================================
    print("\nGenerating performance charts...")
    models_dir = os.path.join(base_dir, 'models')
    if not os.path.exists(models_dir):
        os.makedirs(models_dir)
        
    plt.figure(figsize=(14, 6))
    
    # 1. Scatter Plot (Actual vs Predicted)
    plt.subplot(1, 2, 1)
    sns.scatterplot(x=y_test, y=y_pred, alpha=0.6, color='blue', edgecolor='w', s=80)
    
    # Perfect prediction line
    min_val = min(y_test.min(), y_pred.min())
    max_val = max(y_test.max(), y_pred.max())
    plt.plot([min_val, max_val], [min_val, max_val], 'r--', linewidth=2, label='Perfect Prediction')
    
    plt.xlabel('Actual Employee Demand', fontsize=12)
    plt.ylabel('Predicted Employee Demand', fontsize=12)
    plt.title(f'Actual vs Predicted Demand\n(R²={r2:.3f}, MAE={mae:.3f})', fontsize=14)
    plt.legend()
    plt.grid(True, linestyle='--', alpha=0.7)
    
    # 2. Residual Plot
    plt.subplot(1, 2, 2)
    residuals = y_test - y_pred
    sns.histplot(residuals, kde=True, color='purple', bins=20)
    plt.xlabel('Residuals (Actual - Predicted)', fontsize=12)
    plt.ylabel('Frequency', fontsize=12)
    plt.title('Distribution of Prediction Errors (Residuals)', fontsize=14)
    plt.grid(True, linestyle='--', alpha=0.7)
    
    # Add zero error line
    plt.axvline(x=0, color='r', linestyle='--', linewidth=2)
    
    plt.tight_layout()
    chart_path = os.path.join(models_dir, 'performance_chart.png')
    plt.savefig(chart_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Performance chart saved: {chart_path}")
    
    # ============================================
    # 9. Feature Importance
    # ============================================
    regressor = model.named_steps['regressor']
    
    # Get feature names after preprocessing
    ohe = model.named_steps['preprocessor'].named_transformers_['cat']
    categorical_feature_names = list(ohe.get_feature_names_out(categorical_features))
    all_feature_names = numeric_features + categorical_feature_names
    
    importance_df = pd.DataFrame({
        'feature': all_feature_names,
        'importance': regressor.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print(f"\n{'='*40}")
    print("FEATURE IMPORTANCE (Top 10)")
    print(f"{'='*40}")
    print(importance_df.head(10).to_string(index=False))
    
    # ============================================
    # 9. Save Model and Metadata
    # ============================================
    models_dir = os.path.join(base_dir, 'models')
    if not os.path.exists(models_dir):
        os.makedirs(models_dir)
    
    # Save model
    model_path = os.path.join(models_dir, 'employee_model.joblib')
    joblib.dump(model, model_path)
    print(f"\nModel saved: {model_path}")
    
    # Save metadata
    meta = {
        'feature_columns': feature_cols,
        'target_column': target_col,
        'categorical_features': categorical_features,
        'numeric_features': numeric_features,
        'metrics': {
            'mae': mae,
            'rmse': rmse,
            'mse': mse,
            'r2': r2,
            'cv_mae_mean': -cv_scores.mean(),
            'cv_mae_std': cv_scores.std()
        },
        'model_params': {
            'n_estimators': 150,
            'max_depth': 15,
            'min_samples_split': 5,
            'min_samples_leaf': 2
        },
        'training_info': {
            'train_samples': len(X_train),
            'test_samples': len(X_test),
            'total_samples': len(df)
        },
        'feature_importance': importance_df.to_dict(orient='records')
    }
    
    meta_path = os.path.join(models_dir, 'model_meta.json')
    with open(meta_path, 'w') as f:
        json.dump(meta, f, indent=2)
    print(f"Metadata saved: {meta_path}")
    
    # Also save feature columns for API reference
    columns_path = os.path.join(models_dir, 'model_columns.joblib')
    joblib.dump(feature_cols, columns_path)
    print(f"Columns saved: {columns_path}")
    
    print(f"\n{'='*60}")
    print("TRAINING COMPLETE")
    print(f"{'='*60}")


if __name__ == "__main__":
    train_model()
