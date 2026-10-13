import os
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import StratifiedKFold, train_test_split, cross_val_predict
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier, StackingClassifier
from sklearn.feature_selection import mutual_info_classif
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from catboost import CatBoostClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
from imblearn.over_sampling import BorderlineSMOTE
import warnings

warnings.filterwarnings("ignore")

from preprocess import clean_and_impute

def advanced_feature_engineering(df):
    """
    State-of-the-art cardiovascular physiological feature engineering.
    """
    X = df.copy()
    
    # 1. Lipid ratios & Atherogenic Index of Plasma (AIP)
    if 'TG' in X.columns and 'HDL' in X.columns:
        tg_hdl_ratio = X['TG'] / (X['HDL'] + 1e-9)
        X['AIP'] = np.log10(np.clip(tg_hdl_ratio, 1e-3, 1000.0))
    if 'LDL' in X.columns and 'HDL' in X.columns:
        X['LDL_HDL_Ratio'] = X['LDL'] / (X['HDL'] + 1e-9)
        X['Castelli_Risk_Index'] = (X['LDL'] + X['HDL'] + X.get('TG', 0)/5.0) / (X['HDL'] + 1e-9)
        
    # 2. Systemic Immune-Inflammation Index (SII) and NLR
    if 'PLT' in X.columns and 'Neut' in X.columns and 'Lymph' in X.columns:
        X['SII'] = (X['PLT'] * X['Neut']) / (X['Lymph'] + 1e-9)
        X['NLR'] = X['Neut'] / (X['Lymph'] + 1e-9)
        
    # 3. Arterial & Hemodynamic load
    if 'BP' in X.columns:
        X['MAP_Approx'] = X['BP'] * 0.85
        
    # 4. Binary mapping for categorical strings
    cat_cols = X.select_dtypes(include=['object', 'category']).columns
    for col in cat_cols:
        X[col] = X[col].apply(
            lambda x: 1 if str(x).strip().upper() in ['Y', 'YES', 'CAD', 'STENOTIC'] else 
                     (0 if str(x).strip().upper() in ['N', 'NO', 'NORMAL'] else x)
        )
        
    # Ensure numeric
    for col in ['St Elevation', 'St Depression', 'Tinversion', 'Q Wave', 'Region RWMA', 'Typical Chest Pain', 'Function Class', 'EF-TTE', 'Age', 'BMI']:
        if col in X.columns:
            X[col] = pd.to_numeric(X[col], errors='coerce').fillna(0)
            
    # 5. Territorial ECG-Echo Interaction Vectors
    if 'St Elevation' in X.columns and 'Region RWMA' in X.columns:
        X['Anterior_Ischemia_Vector'] = (X['St Elevation'] * 2.0 + X['St Depression'] + X['Tinversion']) * (X['Region RWMA'] + 1.0)
    if 'Q Wave' in X.columns and 'BP' in X.columns:
        X['Inferior_Ischemia_Vector'] = (X['Q Wave'] * 2.0 + X['St Depression']) * (X['BP'] / 100.0)
    if 'Typical Chest Pain' in X.columns and 'Function Class' in X.columns:
        X['Angina_Severity_Index'] = X['Typical Chest Pain'] * (X['Function Class'] + 1.0)
    if 'EF-TTE' in X.columns:
        X['Ventricular_Dysfunction'] = np.clip((55.0 - X['EF-TTE']) / 10.0, 0, 10)

    # One-hot encode remaining categoricals if any
    cat_cols = X.select_dtypes(include=['object', 'category']).columns
    if len(cat_cols) > 0:
        X = pd.get_dummies(X, columns=cat_cols, drop_first=True)
        
    return X.astype(float)

def select_top_features(X_train, y_train, k=24, context_cols=[]):
    """Selects top K features using mutual info and random forest, preserving context columns."""
    non_context = [c for c in X_train.columns if c not in context_cols]
    
    mi = mutual_info_classif(X_train[non_context], y_train, random_state=42)
    rf = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42, n_jobs=1)
    rf.fit(X_train[non_context], y_train)
    
    mi_norm = (mi - mi.min()) / (mi.max() - mi.min() + 1e-9)
    rf_norm = (rf.feature_importances_ - rf.feature_importances_.min()) / (rf.feature_importances_.max() - rf.feature_importances_.min() + 1e-9)
    scores = pd.Series(0.5 * mi_norm + 0.5 * rf_norm, index=non_context)
    
    top_feats = scores.nlargest(k).index.tolist()
    return top_feats + context_cols

