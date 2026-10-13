import os
import joblib
import pandas as pd
import numpy as np
import warnings

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_predict
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier, VotingClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_selection import mutual_info_classif
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, brier_score_loss, confusion_matrix
)
from imblearn.over_sampling import BorderlineSMOTE, SMOTE
from catboost import CatBoostClassifier
from lightgbm import LGBMClassifier
from xgboost import XGBClassifier

warnings.filterwarnings("ignore")

def clean_and_impute_dataset(df):
    """Replaces missing placeholders '?' and imputes with robust median/mode."""
    df = df.replace('?', np.nan)
    num_cols = df.select_dtypes(include=['int64', 'float64']).columns
    cat_cols = df.select_dtypes(include=['object', 'category']).columns

    for col in num_cols:
        df[col] = df[col].fillna(df[col].median())
    for col in cat_cols:
        if not df[col].mode().empty:
            df[col] = df[col].fillna(df[col].mode()[0])
    return df

def engineer_cardiovascular_biomarkers(df):
    """
    State-of-the-art cardiovascular domain feature engineering.
    Synthesizes atherogenic indices, metabolic ratios, inflammatory markers,
    and coronary territorial ischemia vectors.
    """
    X = df.copy()

    # 1. Standardize binary and text variables
    cat_cols = X.select_dtypes(include=['object', 'category']).columns
    for col in cat_cols:
        X[col] = X[col].apply(
            lambda x: 1 if str(x).strip().upper() in ['Y', 'YES', 'CAD', 'STENOTIC', 'MALE', 'M']
            else (0 if str(x).strip().upper() in ['N', 'NO', 'NORMAL', 'FEMALE', 'F'] else x)
        )

    # Convert numeric fields
    for col in ['St Elevation', 'St Depression', 'Tinversion', 'Q Wave', 'Region RWMA',
                'Typical Chest Pain', 'Function Class', 'EF-TTE', 'Age', 'BMI', 'BP', 'PR',
                'FBS', 'TG', 'LDL', 'HDL', 'PLT', 'Neut', 'Lymph']:
        if col in X.columns:
            X[col] = pd.to_numeric(X[col], errors='coerce').fillna(0)

    # 2. Metabolic & Atherogenic Ratios
    if 'TG' in X.columns and 'FBS' in X.columns:
        # Triglyceride-Glucose (TyG) Index - golden marker for metabolic vascular stiffness
        X['TyG_Index'] = np.log(np.clip(X['TG'] * X['FBS'] / 2.0, 1.0, 1e7))

    if 'TG' in X.columns and 'HDL' in X.columns:
        # Atherogenic Index of Plasma (AIP)
        tg_hdl_ratio = X['TG'] / (X['HDL'] + 1e-9)
        X['AIP'] = np.log10(np.clip(tg_hdl_ratio, 1e-3, 1000.0))

    if 'LDL' in X.columns and 'HDL' in X.columns:
        X['LDL_HDL_Ratio'] = X['LDL'] / (X['HDL'] + 1e-9)
        if 'TG' in X.columns:
            X['Castelli_Risk_Index'] = (X['LDL'] + X['HDL'] + X['TG'] / 5.0) / (X['HDL'] + 1e-9)

    # 3. Systemic Immune-Inflammation Index (SII) and NLR
    if 'PLT' in X.columns and 'Neut' in X.columns and 'Lymph' in X.columns:
        X['SII'] = (X['PLT'] * X['Neut']) / (X['Lymph'] + 1e-9)
        X['NLR'] = X['Neut'] / (X['Lymph'] + 1e-9)

    # 4. Hemodynamics & Arterial Load
    if 'BP' in X.columns:
        X['MAP_Approx'] = X['BP'] * 0.85

    # 5. Territorial ECG-Echo Interaction Vectors
    if 'St Elevation' in X.columns and 'Region RWMA' in X.columns:
        # Anterior territory (LAD)
        X['Anterior_Ischemia_Vector'] = (X['St Elevation'] * 2.0 + X.get('St Depression', 0) + X.get('Tinversion', 0)) * (X['Region RWMA'] + 1.0)

    if 'Q Wave' in X.columns and 'BP' in X.columns:
        # Inferior territory (RCA)
        X['Inferior_Ischemia_Vector'] = (X['Q Wave'] * 2.0 + X.get('St Depression', 0)) * (X['BP'] / 100.0)

    if 'St Depression' in X.columns or 'Tinversion' in X.columns:
        # Lateral territory (LCX)
        st_dep = X['St Depression'] if 'St Depression' in X.columns else 0
        t_inv = X['Tinversion'] if 'Tinversion' in X.columns else 0
        X['Lateral_Ischemia_Vector'] = (st_dep * 1.5 + t_inv)

    if 'Typical Chest Pain' in X.columns and 'Function Class' in X.columns:
        X['Angina_Severity_Index'] = X['Typical Chest Pain'] * (X['Function Class'] + 1.0)

    if 'EF-TTE' in X.columns:
        X['Ventricular_Dysfunction'] = np.clip((55.0 - X['EF-TTE']) / 10.0, 0, 10)

    # One-hot encode remaining categoricals
    cat_cols = X.select_dtypes(include=['object', 'category']).columns
    if len(cat_cols) > 0:
        X = pd.get_dummies(X, columns=cat_cols, drop_first=True)

    return X.astype(float)

