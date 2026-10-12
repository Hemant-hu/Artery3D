import os
import joblib
import warnings
import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_predict
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import (
    RandomForestClassifier,
    ExtraTreesClassifier,
    VotingClassifier,
    StackingClassifier,
    HistGradientBoostingClassifier
)
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix
)
from imblearn.over_sampling import SMOTE, BorderlineSMOTE
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from catboost import CatBoostClassifier

warnings.filterwarnings("ignore")

def clean_and_impute_dataset(df):
    """Replaces placeholders and imputes with median/mode."""
    df = df.replace('?', np.nan)
    num_cols = df.select_dtypes(include=['int64', 'float64']).columns
    cat_cols = df.select_dtypes(include=['object', 'category']).columns

    for col in num_cols:
        df[col] = df[col].fillna(df[col].median())
    for col in cat_cols:
        if not df[col].mode().empty:
            df[col] = df[col].fillna(df[col].mode()[0])
    return df

def engineer_comprehensive_cardiovascular_features(X):
    """
    State-of-the-Art Cardiovascular Domain Feature Engineering.
    Includes Atherogenic index, TyG index, inflammatory ratios,
    ischemic burden composite scores, and hemodynamics.
    """
    X = X.copy()

    # 1. Standardize binary Yes/No / Gender strings to 1/0
    cat_cols = X.select_dtypes(include=['object', 'category']).columns
    for col in cat_cols:
        X[col] = X[col].apply(
            lambda x: 1 if str(x).strip().upper() in ['Y', 'YES', 'MALE', 'M']
            else (0 if str(x).strip().upper() in ['N', 'NO', 'FEMALE', 'F'] else x)
        )
    
    # Ensure numerics
    for col in X.columns:
        X[col] = pd.to_numeric(X[col], errors='coerce').fillna(0.0)

    # 2. Atherogenic Index of Plasma (AIP) & Lipid Fractions
    if 'TG' in X.columns and 'HDL' in X.columns:
        tg_hdl_ratio = (X['TG'] / (X['HDL'] + 1e-6)).clip(lower=1e-3)
        X['AIP'] = np.log10(tg_hdl_ratio)
    
    if 'LDL' in X.columns and 'HDL' in X.columns:
        X['LDL_HDL_Ratio'] = X['LDL'] / (X['HDL'] + 1e-6)
    
    if 'TG' in X.columns and 'LDL' in X.columns and 'HDL' in X.columns:
        X['Non_HDL'] = X['LDL'] + (X['TG'] / 5.0)
        X['Castelli_I'] = (X['LDL'] + X['HDL'] + (X['TG'] / 5.0)) / (X['HDL'] + 1e-6)
        X['Castelli_II'] = X['LDL'] / (X['HDL'] + 1e-6)
        X['Atherogenic_Ratio'] = X['Non_HDL'] / (X['HDL'] + 1e-6)

    # 3. Triglyceride-Glucose (TyG) Index (Insulin resistance & vascular calcification marker)
    if 'TG' in X.columns and 'FBS' in X.columns:
        product = (X['TG'] * X['FBS'] / 2.0).clip(lower=1e-3)
        X['TyG_Index'] = np.log(product)

    # 4. Inflammatory & Hematological Markers (NLR, PLR)
    if 'Neut' in X.columns and 'Lymph' in X.columns:
        X['NLR'] = X['Neut'] / (X['Lymph'] + 1e-6)
    if 'PLT' in X.columns and 'Lymph' in X.columns:
        X['PLR'] = X['PLT'] / (X['Lymph'] + 1e-6)
    if 'BUN' in X.columns and 'CR' in X.columns:
        X['BUN_CR_Ratio'] = X['BUN'] / (X['CR'] + 1e-6)

    # 5. Hemodynamic & Vitals Ratios
    if 'PR' in X.columns and 'BP' in X.columns:
        X['HR_BP_Ratio'] = X['PR'] / (X['BP'] + 1e-6)

    # 6. Ischemic ECG Composite Burden Score
    ecg_markers = ['St Elevation', 'St Depression', 'Tinversion', 'Q Wave', 'Poor R Progression']
    present_ecg = [c for c in ecg_markers if c in X.columns]
    if present_ecg:
        X['ECG_Ischemia_Score'] = X[present_ecg].sum(axis=1)

    # 7. Cardiovascular Metabolic Risk Factor Burden
    metabolic_factors = ['DM', 'HTN', 'Current Smoker', 'DLP', 'FH', 'Obesity']
    present_met = [c for c in metabolic_factors if c in X.columns]
    if present_met:
        X['Metabolic_Risk_Score'] = X[present_met].sum(axis=1)

    # 8. Myocardial Wall Motion & Ejection Fraction Strain Index
    if 'Region RWMA' in X.columns and 'EF-TTE' in X.columns:
        X['Wall_Motion_Strain'] = X['Region RWMA'] * ((100.0 - X['EF-TTE']) / 100.0)

    # 9. Age-Risk Interactions
    if 'Age' in X.columns:
        if 'Typical Chest Pain' in X.columns:
            X['Age_ChestPain'] = X['Age'] * X['Typical Chest Pain']
        if 'Current Smoker' in X.columns:
            X['Age_Smoker'] = X['Age'] * X['Current Smoker']
        if 'DM' in X.columns:
            X['Age_DM'] = X['Age'] * X['DM']

    return X.astype(float)