def get_base_estimators(random_state=42):
    """Constructs stable single-threaded base models for Windows multiprocessing safety."""
    cb = CatBoostClassifier(iterations=200, depth=4, learning_rate=0.04, l2_leaf_reg=4, verbose=0, random_seed=random_state, thread_count=1)
    xgb = XGBClassifier(n_estimators=160, max_depth=3, learning_rate=0.03, subsample=0.85, colsample_bytree=0.8, random_state=random_state, eval_metric='logloss', n_jobs=1)
    lgb = LGBMClassifier(n_estimators=140, max_depth=3, num_leaves=7, learning_rate=0.03, subsample=0.85, random_state=random_state, verbose=-1, n_jobs=1)
    et = ExtraTreesClassifier(n_estimators=180, max_depth=6, min_samples_split=4, random_state=random_state, n_jobs=1)
    rf = RandomForestClassifier(n_estimators=180, max_depth=6, min_samples_split=4, random_state=random_state, n_jobs=1)
    
    return [
        ('cb', cb),
        ('xgb', xgb),
        ('lgb', lgb),
        ('et', et),
        ('rf', rf)
    ]

def train_and_eval_stack(X_train, y_train, X_test, y_test, target_name, k_features=24, context_cols=[], use_smote=False, random_state=42):
    """
    Trains a calibrated StackingClassifier with Out-Of-Fold cross-validation predictions.
    """
    selected_features = select_top_features(X_train, y_train, k=k_features, context_cols=context_cols)
    X_train_sub = X_train[selected_features].copy()
    X_test_sub = X_test[selected_features].copy()
    
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=random_state)
    
    # Base stack definition
    estimators = get_base_estimators(random_state)
    meta_learner = LogisticRegression(C=0.5, max_iter=1000, random_state=random_state)
    
    stack = StackingClassifier(
        estimators=estimators,
        final_estimator=meta_learner,
        cv=skf,
        n_jobs=1,
        passthrough=True
    )
    
    # 1. Compute Out-Of-Fold predictions on training set for threshold tuning & downstream chaining
    oof_probs = cross_val_predict(stack, X_train_sub, y_train, cv=skf, method='predict_proba', n_jobs=1)[:, 1]
    
    # 2. Fit final model on full training data (with optional SMOTE for imbalanced vessels)
    if use_smote:
        sm = BorderlineSMOTE(random_state=random_state, sampling_strategy='auto')
        X_train_fit, y_train_fit = sm.fit_resample(X_train_sub, y_train)
    else:
        X_train_fit, y_train_fit = X_train_sub, y_train
        
    stack.fit(X_train_fit, y_train_fit)
    
    # 3. Predict on unseen test set
    test_probs = stack.predict_proba(X_test_sub)[:, 1]
    
    # 4. Optimal Youden's threshold search on OOF predictions
    best_thresh = 0.5
    best_j = -1
    for thresh in np.linspace(0.20, 0.80, 61):
        preds_t = (oof_probs >= thresh).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_train, preds_t).ravel()
        sens = tp / (tp + fn + 1e-9)
        spec = tn / (tn + fp + 1e-9)
        j = sens + spec - 1
        if j > best_j:
            best_j = j
            best_thresh = thresh
            
    # Evaluation metrics
    std_preds = (test_probs >= 0.5).astype(int)
    tuned_preds = (test_probs >= best_thresh).astype(int)
    
    acc_std = accuracy_score(y_test, std_preds)
    acc_tuned = accuracy_score(y_test, tuned_preds)
    auc = roc_auc_score(y_test, test_probs)
    sens_tuned = recall_score(y_test, tuned_preds)
    prec_tuned = precision_score(y_test, tuned_preds, zero_division=0)
    f1_tuned = f1_score(y_test, tuned_preds)
    
    print(f"\n[{target_name.upper()} RESULTS - Features: {len(selected_features)}]")
    print(f"  Standard (0.50 cutoff) -> Accuracy: {acc_std*100:.2f}%")
    print(f"  Optimal ({best_thresh:.2f} cutoff) -> Accuracy: {acc_tuned*100:.2f}%, AUC: {auc:.4f}, Sensitivity (Recall): {sens_tuned*100:.2f}%, Precision: {prec_tuned*100:.2f}%, F1: {f1_tuned:.4f}")
    
    return {
        "model": stack,
        "selected_features": selected_features,
        "oof_probs": oof_probs,
        "test_probs": test_probs,
        "best_threshold": best_thresh,
        "acc_std": acc_std,
        "acc_tuned": acc_tuned,
        "auc": auc,
        "sensitivity": sens_tuned,
        "precision": prec_tuned,
        "f1": f1_tuned
    }

