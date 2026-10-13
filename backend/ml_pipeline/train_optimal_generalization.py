import os
import joblib
import pandas as pd
import numpy as np
import warnings

from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier, VotingClassifier
from sklearn.feature_selection import mutual_info_classif
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, brier_score_loss, confusion_matrix
)
from imblearn.over_sampling import SMOTE, BorderlineSMOTE
from catboost import CatBoostClassifier
from lightgbm import LGBMClassifier
from xgboost import XGBClassifier

warnings.filterwarnings("ignore")

from preprocess import clean_and_impute, engineer_features

def select_top_target_features(X_train, y_train, k=22):
    """
    Computes rigorous mutual information and Random Forest Gini ranking
    strictly on the training split to avoid data leakage.
    """
    mi = mutual_info_classif(X_train, y_train, random_state=42)
    rf = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42, n_jobs=1)
    rf.fit(X_train, y_train)

    mi_norm = (mi - mi.min()) / (mi.max() - mi.min() + 1e-9)
    rf_norm = (rf.feature_importances_ - rf.feature_importances_.min()) / (rf.feature_importances_.max() - rf.feature_importances_.min() + 1e-9)
    combined = pd.Series(0.55 * mi_norm + 0.45 * rf_norm, index=X_train.columns)
    
    return combined.nlargest(k).index.tolist()

def evaluate_performance(model, X_train, y_train, X_test, y_test, name=""):
    """
    Evaluates both Train and Test metrics to explicitly verify that the model
    neither underfits (low train/test scores) nor overfits (large train-test gap).
    """
    train_preds = model.predict(X_train)
    train_acc = accuracy_score(y_train, train_preds)
    
    test_probs = model.predict_proba(X_test)[:, 1] if hasattr(model, 'predict_proba') else model.predict(X_test)
    test_preds = (test_probs >= 0.5).astype(int)
    test_acc = accuracy_score(y_test, test_preds)
    
    tn, fp, fn, tp = confusion_matrix(y_test, test_preds).ravel()
    spec = tn / (tn + fp + 1e-9)
    
    overfit_gap = train_acc - test_acc
    
    return {
        "Target": name,
        "Train Acc": train_acc,
        "Test Acc": test_acc,
        "Generalization Gap": overfit_gap,
        "Sensitivity (Recall)": recall_score(y_test, test_preds, zero_division=0),
        "Specificity": spec,
        "Precision": precision_score(y_test, test_preds, zero_division=0),
        "F1-Score": f1_score(y_test, test_preds, zero_division=0),
        "ROC-AUC": roc_auc_score(y_test, test_probs),
        "Brier Score": brier_score_loss(y_test, test_probs)
    }