def prepare_data(file_path):
    df = pd.read_excel(file_path)
    df = clean_and_impute_dataset(df)
    
    target_columns = ['Cath', 'LAD', 'LCX', 'RCA', 'VHD', 'Overall CAD']
    
    y = pd.DataFrame()
    y['Overall_CAD'] = (df['Cath'].astype(str).str.upper() == 'CAD').astype(int)
    y['LAD'] = (df['LAD'].astype(str).str.upper() == 'STENOTIC').astype(int)
    y['LCX'] = (df['LCX'].astype(str).str.upper() == 'STENOTIC').astype(int)
    y['RCA'] = (df['RCA'].astype(str).str.upper() == 'STENOTIC').astype(int)
    
    X = df.drop(columns=[c for c in target_columns if c in df.columns], errors='ignore')
    X_engineered = engineer_comprehensive_cardiovascular_features(X)
    
    scaler = StandardScaler()
    X_scaled = pd.DataFrame(scaler.fit_transform(X_engineered), columns=X_engineered.columns)
    
    return X_scaled, y, scaler, list(X_engineered.columns)

def evaluate_metrics(model, X_test, y_test, name=""):
    preds = model.predict(X_test)
    probs = model.predict_proba(X_test)[:, 1] if hasattr(model, 'predict_proba') else preds
    
    tn, fp, fn, tp = confusion_matrix(y_test, preds).ravel()
    specificity = tn / (tn + fp + 1e-9)
    
    return {
        "Model": name,
        "Accuracy": accuracy_score(y_test, preds),
        "Recall (Sensitivity)": recall_score(y_test, preds, zero_division=0),
        "Specificity": specificity,
        "Precision": precision_score(y_test, preds, zero_division=0),
        "F1-Score": f1_score(y_test, preds, zero_division=0),
        "ROC-AUC": roc_auc_score(y_test, probs)
    }