def select_target_features(X_train, y_train, k=24, mandatory_cols=[]):
    """Selects top K features using mutual info and random forest, preserving conditioning context."""
    eligible = [c for c in X_train.columns if c not in mandatory_cols]
    
    mi = mutual_info_classif(X_train[eligible], y_train, random_state=42)
    rf = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42, n_jobs=1)
    rf.fit(X_train[eligible], y_train)

    mi_norm = (mi - mi.min()) / (mi.max() - mi.min() + 1e-9)
    rf_norm = (rf.feature_importances_ - rf.feature_importances_.min()) / (rf.feature_importances_.max() - rf.feature_importances_.min() + 1e-9)
    scores = pd.Series(0.5 * mi_norm + 0.5 * rf_norm, index=eligible)
    
    selected = scores.nlargest(k).index.tolist()
    return mandatory_cols + selected

def evaluate_classifier(model, X_test, y_test, name=""):
    probs = model.predict_proba(X_test)[:, 1] if hasattr(model, 'predict_proba') else model.predict(X_test)
    preds = (probs >= 0.5).astype(int)
    
    tn, fp, fn, tp = confusion_matrix(y_test, preds).ravel()
    spec = tn / (tn + fp + 1e-9)
    
    return {
        "Target": name,
        "Accuracy": accuracy_score(y_test, preds),
        "Sensitivity (Recall)": recall_score(y_test, preds, zero_division=0),
        "Specificity": spec,
        "Precision": precision_score(y_test, preds, zero_division=0),
        "F1-Score": f1_score(y_test, preds, zero_division=0),
        "ROC-AUC": roc_auc_score(y_test, probs),
        "Brier Score": brier_score_loss(y_test, probs)
    }