def main():
    print("=" * 80)
    print("TRAINING CARDIOCHAIN SUPER-ENSEMBLE WITH PHYSIOLOGICAL SYNERGY")
    print("=" * 80)
    
    data_path = '../data/extention of Z-Alizadeh sani dataset.xlsx'
    df_raw = pd.read_excel(data_path)
    df_clean = clean_and_impute(df_raw)
    
    target_cols = ['Cath', 'LAD', 'LCX', 'RCA', 'VHD', 'Overall CAD']
    y_df = pd.DataFrame()
    y_df['Overall_CAD'] = (df_clean['Cath'].astype(str).str.upper() == 'CAD').astype(int)
    y_df['LAD'] = (df_clean['LAD'].astype(str).str.upper() == 'STENOTIC').astype(int)
    y_df['LCX'] = (df_clean['LCX'].astype(str).str.upper() == 'STENOTIC').astype(int)
    y_df['RCA'] = (df_clean['RCA'].astype(str).str.upper() == 'STENOTIC').astype(int)
    
    X_raw = df_clean.drop(columns=[col for col in target_cols if col in df_clean.columns], errors='ignore')
    
    print(f"Cohort size: {len(X_raw)} patients.")
    print("Calculating physiological biomarker synergy ratios (AIP, SII, NLR, Ischemia Vectors)...")
    X_feat = advanced_feature_engineering(X_raw)
    print(f"Engineered feature matrix: {X_feat.shape[1]} features.")
    
    # 80/20 Stratified Split
    train_idx, test_idx = train_test_split(
        np.arange(len(X_feat)), test_size=0.20, stratify=y_df['Overall_CAD'], random_state=42
    )
    
    X_train_base = X_feat.iloc[train_idx].copy().reset_index(drop=True)
    X_test_base = X_feat.iloc[test_idx].copy().reset_index(drop=True)
    
    y_train = y_df.iloc[train_idx].copy().reset_index(drop=True)
    y_test = y_df.iloc[test_idx].copy().reset_index(drop=True)
    
    chain_models = {}
    chain_features = {}
    chain_thresholds = {}
    
    # -------------------------------------------------------------------------
    # STAGE 1: Overall CAD (Root of Anatomical Chain)
    # -------------------------------------------------------------------------
    print("\n" + "-"*60)
    print("STAGE 1: Training Overall CAD Stacking Ensemble")
    print("-"*60)
    res_cad = train_and_eval_stack(
        X_train_base, y_train['Overall_CAD'],
        X_test_base, y_test['Overall_CAD'],
        "Overall_CAD", k_features=25, context_cols=[]
    )
    chain_models['Overall_CAD'] = res_cad['model']
    chain_features['Overall_CAD'] = res_cad['selected_features']
    chain_thresholds['Overall_CAD'] = res_cad['best_threshold']
    
    # Chaining: Add CAD Prob Context to downstream data
    X_train_lad = X_train_base.copy()
    X_train_lad['CAD_Prob_Context'] = res_cad['oof_probs']
    
    X_test_lad = X_test_base.copy()
    X_test_lad['CAD_Prob_Context'] = res_cad['test_probs']
    
    # -------------------------------------------------------------------------
    # STAGE 2: LAD (Left Anterior Descending - Anterior/Septal)
    # -------------------------------------------------------------------------
    print("\n" + "-"*60)
    print("STAGE 2: Training LAD Ensemble (Conditioned on Overall CAD)")
    print("-"*60)
    res_lad = train_and_eval_stack(
        X_train_lad, y_train['LAD'],
        X_test_lad, y_test['LAD'],
        "LAD", k_features=22, context_cols=['CAD_Prob_Context']
    )
    chain_models['LAD'] = res_lad['model']
    chain_features['LAD'] = res_lad['selected_features']
    chain_thresholds['LAD'] = res_lad['best_threshold']
    
    # Chaining: Add LAD Prob Context to downstream data
    X_train_rca = X_train_lad.copy()
    X_train_rca['LAD_Prob_Context'] = res_lad['oof_probs']
    
    X_test_rca = X_test_lad.copy()
    X_test_rca['LAD_Prob_Context'] = res_lad['test_probs']
    
    # -------------------------------------------------------------------------
    # STAGE 3: RCA (Right Coronary Artery - Inferior/Posterior)
    # -------------------------------------------------------------------------
    print("\n" + "-"*60)
    print("STAGE 3: Training RCA Ensemble (Conditioned on CAD + LAD)")
    print("-"*60)
    res_rca = train_and_eval_stack(
        X_train_rca, y_train['RCA'],
        X_test_rca, y_test['RCA'],
        "RCA", k_features=20, context_cols=['CAD_Prob_Context', 'LAD_Prob_Context'], use_smote=True
    )
    chain_models['RCA'] = res_rca['model']
    chain_features['RCA'] = res_rca['selected_features']
    chain_thresholds['RCA'] = res_rca['best_threshold']
    
    # Chaining: Add RCA Prob Context to downstream data
    X_train_lcx = X_train_rca.copy()
    X_train_lcx['RCA_Prob_Context'] = res_rca['oof_probs']
    
    X_test_lcx = X_test_rca.copy()
    X_test_lcx['RCA_Prob_Context'] = res_rca['test_probs']
    
    # -------------------------------------------------------------------------
    # STAGE 4: LCX (Left Circumflex - Lateral Wall / Multi-Vessel)
    # -------------------------------------------------------------------------
    print("\n" + "-"*60)
    print("STAGE 4: Training LCX Ensemble (Conditioned on CAD + LAD + RCA)")
    print("-"*60)
    res_lcx = train_and_eval_stack(
        X_train_lcx, y_train['LCX'],
        X_test_lcx, y_test['LCX'],
        "LCX", k_features=18, context_cols=['CAD_Prob_Context', 'LAD_Prob_Context', 'RCA_Prob_Context'], use_smote=True
    )
    chain_models['LCX'] = res_lcx['model']
    chain_features['LCX'] = res_lcx['selected_features']
    chain_thresholds['LCX'] = res_lcx['best_threshold']
    
    # -------------------------------------------------------------------------
    # BENCHMARK COMPARISON TABLE
    # -------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print("CARDIOCHAIN BENCHMARK SUMMARY (TEST SET N = 61)")
    print("=" * 80)
    targets = ['Overall_CAD', 'LAD', 'RCA', 'LCX']
    results = [res_cad, res_lad, res_rca, res_lcx]
    
    for t_name, r in zip(targets, results):
        print(f"  {t_name:12s} | Acc (Std): {r['acc_std']*100:.2f}% | Acc (Opt): {r['acc_tuned']*100:.2f}% | AUC: {r['auc']:.4f} | Recall: {r['sensitivity']*100:.2f}% | F1: {r['f1']:.4f}")
        
    # Save models
    save_dir = 'models_cardiochain'
    os.makedirs(save_dir, exist_ok=True)
    
    for t_name, model in chain_models.items():
        joblib.dump(model, os.path.join(save_dir, f'cardiochain_model_{t_name}.joblib'))
        
    joblib.dump(chain_features, os.path.join(save_dir, 'chain_features.joblib'))
    joblib.dump(chain_thresholds, os.path.join(save_dir, 'optimal_thresholds.joblib'))
    joblib.dump(list(X_feat.columns), os.path.join(save_dir, 'base_features.joblib'))
    print(f"\n[SUCCESS] CardioChain Super-Ensemble saved to '{save_dir}'.")

if __name__ == "__main__":
    main()