def train_and_evaluate_all():
    file_path = '../data/extention of Z-Alizadeh sani dataset.xlsx'
    candidate_dir = 'models_candidate_upgrade'
    os.makedirs(candidate_dir, exist_ok=True)
    
    print("=" * 80)
    print("CARDIOVASCULAR ML MODEL COMPREHENSIVE UPGRADE BENCHMARK")
    print("=" * 80)
    
    X, y, scaler, feature_cols = prepare_data(file_path)
    print(f"Dataset: {X.shape[0]} patients | Engineered Features: {X.shape[1]}")
    
    # Save candidate scaler and feature columns
    joblib.dump(scaler, os.path.join(candidate_dir, 'scaler.joblib'))
    joblib.dump(feature_cols, os.path.join(candidate_dir, 'feature_columns.joblib'))
    
    results = {}
    
    # =========================================================================
    # TARGET 1: Overall_CAD
    # =========================================================================
    print("\n" + "-" * 70)
    print("1. Benchmarking Upgraded Models for Target: Overall_CAD")
    print("-" * 70)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y['Overall_CAD'], test_size=0.20, stratify=y['Overall_CAD'], random_state=42
    )
    smote = BorderlineSMOTE(random_state=42)
    X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
    
    # Upgraded base estimators
    cat_cad = CatBoostClassifier(iterations=250, learning_rate=0.05, depth=6, l2_leaf_reg=4, random_state=42, verbose=0)
    lgb_cad = LGBMClassifier(n_estimators=200, learning_rate=0.04, num_leaves=31, subsample=0.85, random_state=42, verbose=-1, n_jobs=1)
    xgb_cad = XGBClassifier(n_estimators=200, learning_rate=0.04, max_depth=4, subsample=0.85, colsample_bytree=0.85, eval_metric='logloss', random_state=42, n_jobs=1)
    et_cad = ExtraTreesClassifier(n_estimators=250, max_depth=15, min_samples_split=2, random_state=42, n_jobs=1)
    rf_cad = RandomForestClassifier(n_estimators=250, max_depth=12, random_state=42, n_jobs=1)
    lr_cad = LogisticRegression(C=0.5, max_iter=2500, random_state=42)
    
    # Weighted Soft Voting Ensemble
    voting_cad = VotingClassifier(
        estimators=[
            ('cat', cat_cad),
            ('lgb', lgb_cad),
            ('xgb', xgb_cad),
            ('et', et_cad),
            ('rf', rf_cad),
            ('lr', lr_cad)
        ],
        voting='soft',
        weights=[2.0, 1.8, 1.8, 1.5, 1.2, 1.0]
    )
    
    # Probability Calibration
    calibrated_cad = CalibratedClassifierCV(estimator=voting_cad, method='sigmoid', cv=5)
    calibrated_cad.fit(X_train_res, y_train_res)
    
    res_cad = evaluate_metrics(calibrated_cad, X_test, y_test, "Overall_CAD Calibrated Ensemble")
    results['Overall_CAD'] = res_cad
    joblib.dump(calibrated_cad, os.path.join(candidate_dir, 'best_model_Overall_CAD.joblib'))
    print(f"Overall_CAD -> Acc: {res_cad['Accuracy']:.4f} | Recall: {res_cad['Recall (Sensitivity)']:.4f} | AUC: {res_cad['ROC-AUC']:.4f} | F1: {res_cad['F1-Score']:.4f}")

    # =========================================================================
    # TARGET 2: LAD (Left Anterior Descending Artery)
    # =========================================================================
    print("\n" + "-" * 70)
    print("2. Benchmarking Upgraded Models for Target: LAD")
    print("-" * 70)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y['LAD'], test_size=0.20, stratify=y['LAD'], random_state=42
    )
    X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
    
    lad_cat = CatBoostClassifier(iterations=250, learning_rate=0.05, depth=6, random_state=42, verbose=0)
    lad_et = ExtraTreesClassifier(n_estimators=250, max_depth=15, min_samples_split=2, random_state=42, n_jobs=1)
    lad_lgb = LGBMClassifier(n_estimators=200, learning_rate=0.04, num_leaves=31, random_state=42, verbose=-1, n_jobs=1)
    lad_xgb = XGBClassifier(n_estimators=180, learning_rate=0.04, max_depth=4, eval_metric='logloss', random_state=42, n_jobs=1)
    lad_lr = LogisticRegression(C=0.2, max_iter=2500, random_state=42)
    
    lad_ensemble = VotingClassifier(
        estimators=[
            ('et', lad_et),
            ('cat', lad_cat),
            ('lgb', lad_lgb),
            ('xgb', lad_xgb),
            ('lr', lad_lr)
        ],
        voting='soft',
        weights=[2.0, 1.8, 1.5, 1.5, 1.0]
    )
    calibrated_lad = CalibratedClassifierCV(estimator=lad_ensemble, method='sigmoid', cv=5)
    calibrated_lad.fit(X_train_res, y_train_res)
    
    res_lad = evaluate_metrics(calibrated_lad, X_test, y_test, "LAD Calibrated Ensemble")
    results['LAD'] = res_lad
    joblib.dump(calibrated_lad, os.path.join(candidate_dir, 'best_model_LAD.joblib'))
    print(f"LAD -> Acc: {res_lad['Accuracy']:.4f} | Recall: {res_lad['Recall (Sensitivity)']:.4f} | AUC: {res_lad['ROC-AUC']:.4f} | F1: {res_lad['F1-Score']:.4f}")

    # =========================================================================
    # TARGET 3: LCX (Left Circumflex Artery)
    # =========================================================================
    print("\n" + "-" * 70)
    print("3. Benchmarking Upgraded Models for Target: LCX")
    print("-" * 70)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y['LCX'], test_size=0.20, stratify=y['LCX'], random_state=42
    )
    # Use Borderline SMOTE with scale_pos_weight tuning for LCX class imbalance
    lcx_smote = BorderlineSMOTE(random_state=42)
    X_train_res, y_train_res = lcx_smote.fit_resample(X_train, y_train)
    
    lcx_et = ExtraTreesClassifier(n_estimators=300, max_depth=12, min_samples_split=2, min_samples_leaf=1, random_state=42, n_jobs=1)
    lcx_cat = CatBoostClassifier(iterations=250, learning_rate=0.04, depth=5, l2_leaf_reg=5, random_state=42, verbose=0)
    lcx_lgb = LGBMClassifier(n_estimators=180, learning_rate=0.03, num_leaves=25, subsample=0.85, random_state=42, verbose=-1, n_jobs=1)
    lcx_xgb = XGBClassifier(n_estimators=180, learning_rate=0.03, max_depth=3, subsample=0.85, eval_metric='logloss', random_state=42, n_jobs=1)
    lcx_hgb = HistGradientBoostingClassifier(max_iter=150, learning_rate=0.04, max_leaf_nodes=25, random_state=42)
    
    lcx_ensemble = VotingClassifier(
        estimators=[
            ('et', lcx_et),
            ('cat', lcx_cat),
            ('lgb', lcx_lgb),
            ('xgb', lcx_xgb),
            ('hgb', lcx_hgb)
        ],
        voting='soft',
        weights=[2.2, 2.0, 1.5, 1.5, 1.2]
    )
    calibrated_lcx = CalibratedClassifierCV(estimator=lcx_ensemble, method='sigmoid', cv=5)
    calibrated_lcx.fit(X_train_res, y_train_res)
    
    res_lcx = evaluate_metrics(calibrated_lcx, X_test, y_test, "LCX Upgraded Ensemble")
    results['LCX'] = res_lcx
    joblib.dump(calibrated_lcx, os.path.join(candidate_dir, 'best_model_LCX.joblib'))
    print(f"LCX -> Acc: {res_lcx['Accuracy']:.4f} | Recall: {res_lcx['Recall (Sensitivity)']:.4f} | AUC: {res_lcx['ROC-AUC']:.4f} | F1: {res_lcx['F1-Score']:.4f}")

    # =========================================================================
    # TARGET 4: RCA (Right Coronary Artery)
    # =========================================================================
    print("\n" + "-" * 70)
    print("4. Benchmarking Upgraded Models for Target: RCA")
    print("-" * 70)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y['RCA'], test_size=0.20, stratify=y['RCA'], random_state=42
    )
    rca_smote = BorderlineSMOTE(random_state=42)
    X_train_res, y_train_res = rca_smote.fit_resample(X_train, y_train)
    
    rca_cat = CatBoostClassifier(iterations=250, learning_rate=0.05, depth=6, l2_leaf_reg=4, random_state=42, verbose=0)
    rca_lgb = LGBMClassifier(n_estimators=180, learning_rate=0.04, num_leaves=31, random_state=42, verbose=-1, n_jobs=1)
    rca_et = ExtraTreesClassifier(n_estimators=250, max_depth=12, random_state=42, n_jobs=1)
    rca_xgb = XGBClassifier(n_estimators=180, learning_rate=0.04, max_depth=4, eval_metric='logloss', random_state=42, n_jobs=1)
    
    # 2-Layer Stacking Classifier with Logistic Regression Meta-Learner
    rca_stack = StackingClassifier(
        estimators=[
            ('cat', rca_cat),
            ('lgb', rca_lgb),
            ('et', rca_et),
            ('xgb', rca_xgb)
        ],
        final_estimator=LogisticRegression(C=0.5, random_state=42),
        cv=5,
        n_jobs=1
    )
    rca_stack.fit(X_train_res, y_train_res)
    
    res_rca = evaluate_metrics(rca_stack, X_test, y_test, "RCA Upgraded Stacking")
    results['RCA'] = res_rca
    joblib.dump(rca_stack, os.path.join(candidate_dir, 'best_model_RCA.joblib'))
    print(f"RCA -> Acc: {res_rca['Accuracy']:.4f} | Recall: {res_rca['Recall (Sensitivity)']:.4f} | AUC: {res_rca['ROC-AUC']:.4f} | F1: {res_rca['F1-Score']:.4f}")

    # =========================================================================
    # SUMMARY COMPARISON TABLE
    # =========================================================================
    print("\n" + "=" * 80)
    print("UPGRADED CANDIDATE PERFORMANCE SUMMARY (Test Set)")
    print("=" * 80)
    summary_df = pd.DataFrame(results).T[['Accuracy', 'Recall (Sensitivity)', 'Specificity', 'Precision', 'F1-Score', 'ROC-AUC']]
    print(summary_df.round(4).to_string())

if __name__ == "__main__":
    train_and_evaluate_all()
