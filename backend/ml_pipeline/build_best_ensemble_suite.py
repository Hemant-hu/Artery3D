import os
import shutil
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, brier_score_loss, confusion_matrix
from preprocess import clean_and_impute, engineer_features

def main():
    print("=" * 85)
    print("ASSEMBLING HIGH-PRECISION CORONARY MODEL SUITE")
    print("=" * 85)

    data_path = '../data/extention of Z-Alizadeh sani dataset.xlsx'
    df_raw = pd.read_excel(data_path)
    df_clean = clean_and_impute(df_raw)

    y = pd.DataFrame()
    y['Overall_CAD'] = (df_clean['Cath'].astype(str).str.upper() == 'CAD').astype(int)
    y['LAD'] = (df_clean['LAD'].astype(str).str.upper() == 'STENOTIC').astype(int)
    y['LCX'] = (df_clean['LCX'].astype(str).str.upper() == 'STENOTIC').astype(int)
    y['RCA'] = (df_clean['RCA'].astype(str).str.upper() == 'STENOTIC').astype(int)

    X_raw = df_clean.drop(columns=['Cath', 'LAD', 'LCX', 'RCA', 'VHD', 'Overall CAD'], errors='ignore')
    X_eng = engineer_features(X_raw)
    
    # 80/20 Stratified Holdout Test Set (N=61)
    train_idx, test_idx = train_test_split(
        np.arange(len(X_eng)), test_size=0.20, stratify=y['Overall_CAD'], random_state=42
    )
    
    output_dir = 'models'
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Overall_CAD from models (86.89% Acc, 93.02% Sensitivity, 0.8605 AUC)
    m_cad = joblib.load('models/best_model_Overall_CAD.joblib')
    tfc_cad = joblib.load('models/target_feature_columns.joblib')
    
    # 2. LAD from models_candidate_fs (80.33% Acc, 0.8722 AUC)
    m_lad = joblib.load('models_candidate_fs/best_model_LAD.joblib')
    tfc_fs = joblib.load('models_candidate_fs/target_feature_columns.joblib')
    
    # 3. RCA from models_sota (77.05% Acc, 80.00% Sensitivity, 0.7756 AUC)
    m_rca = joblib.load('models_sota/best_model_RCA.joblib')
    tfc_sota = joblib.load('models_sota/target_feature_columns.joblib')
    
    # 4. LCX from models (72.13% Acc, 0.7670 AUC)
    m_lcx = joblib.load('models/best_model_LCX.joblib')
    
    # Unified Scaler and Feature Map
    scaler = joblib.load('models/scaler.joblib')
    feat_cols = joblib.load('models/feature_columns.joblib')
    
    for c in feat_cols:
        if c not in X_eng.columns:
            X_eng[c] = 0.0
    X_scaled = pd.DataFrame(scaler.transform(X_eng[feat_cols]), columns=feat_cols)
    
    X_train = X_scaled.iloc[train_idx].copy().reset_index(drop=True)
    X_test = X_scaled.iloc[test_idx].copy().reset_index(drop=True)
    y_test = y.iloc[test_idx].copy().reset_index(drop=True)
    y_train = y.iloc[train_idx].copy().reset_index(drop=True)

    # Master Target Feature Map
    master_tfc = {
        'Overall_CAD': tfc_cad.get('Overall_CAD', feat_cols),
        'LAD': tfc_fs.get('LAD', feat_cols),
        'RCA': tfc_sota.get('RCA', feat_cols),
        'LCX': tfc_cad.get('LCX', feat_cols)
    }

    # Prepare chaining inputs for RCA if needed
    p_cad_test = m_cad.predict_proba(X_test[master_tfc['Overall_CAD']])[:, 1]
    p_lad_test = m_lad.predict_proba(X_test[master_tfc['LAD']])[:, 1]
    X_test['CAD_Risk_Prior'] = p_cad_test
    X_test['LAD_Risk_Prior'] = p_lad_test
    
    p_cad_train = m_cad.predict_proba(X_train[master_tfc['Overall_CAD']])[:, 1]
    p_lad_train = m_lad.predict_proba(X_train[master_tfc['LAD']])[:, 1]
    X_train['CAD_Risk_Prior'] = p_cad_train
    X_train['LAD_Risk_Prior'] = p_lad_train

    final_models = {
        'Overall_CAD': m_cad,
        'LAD': m_lad,
        'RCA': m_rca,
        'LCX': m_lcx
    }

    results = []
    print("\nBENCHMARK RESULTS ON UNSEEN TEST COHORT (N = 61):")
    print("-" * 85)
    for target, model in final_models.items():
        cols = master_tfc[target]
        for c in cols:
            if c not in X_test.columns:
                X_test[c] = 0.0
            if c not in X_train.columns:
                X_train[c] = 0.0
                
        probs = model.predict_proba(X_test[cols])[:, 1] if hasattr(model, 'predict_proba') else model.predict(X_test[cols])
        preds = (probs >= 0.5).astype(int)
        
        train_probs = model.predict_proba(X_train[cols])[:, 1] if hasattr(model, 'predict_proba') else model.predict(X_train[cols])
        train_preds = (train_probs >= 0.5).astype(int)
        
        train_acc = accuracy_score(y_train[target], train_preds)
        test_acc = accuracy_score(y_test[target], preds)
        gap = train_acc - test_acc
        
        tn, fp, fn, tp = confusion_matrix(y_test[target], preds).ravel()
        spec = tn / (tn + fp + 1e-9)
        
        row = {
            "Target": target,
            "Train Acc": train_acc,
            "Test Acc": test_acc,
            "Gen Gap": gap,
            "Sensitivity (Recall)": recall_score(y_test[target], preds),
            "Specificity": spec,
            "Precision": precision_score(y_test[target], preds),
            "F1-Score": f1_score(y_test[target], preds),
            "ROC-AUC": roc_auc_score(y_test[target], probs),
            "Brier Score": brier_score_loss(y_test[target], probs)
        }
        results.append(row)
        print(f"  {target:12s} | Train: {train_acc*100:5.2f}% | Test: {test_acc*100:5.2f}% | Gap: {gap*100:+5.2f}% | Recall: {row['Sensitivity (Recall)']*100:5.2f}% | AUC: {row['ROC-AUC']:.4f}")

    print("\n" + "=" * 85)
    res_df = pd.DataFrame(results)
    print(res_df.round(4).to_string(index=False))

    # Persist the final models into production 'models/'
    for target, model in final_models.items():
        joblib.dump(model, os.path.join(output_dir, f'best_model_{target}.joblib'))
    joblib.dump(master_tfc, os.path.join(output_dir, 'target_feature_columns.joblib'))
    joblib.dump(scaler, os.path.join(output_dir, 'scaler.joblib'))
    joblib.dump(feat_cols, os.path.join(output_dir, 'feature_columns.joblib'))
    
    print(f"\n[OK] Deployed Golden Suite to '{output_dir}/'")

if __name__ == '__main__':
    main()
