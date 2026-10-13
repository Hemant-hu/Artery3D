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
    Calculates cardiovascular risk ratios, atherogenic indices, and ischemia vectors.
    """
    X = X.copy()
    
    # 1. Lipid ratios & Atherogenic Index of Plasma (AIP)
    if 'LDL' in X.columns and 'HDL' in X.columns:
        X['LDL_HDL_Ratio'] = X['LDL'] / (X['HDL'] + 1e-9)
        
    if 'TG' in X.columns and 'HDL' in X.columns:
        tg_hdl_ratio = X['TG'] / (X['HDL'] + 1e-9)
        X['AIP'] = np.log10(np.clip(tg_hdl_ratio, 1e-3, 1000.0))
        
    if 'TG' in X.columns and 'LDL' in X.columns and 'HDL' in X.columns:
        X['TotalChol_HDL_Ratio'] = (X['LDL'] + X['HDL'] + X['TG']/5.0) / (X['HDL'] + 1e-9)
        X['Castelli_Risk_Index'] = (X['LDL'] + X['HDL'] + X['TG']/5.0) / (X['HDL'] + 1e-9)
        
    # 2. Systemic Immune-Inflammation Index (SII) and NLR
    if 'PLT' in X.columns and 'Neut' in X.columns and 'Lymph' in X.columns:
        X['SII'] = (X['PLT'] * X['Neut']) / (X['Lymph'] + 1e-9)
        X['NLR'] = X['Neut'] / (X['Lymph'] + 1e-9)
        
    # 3. Mean Arterial Pressure (MAP) and Pulse Pressure
    if 'BP' in X.columns and 'Diastolic_BP' in X.columns:
        X['Pulse_Pressure'] = X['BP'] - X['Diastolic_BP']
        X['MAP'] = X['Diastolic_BP'] + (1/3) * X['Pulse_Pressure']
    elif 'BP' in X.columns:
        X['MAP_Approx'] = X['BP'] * 0.85
    
    # Map binary Yes/No to 1/0
    cat_cols = X.select_dtypes(include=['object', 'category']).columns
    for col in cat_cols:
        X[col] = X[col].apply(
            lambda x: 1 if str(x).strip().upper() in ['Y', 'YES', 'CAD', 'STENOTIC'] else 
                     (0 if str(x).strip().upper() in ['N', 'NO', 'NORMAL'] else x)
        )
        
    # Ensure numeric types for ECG and echo parameters
    for col in ['St Elevation', 'St Depression', 'Tinversion', 'Q Wave', 'Region RWMA', 'Typical Chest Pain', 'Function Class', 'EF-TTE', 'Age', 'BMI']:
        if col in X.columns:
            X[col] = pd.to_numeric(X[col], errors='coerce').fillna(0)
            
    if 'TG' in X.columns and 'FBS' in X.columns:
        X['TyG_Index'] = np.log(np.clip(X['TG'] * X['FBS'] / 2.0, 1.0, 1e7))

    # 4. Anatomic Ischemia Vectors (Echo + ECG Fusion)
    if 'St Elevation' in X.columns and 'Region RWMA' in X.columns:
        X['Anterior_Ischemia_Vector'] = (X['St Elevation'] * 2.0 + X.get('St Depression', 0) + X.get('Tinversion', 0)) * (X['Region RWMA'] + 1.0)
    if 'Q Wave' in X.columns and 'BP' in X.columns:
        X['Inferior_Ischemia_Vector'] = (X['Q Wave'] * 2.0 + X.get('St Depression', 0)) * (X['BP'] / 100.0)
    if 'St Depression' in X.columns or 'Tinversion' in X.columns:
        st_dep = X['St Depression'] if 'St Depression' in X.columns else 0
        t_inv = X['Tinversion'] if 'Tinversion' in X.columns else 0
        X['Lateral_Ischemia_Vector'] = (st_dep * 1.5 + t_inv)
    if 'Typical Chest Pain' in X.columns and 'Function Class' in X.columns:
        X['Angina_Severity_Index'] = X['Typical Chest Pain'] * (X['Function Class'] + 1.0)
    if 'EF-TTE' in X.columns:
        X['Ventricular_Dysfunction'] = np.clip((55.0 - X['EF-TTE']) / 10.0, 0, 10)
        
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