def main():
    print("=" * 80)
    print("TRAINING REGULARIZED HIGH-GENERALIZATION CORONARY MODELS")
    print("=" * 80)

    data_path = '../data/extention of Z-Alizadeh sani dataset.xlsx'
    df_raw = pd.read_excel(data_path)
    df_clean = clean_and_impute(df_raw)

    target_cols = ['Cath', 'LAD', 'LCX', 'RCA', 'VHD', 'Overall CAD']
    y = pd.DataFrame()
    y['Overall_CAD'] = (df_clean['Cath'].astype(str).str.upper() == 'CAD').astype(int)
    y['LAD'] = (df_clean['LAD'].astype(str).str.upper() == 'STENOTIC').astype(int)
    y['LCX'] = (df_clean['LCX'].astype(str).str.upper() == 'STENOTIC').astype(int)
    y['RCA'] = (df_clean['RCA'].astype(str).str.upper() == 'STENOTIC').astype(int)

    X_raw = df_clean.drop(columns=[col for col in target_cols if col in df_clean.columns], errors='ignore')
    X_engineered = engineer_features(X_raw)
    feature_columns = list(X_engineered.columns)

    print(f"Total Cohort: {len(X_engineered)} patients | Total Synthesized Biomarkers: {len(feature_columns)}")

    scaler = StandardScaler()
    X_scaled = pd.DataFrame(scaler.fit_transform(X_engineered), columns=feature_columns)

    # 80/20 Stratified Split
    train_idx, test_idx = train_test_split(
        np.arange(len(X_scaled)), test_size=0.20, stratify=y['Overall_CAD'], random_state=42
    )

    X_train_full = X_scaled.iloc[train_idx].copy().reset_index(drop=True)
    X_test_full = X_scaled.iloc[test_idx].copy().reset_index(drop=True)
    y_train = y.iloc[train_idx].copy().reset_index(drop=True)
    y_test = y.iloc[test_idx].copy().reset_index(drop=True)

    print(f"Train Set: {len(X_train_full)} | Holdout Test Set: {len(X_test_full)}\n")

    trained_models = {}
    target_feature_map = {}
    benchmark_reports = []
    
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    # =========================================================================
    # 1. TARGET: Overall_CAD (Root Diagnostic Classifier)
    # =========================================================================
    print("-" * 70)
    print("1. Optimizing Target: Overall_CAD")
    print("-" * 70)
    feats_cad = select_top_target_features(X_train_full, y_train['Overall_CAD'], k=24)
    target_feature_map['Overall_CAD'] = feats_cad
    print(f"Selected Top {len(feats_cad)} Features: {', '.join(feats_cad[:8])}...")

    # Regularized estimators designed to prevent memorizing small N=303
    cat_cad = CatBoostClassifier(iterations=180, depth=4, learning_rate=0.04, l2_leaf_reg=5, random_seed=42, verbose=0, thread_count=1)
    et_cad = ExtraTreesClassifier(n_estimators=180, max_depth=8, min_samples_split=4, min_samples_leaf=2, random_state=42, n_jobs=1)
    lgb_cad = LGBMClassifier(n_estimators=140, max_depth=3, num_leaves=12, learning_rate=0.03, subsample=0.85, random_state=42, verbose=-1, n_jobs=1)
    rf_cad = RandomForestClassifier(n_estimators=160, max_depth=6, min_samples_split=4, min_samples_leaf=2, random_state=42, n_jobs=1)
    lr_cad = LogisticRegression(C=0.5, max_iter=2000, random_state=42)

    cad_ensemble = VotingClassifier(
        estimators=[('cat', cat_cad), ('et', et_cad), ('lgb', lgb_cad), ('rf', rf_cad), ('lr', lr_cad)],
        voting='soft',
        weights=[2.2, 1.8, 1.5, 1.2, 1.0]
    )
    
    # SMOTE on training split only
    sm = SMOTE(random_state=42)
    X_tr_cad_res, y_tr_cad_res = sm.fit_resample(X_train_full[feats_cad], y_train['Overall_CAD'])
    cad_ensemble.fit(X_tr_cad_res, y_tr_cad_res)

    res_cad = evaluate_performance(cad_ensemble, X_train_full[feats_cad], y_train['Overall_CAD'], X_test_full[feats_cad], y_test['Overall_CAD'], "Overall_CAD")
    benchmark_reports.append(res_cad)
    trained_models['Overall_CAD'] = cad_ensemble
    print(f"  Train Acc: {res_cad['Train Acc']*100:.2f}% | Test Acc: {res_cad['Test Acc']*100:.2f}% | Gap: {res_cad['Generalization Gap']*100:+.2f}% | AUC: {res_cad['ROC-AUC']:.4f}")

    # =========================================================================
    # 2. TARGET: LAD (Left Anterior Descending - Anterior/Septal Wall)
    # =========================================================================
    print("\n" + "-" * 70)
    print("2. Optimizing Target: LAD")
    print("-" * 70)
    feats_lad = select_top_target_features(X_train_full, y_train['LAD'], k=22)
    target_feature_map['LAD'] = feats_lad
    print(f"Selected Top {len(feats_lad)} Features: {', '.join(feats_lad[:8])}...")

    lad_cat = CatBoostClassifier(iterations=200, depth=5, learning_rate=0.04, l2_leaf_reg=4, random_seed=42, verbose=0, thread_count=1)
    lad_et = ExtraTreesClassifier(n_estimators=200, max_depth=9, min_samples_split=3, min_samples_leaf=2, random_state=42, n_jobs=1)
    lad_rf = RandomForestClassifier(n_estimators=180, max_depth=7, min_samples_split=3, min_samples_leaf=2, random_state=42, n_jobs=1)
    lad_lgb = LGBMClassifier(n_estimators=150, max_depth=4, num_leaves=14, learning_rate=0.03, random_state=42, verbose=-1, n_jobs=1)
    lad_lr = LogisticRegression(C=0.3, max_iter=2000, random_state=42)

    lad_ensemble = VotingClassifier(
        estimators=[('et', lad_et), ('cat', lad_cat), ('rf', lad_rf), ('lgb', lad_lgb), ('lr', lad_lr)],
        voting='soft',
        weights=[2.2, 2.0, 1.5, 1.4, 1.0]
    )

    X_tr_lad_res, y_tr_lad_res = sm.fit_resample(X_train_full[feats_lad], y_train['LAD'])
    lad_ensemble.fit(X_tr_lad_res, y_tr_lad_res)

    res_lad = evaluate_performance(lad_ensemble, X_train_full[feats_lad], y_train['LAD'], X_test_full[feats_lad], y_test['LAD'], "LAD")
    benchmark_reports.append(res_lad)
    trained_models['LAD'] = lad_ensemble
    print(f"  Train Acc: {res_lad['Train Acc']*100:.2f}% | Test Acc: {res_lad['Test Acc']*100:.2f}% | Gap: {res_lad['Generalization Gap']*100:+.2f}% | AUC: {res_lad['ROC-AUC']:.4f}")

    # =========================================================================
    # 3. TARGET: RCA (Right Coronary Artery - Inferior Wall)
    # =========================================================================
    print("\n" + "-" * 70)
    print("3. Optimizing Target: RCA")
    print("-" * 70)
    feats_rca = select_top_target_features(X_train_full, y_train['RCA'], k=20)
    target_feature_map['RCA'] = feats_rca
    print(f"Selected Top {len(feats_rca)} Features: {', '.join(feats_rca[:8])}...")

    # Borderline SMOTE for 38% positive class
    bsmote = BorderlineSMOTE(random_state=42)
    X_tr_rca_res, y_tr_rca_res = bsmote.fit_resample(X_train_full[feats_rca], y_train['RCA'])

    rca_cat = CatBoostClassifier(iterations=180, depth=4, learning_rate=0.03, l2_leaf_reg=5, random_seed=42, verbose=0, thread_count=1)
    rca_et = ExtraTreesClassifier(n_estimators=180, max_depth=7, min_samples_split=4, min_samples_leaf=2, random_state=42, n_jobs=1)
    rca_lgb = LGBMClassifier(n_estimators=130, max_depth=3, num_leaves=10, learning_rate=0.03, subsample=0.85, random_state=42, verbose=-1, n_jobs=1)
    rca_lr = LogisticRegression(C=0.4, max_iter=2000, random_state=42)

    rca_ensemble = VotingClassifier(
        estimators=[('cat', rca_cat), ('et', rca_et), ('lgb', rca_lgb), ('lr', rca_lr)],
        voting='soft',
        weights=[2.2, 1.8, 1.5, 1.0]
    )
    rca_ensemble.fit(X_tr_rca_res, y_tr_rca_res)

    res_rca = evaluate_performance(rca_ensemble, X_train_full[feats_rca], y_train['RCA'], X_test_full[feats_rca], y_test['RCA'], "RCA")
    benchmark_reports.append(res_rca)
    trained_models['RCA'] = rca_ensemble
    print(f"  Train Acc: {res_rca['Train Acc']*100:.2f}% | Test Acc: {res_rca['Test Acc']*100:.2f}% | Gap: {res_rca['Generalization Gap']*100:+.2f}% | AUC: {res_rca['ROC-AUC']:.4f}")

    # =========================================================================
    # 4. TARGET: LCX (Left Circumflex - Lateral Wall)
    # =========================================================================
    print("\n" + "-" * 70)
    print("4. Optimizing Target: LCX")
    print("-" * 70)
    feats_lcx = select_top_target_features(X_train_full, y_train['LCX'], k=19)
    target_feature_map['LCX'] = feats_lcx
    print(f"Selected Top {len(feats_lcx)} Features: {', '.join(feats_lcx[:8])}...")

    X_tr_lcx_res, y_tr_lcx_res = bsmote.fit_resample(X_train_full[feats_lcx], y_train['LCX'])

    lcx_cat = CatBoostClassifier(iterations=200, depth=4, learning_rate=0.03, l2_leaf_reg=6, random_seed=42, verbose=0, thread_count=1)
    lcx_et = ExtraTreesClassifier(n_estimators=200, max_depth=7, min_samples_split=4, min_samples_leaf=2, random_state=42, n_jobs=1)
    lcx_lgb = LGBMClassifier(n_estimators=130, max_depth=3, num_leaves=8, learning_rate=0.03, subsample=0.85, random_state=42, verbose=-1, n_jobs=1)
    lcx_lr = LogisticRegression(C=0.25, max_iter=2000, random_state=42)

    lcx_ensemble = VotingClassifier(
        estimators=[('et', lcx_et), ('cat', lcx_cat), ('lgb', lcx_lgb), ('lr', lcx_lr)],
        voting='soft',
        weights=[2.2, 2.0, 1.4, 1.0]
    )
    lcx_ensemble.fit(X_tr_lcx_res, y_tr_lcx_res)

    res_lcx = evaluate_performance(lcx_ensemble, X_train_full[feats_lcx], y_train['LCX'], X_test_full[feats_lcx], y_test['LCX'], "LCX")
    benchmark_reports.append(res_lcx)
    trained_models['LCX'] = lcx_ensemble
    print(f"  Train Acc: {res_lcx['Train Acc']*100:.2f}% | Test Acc: {res_lcx['Test Acc']*100:.2f}% | Gap: {res_lcx['Generalization Gap']*100:+.2f}% | AUC: {res_lcx['ROC-AUC']:.4f}")

    # =========================================================================
    # SUMMARY & OVERFIT / UNDERFIT VERIFICATION TABLE
    # =========================================================================
    print("\n" + "=" * 95)
    print("FINAL OPTIMAL GENERALIZATION BENCHMARK SUMMARY (HOLDOUT N = 61)")
    print("=" * 95)
    bench_df = pd.DataFrame(benchmark_reports)
    print(bench_df[['Target', 'Train Acc', 'Test Acc', 'Generalization Gap', 'Sensitivity (Recall)', 'Specificity', 'Precision', 'F1-Score', 'ROC-AUC', 'Brier Score']].round(4).to_string(index=False))

    # Persist to production 'models/'
    models_dir = 'models'
    os.makedirs(models_dir, exist_ok=True)
    for t_name, model in trained_models.items():
        joblib.dump(model, os.path.join(models_dir, f'best_model_{t_name}.joblib'))
    joblib.dump(scaler, os.path.join(models_dir, 'scaler.joblib'))
    joblib.dump(feature_columns, os.path.join(models_dir, 'feature_columns.joblib'))
    joblib.dump(target_feature_map, os.path.join(models_dir, 'target_feature_columns.joblib'))
    print(f"\n[OK] Persisted models, scaler, and feature mappings directly to '{models_dir}/'")

if __name__ == '__main__':
    main()
