import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder, LabelEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib
import json

def main():
    # 1. Load Data
    df = pd.read_excel('data/extention of Z-Alizadeh sani dataset.xlsx')
    
    # 2. Define Targets and Features
    target_cols = ['LAD', 'LCX', 'RCA', 'Cath']
    
    # Check what unique values targets have
    print("Unique Cath values:", df['Cath'].unique())
    print("Unique LAD values:", df['LAD'].unique())
    
    X = df.drop(columns=target_cols)
    y_df = df[target_cols]

    # Convert targets to binary (e.g., 'Normal' -> 0, 'CAD'/'Stenotic' -> 1)
    # Depending on exact string values, usually it's Normal vs CAD for Cath, Normal vs Stenotic for vessels
    y = pd.DataFrame()
    y['Cath'] = (y_df['Cath'] == 'CAD').astype(int)
    y['LAD'] = (y_df['LAD'] == 'Stenotic').astype(int)
    y['LCX'] = (y_df['LCX'] == 'Stenotic').astype(int)
    y['RCA'] = (y_df['RCA'] == 'Stenotic').astype(int)

    # 3. Preprocessing
    categorical_cols = X.select_dtypes(include=['object', 'category']).columns.tolist()
    numerical_cols = X.select_dtypes(include=['int64', 'float64']).columns.tolist()
    
    # Some categorical might have been read as numbers if encoded as 0/1. That's fine for Random Forest.
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numerical_cols),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_cols)
        ])
    
    # We will fit the preprocessor to get the exact feature names later for SHAP
    X_processed = preprocessor.fit_transform(X)
    
    # Save the preprocessor
    joblib.dump(preprocessor, 'preprocessor.joblib')
    
    # 4. Train Models
    models = {}
    for col in target_cols:
        model = RandomForestClassifier(n_estimators=100, random_state=42)
        model.fit(X_processed, y[col])
        models[col] = model
        
        # Eval on train set just to check it works
        preds = model.predict(X_processed)
        acc = accuracy_score(y[col], preds)
        print(f"{col} Train Accuracy: {acc:.2f}")
        joblib.dump(model, f'model_{col}.joblib')

    # 5. Extract Feature Names for SHAP
    num_features = numerical_cols
    cat_features = preprocessor.named_transformers_['cat'].get_feature_names_out(categorical_cols)
    all_features = num_features + list(cat_features)
    with open('feature_names.json', 'w') as f:
        json.dump(all_features, f)

    # 6. Save a sample patient for testing the API
    sample_patient = X.iloc[0].to_dict()
    # convert any non-serializable types
    for k, v in sample_patient.items():
        if isinstance(v, (np.int64, np.int32)):
            sample_patient[k] = int(v)
        elif isinstance(v, (np.float64, np.float32)):
            sample_patient[k] = float(v)
            
    with open('sample_patient.json', 'w') as f:
        json.dump(sample_patient, f, indent=4)
        
    print("Training complete! Models and preprocessor saved.")

if __name__ == '__main__':
    main()
