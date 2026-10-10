import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
import joblib
import os

def clean_and_impute(df):
    """
    Handles missing values and cleans strings for ML.
    Uses median for numeric, mode for categorical.
    """
    # Replace placeholder '?' with NaN
    df = df.replace('?', np.nan)
    
    # Separate numeric and categorical
    num_cols = df.select_dtypes(include=['int64', 'float64']).columns
    cat_cols = df.select_dtypes(include=['object', 'category']).columns

    # Median imputation for continuous
    for col in num_cols:
        df[col] = df[col].fillna(df[col].median())

    # Mode imputation for categorical
    for col in cat_cols:
        if not df[col].mode().empty:
            df[col] = df[col].fillna(df[col].mode()[0])
            
    return df

def engineer_features(X):
    """
    Domain-Specific Feature Engineering.
    Calculates cardiovascular risk ratios and mappings.
    """
    X = X.copy()
    
    # LDL-to-HDL Ratio
    if 'LDL' in X.columns and 'HDL' in X.columns:
        X['LDL_HDL_Ratio'] = X['LDL'] / (X['HDL'] + 1e-9)
        
    # Total Cholesterol (approximation using Friedewald equation if direct TC is absent)
    if 'TG' in X.columns and 'LDL' in X.columns and 'HDL' in X.columns:
        X['TotalChol_HDL_Ratio'] = (X['LDL'] + X['HDL'] + X['TG']/5.0) / (X['HDL'] + 1e-9)
        
    # Mean Arterial Pressure (MAP) and Pulse Pressure
    # Assuming BP is Systolic for this specific dataset structure
    if 'BP' in X.columns and 'Diastolic_BP' in X.columns:
        X['Pulse_Pressure'] = X['BP'] - X['Diastolic_BP']
        X['MAP'] = X['Diastolic_BP'] + (1/3) * X['Pulse_Pressure']
    
    # Map binary Yes/No to 1/0
    cat_cols = X.select_dtypes(include=['object', 'category']).columns
    for col in cat_cols:
        X[col] = X[col].apply(
            lambda x: 1 if str(x).strip().upper() in ['Y', 'YES'] else (0 if str(x).strip().upper() in ['N', 'NO'] else x)
        )
        
    # One-Hot Encoding for remaining multi-category features
    cat_cols = X.select_dtypes(include=['object', 'category']).columns
    if len(cat_cols) > 0:
        X = pd.get_dummies(X, columns=cat_cols, drop_first=True)
    
    return X.astype(float)

def prepare_pipeline_data(file_path, output_dir='models'):
    """
    End-to-end data preparation phase.
    """
    df = pd.read_excel(file_path)
    df = clean_and_impute(df)
    
    target_columns = ['Cath', 'LAD', 'LCX', 'RCA', 'VHD', 'Overall CAD']
    
    # Define multi-targets
    y = pd.DataFrame()
    y['Overall_CAD'] = (df['Cath'].astype(str).str.upper() == 'CAD').astype(int)
    y['LAD'] = (df['LAD'].astype(str).str.upper() == 'STENOTIC').astype(int)
    y['LCX'] = (df['LCX'].astype(str).str.upper() == 'STENOTIC').astype(int)
    y['RCA'] = (df['RCA'].astype(str).str.upper() == 'STENOTIC').astype(int)
    
    # Strict Target Leakage Prevention: drop leakages from X
    X = df.drop(columns=[col for col in target_columns if col in df.columns], errors='ignore')
    
    # Feature Engineering
    X_engineered = engineer_features(X)
    
    # Scaling
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_engineered)
    X_scaled = pd.DataFrame(X_scaled, columns=X_engineered.columns)
    
    # Save scaler and feature names
    os.makedirs(output_dir, exist_ok=True)
    joblib.dump(scaler, os.path.join(output_dir, 'scaler.joblib'))
    joblib.dump(list(X_engineered.columns), os.path.join(output_dir, 'feature_columns.joblib'))
    
    return X_scaled, y