def main():
    print("=" * 80)
    print("TRAINING SOTA CARDIOVASCULAR ENSEMBLE SUITE")
    print("=" * 80)

    data_path = '../data/extention of Z-Alizadeh sani dataset.xlsx'
    df_raw = pd.read_excel(data_path)
    df_clean = clean_and_impute_dataset(df_raw)

    target_cols = ['Cath', 'LAD', 'LCX', 'RCA', 'VHD', 'Overall CAD']
    y = pd.DataFrame()
    y['Overall_CAD'] = (df_clean['Cath'].astype(str).str.upper() == 'CAD').astype(int)
    y['LAD'] = (df_clean['LAD'].astype(str).str.upper() == 'STENOTIC').astype(int)
    y['LCX'] = (df_clean['LCX'].astype(str).str.upper() == 'STENOTIC').astype(int)
    y['RCA'] = (df_clean['RCA'].astype(str).str.upper() == 'STENOTIC').astype(int)

    X_raw = df_clean.drop(columns=[col for col in target_cols if col in df_clean.columns], errors='ignore')
    X_engineered = engineer_cardiovascular_biomarkers(X_raw)
    feature_columns = list(X_engineered.columns)

    print(f"Cohort: {X_engineered.shape[0]} patients | Total Synthesized Features: {len(feature_columns)}")

    # Standardize continuous variables
    scaler = StandardScaler()
    X_scaled = pd.DataFrame(scaler.fit_transform(X_engineered), columns=feature_columns)

    # 80/20 Stratified Split for strict holdout validation
    train_idx, test_idx = train_test_split(
        np.arange(len(X_scaled)), test_size=0.20, stratify=y['Overall_CAD'], random_state=42
    )

    X_train_base = X_scaled.iloc[train_idx].copy().reset_index(drop=True)
    X_test_base = X_scaled.iloc[test_idx].copy().reset_index(drop=True)
    y_train = y.iloc[train_idx].copy().reset_index(drop=True)
    y_test = y.iloc[test_idx].copy().reset_index(drop=True)

    print(f"Train Set: {len(X_train_base)} | Holdout Test Set: {len(X_test_base)}")

    trained_models = {}
    target_feature_map = {}
    evaluation_results = []
    output_dir = 'models_sota'
    os.makedirs(output_dir, exist_ok=True)

    # -------------------------------------------------------------------------
    # 1. TARGET: Overall CAD (Root Classifier)
    # -------------------------------------------------------------------------
    print("\n[1/4] Training Target: Overall_CAD (Root Multi-Model Soft Voting)...")
    feats_cad = select_target_features(X_train_base, y_train['Overall_CAD'], k=26)
    target_feature_map['Overall_CAD'] = feats_cad
    
    cat_cad = CatBoostClassifier(iterations=220, depth=5, learning_rate=0.04, l2_leaf_reg=4, random_seed=42, verbose=0, thread_count=1)
    lgb_cad = LGBMClassifier(n_estimators=160, max_depth=4, num_leaves=15, learning_rate=0.03, subsample=0.85, random_state=42, verbose=-1, n_jobs=1)
    xgb_cad = XGBClassifier(n_estimators=160, max_depth=3, learning_rate=0.03, subsample=0.85, colsample_bytree=0.85, eval_metric='logloss', random_state=42, n_jobs=1)
    et_cad = ExtraTreesClassifier(n_estimators=200, max_depth=8, min_samples_split=3, random_state=42, n_jobs=1)
    lr_cad = LogisticRegression(C=0.6, max_iter=2000, random_state=42)

    cad_ensemble = VotingClassifier(
        estimators=[('cat', cat_cad), ('lgb', lgb_cad), ('xgb', xgb_cad), ('et', et_cad), ('lr', lr_cad)],
        voting='soft',
        weights=[2.0, 1.8, 1.8, 1.4, 1.0]
    )
    
    # Resample training set with SMOTE
    sm = SMOTE(random_state=42)
    X_train_cad_res, y_train_cad_res = sm.fit_resample(X_train_base[feats_cad], y_train['Overall_CAD'])
    cad_ensemble.fit(X_train_cad_res, y_train_cad_res)

    res_cad = evaluate_classifier(cad_ensemble, X_test_base[feats_cad], y_test['Overall_CAD'], "Overall_CAD")
    evaluation_results.append(res_cad)
    trained_models['Overall_CAD'] = cad_ensemble
    print(f"  -> Test Acc: {res_cad['Accuracy']*100:.2f}% | Recall: {res_cad['Sensitivity (Recall)']*100:.2f}% | AUC: {res_cad['ROC-AUC']:.4f}")

    # Out-of-fold CAD probabilities for chaining
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    oof_cad_prob = cross_val_predict(cad_ensemble, X_train_base[feats_cad], y_train['Overall_CAD'], cv=skf, method='predict_proba', n_jobs=1)[:, 1]
    test_cad_prob = cad_ensemble.predict_proba(X_test_base[feats_cad])[:, 1]

    # -------------------------------------------------------------------------
    # 2. TARGET: LAD (Left Anterior Descending - Conditioned on CAD)
    # -------------------------------------------------------------------------
    print("\n[2/4] Training Target: LAD (Conditioned on CAD Risk)...")
    X_train_lad_full = X_train_base.copy()
    X_train_lad_full['CAD_Risk_Prior'] = oof_cad_prob
    X_test_lad_full = X_test_base.copy()
    X_test_lad_full['CAD_Risk_Prior'] = test_cad_prob

    feats_lad = select_target_features(X_train_lad_full, y_train['LAD'], k=24, mandatory_cols=['CAD_Risk_Prior'])
    target_feature_map['LAD'] = feats_lad

    lad_cat = CatBoostClassifier(iterations=220, depth=5, learning_rate=0.04, l2_leaf_reg=3, random_seed=42, verbose=0, thread_count=1)
    lad_et = ExtraTreesClassifier(n_estimators=220, max_depth=9, min_samples_split=3, random_state=42, n_jobs=1)
    lad_lgb = LGBMClassifier(n_estimators=160, max_depth=4, num_leaves=15, learning_rate=0.03, random_state=42, verbose=-1, n_jobs=1)
    lad_lr = LogisticRegression(C=0.4, max_iter=2000, random_state=42)

    lad_ensemble = VotingClassifier(
        estimators=[('cat', lad_cat), ('et', lad_et), ('lgb', lad_lgb), ('lr', lad_lr)],
        voting='soft',
        weights=[2.0, 1.8, 1.5, 1.0]
    )

    X_train_lad_res, y_train_lad_res = sm.fit_resample(X_train_lad_full[feats_lad], y_train['LAD'])
    lad_ensemble.fit(X_train_lad_res, y_train_lad_res)

    res_lad = evaluate_classifier(lad_ensemble, X_test_lad_full[feats_lad], y_test['LAD'], "LAD")
    evaluation_results.append(res_lad)
    trained_models['LAD'] = lad_ensemble
    print(f"  -> Test Acc: {res_lad['Accuracy']*100:.2f}% | Recall: {res_lad['Sensitivity (Recall)']*100:.2f}% | AUC: {res_lad['ROC-AUC']:.4f}")

    oof_lad_prob = cross_val_predict(lad_ensemble, X_train_lad_full[feats_lad], y_train['LAD'], cv=skf, method='predict_proba', n_jobs=1)[:, 1]
    test_lad_prob = lad_ensemble.predict_proba(X_test_lad_full[feats_lad])[:, 1]

    # -------------------------------------------------------------------------
    # 3. TARGET: RCA (Right Coronary Artery - Conditioned on CAD + LAD)
    # -------------------------------------------------------------------------
    print("\n[3/4] Training Target: RCA (Conditioned on CAD + LAD Risk)...")
    X_train_rca_full = X_train_lad_full.copy()
    X_train_rca_full['LAD_Risk_Prior'] = oof_lad_prob
    X_test_rca_full = X_test_lad_full.copy()
    X_test_rca_full['LAD_Risk_Prior'] = test_lad_prob

    feats_rca = select_target_features(X_train_rca_full, y_train['RCA'], k=22, mandatory_cols=['CAD_Risk_Prior', 'LAD_Risk_Prior'])
    target_feature_map['RCA'] = feats_rca

    bsmote = BorderlineSMOTE(random_state=42)
    X_train_rca_res, y_train_rca_res = bsmote.fit_resample(X_train_rca_full[feats_rca], y_train['RCA'])

    rca_cat = CatBoostClassifier(iterations=200, depth=4, learning_rate=0.03, l2_leaf_reg=4, random_seed=42, verbose=0, thread_count=1)
    rca_et = ExtraTreesClassifier(n_estimators=200, max_depth=8, min_samples_split=3, random_state=42, n_jobs=1)
    rca_lgb = LGBMClassifier(n_estimators=140, max_depth=3, num_leaves=10, learning_rate=0.03, random_state=42, verbose=-1, n_jobs=1)
    rca_lr = LogisticRegression(C=0.5, max_iter=2000, random_state=42)

    rca_ensemble = VotingClassifier(
        estimators=[('cat', rca_cat), ('et', rca_et), ('lgb', rca_lgb), ('lr', rca_lr)],
        voting='soft',
        weights=[2.0, 1.8, 1.5, 1.0]
    )
    rca_ensemble.fit(X_train_rca_res, y_train_rca_res)

    res_rca = evaluate_classifier(rca_ensemble, X_test_rca_full[feats_rca], y_test['RCA'], "RCA")
    evaluation_results.append(res_rca)
    trained_models['RCA'] = rca_ensemble
    print(f"  -> Test Acc: {res_rca['Accuracy']*100:.2f}% | Recall: {res_rca['Sensitivity (Recall)']*100:.2f}% | AUC: {res_rca['ROC-AUC']:.4f}")

    oof_rca_prob = cross_val_predict(rca_ensemble, X_train_rca_full[feats_rca], y_train['RCA'], cv=skf, method='predict_proba', n_jobs=1)[:, 1]
    test_rca_prob = rca_ensemble.predict_proba(X_test_rca_full[feats_rca])[:, 1]

    # -------------------------------------------------------------------------
    # 4. TARGET: LCX (Left Circumflex - Conditioned on CAD + LAD + RCA)
    # -------------------------------------------------------------------------
    print("\n[4/4] Training Target: LCX (Conditioned on Multi-Vessel Prior)...")
    X_train_lcx_full = X_train_rca_full.copy()
    X_train_lcx_full['RCA_Risk_Prior'] = oof_rca_prob
    X_test_lcx_full = X_test_rca_full.copy()
    X_test_lcx_full['RCA_Risk_Prior'] = test_rca_prob

    feats_lcx = select_target_features(X_train_lcx_full, y_train['LCX'], k=20, mandatory_cols=['CAD_Risk_Prior', 'LAD_Risk_Prior', 'RCA_Risk_Prior'])
    target_feature_map['LCX'] = feats_lcx

    X_train_lcx_res, y_train_lcx_res = bsmote.fit_resample(X_train_lcx_full[feats_lcx], y_train['LCX'])

    lcx_cat = CatBoostClassifier(iterations=220, depth=4, learning_rate=0.03, l2_leaf_reg=5, random_seed=42, verbose=0, thread_count=1)
    lcx_et = ExtraTreesClassifier(n_estimators=220, max_depth=7, min_samples_split=3, random_state=42, n_jobs=1)
    lcx_lgb = LGBMClassifier(n_estimators=140, max_depth=3, num_leaves=8, learning_rate=0.03, random_state=42, verbose=-1, n_jobs=1)
    lcx_lr = LogisticRegression(C=0.4, max_iter=2000, random_state=42)

    lcx_ensemble = VotingClassifier(
        estimators=[('cat', lcx_cat), ('et', lcx_et), ('lgb', lcx_lgb), ('lr', lcx_lr)],
        voting='soft',
        weights=[2.2, 2.0, 1.5, 1.0]
    )
    lcx_ensemble.fit(X_train_lcx_res, y_train_lcx_res)

    res_lcx = evaluate_classifier(lcx_ensemble, X_test_lcx_full[feats_lcx], y_test['LCX'], "LCX")
    evaluation_results.append(res_lcx)
    trained_models['LCX'] = lcx_ensemble
    print(f"  -> Test Acc: {res_lcx['Accuracy']*100:.2f}% | Recall: {res_lcx['Sensitivity (Recall)']*100:.2f}% | AUC: {res_lcx['ROC-AUC']:.4f}")

    # -------------------------------------------------------------------------
    # BENCHMARK COMPARISON TABLE
    # -------------------------------------------------------------------------
    print("\n" + "=" * 90)
    print("SOTA CARDIOVASCULAR SUITE FINAL BENCHMARK (UNSEEN HOLDOUT N = 61)")
    print("=" * 90)
    res_df = pd.DataFrame(evaluation_results)
    print(res_df.to_string(index=False))

    # Save models and metadata
    for t_name, model in trained_models.items():
        joblib.dump(model, os.path.join(output_dir, f'best_model_{t_name}.joblib'))
    joblib.dump(scaler, os.path.join(output_dir, 'scaler.joblib'))
    joblib.dump(feature_columns, os.path.join(output_dir, 'feature_columns.joblib'))
    joblib.dump(target_feature_map, os.path.join(output_dir, 'target_feature_columns.joblib'))
    print(f"\n[OK] Successfully persisted all models, scaler, and target feature maps to '{output_dir}/'")

if __name__ == '__main__':
    main()
