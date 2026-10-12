import os
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, StratifiedKFold, RandomizedSearchCV
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier, VotingClassifier, StackingClassifier
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from catboost import CatBoostClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from imblearn.over_sampling import SMOTE
import warnings

warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

from preprocess import prepare_pipeline_data

def evaluate(model, X_test, y_test, name=""):
    preds = model.predict(X_test)
    probs = model.predict_proba(X_test)[:, 1] if hasattr(model, 'predict_proba') else preds
    return {
        "Model": name,
        "Accuracy": accuracy_score(y_test, preds),
        "Precision": precision_score(y_test, preds, zero_division=0),
        "Recall": recall_score(y_test, preds, zero_division=0),
        "F1": f1_score(y_test, preds, zero_division=0),
        "ROC-AUC": roc_auc_score(y_test, probs)
    }

def main():
    file_path = '../data/extention of Z-Alizadeh sani dataset.xlsx'
    models_dir = 'models'
    os.makedirs(models_dir, exist_ok=True)
    
    print("\n" + "="*70)
    print("DEPLOYING SUPERIOR MODELS TO PRODUCTION (models/)")
    print("="*70)
    
    # 1. Prepare pipeline features and scaler
    X, y = prepare_pipeline_data(file_path, output_dir=models_dir)
    print(f"Features: {X.shape[1]} clinical variables | Patients: {X.shape[0]}")
    
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    deployed_summary = {}
    
    # -------------------------------------------------------------
    # Target 1: Overall_CAD -> Soft-Voting Ensemble (86.89% Acc, 93.02% Recall)
    # -------------------------------------------------------------
    print("\n[1/4] Training & Deploying Overall_CAD (Soft-Voting Ensemble)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y['Overall_CAD'], test_size=0.20, stratify=y['Overall_CAD'], random_state=42
    )
    smote = SMOTE(random_state=42)
    X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
    
    cat = CatBoostClassifier(iterations=200, learning_rate=0.06, depth=6, l2_leaf_reg=3, random_state=42, verbose=0, allow_writing_files=False, thread_count=1)
    lgb = LGBMClassifier(n_estimators=150, learning_rate=0.05, num_leaves=31, random_state=42, verbose=-1, n_jobs=1)
    xgb = XGBClassifier(n_estimators=150, learning_rate=0.05, max_depth=4, eval_metric='logloss', random_state=42, n_jobs=1)
    et = ExtraTreesClassifier(n_estimators=200, max_depth=15, min_samples_split=2, random_state=42, n_jobs=1)
    lr = LogisticRegression(C=0.5, max_iter=2500, random_state=42)
    
    cad_voting = VotingClassifier(
        estimators=[('cat', cat), ('lgb', lgb), ('xgb', xgb), ('et', et), ('lr', lr)],
        voting='soft'
    )
    cad_voting.fit(X_train_res, y_train_res)
    cad_metrics = evaluate(cad_voting, X_test, y_test, "Overall_CAD Soft-Voting")
    joblib.dump(cad_voting, os.path.join(models_dir, 'best_model_Overall_CAD.joblib'))
    deployed_summary['Overall_CAD'] = cad_metrics
    print(f"  --> Deployed! Test Acc: {cad_metrics['Accuracy']:.4f} | Recall: {cad_metrics['Recall']:.4f} | AUC: {cad_metrics['ROC-AUC']:.4f}")
    
    # -------------------------------------------------------------
    # Target 2: LAD -> Tuned Extra Trees / CatBoost (80.33% Acc, 83.78% F1)
    # -------------------------------------------------------------
    print("\n[2/4] Training & Deploying LAD (Extra Trees & CatBoost Ensemble)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y['LAD'], test_size=0.20, stratify=y['LAD'], random_state=42
    )
    X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
    
    lad_cat = CatBoostClassifier(iterations=200, learning_rate=0.06, depth=6, random_state=42, verbose=0, allow_writing_files=False, thread_count=1)
    lad_et = ExtraTreesClassifier(n_estimators=200, max_depth=15, min_samples_split=2, random_state=42, n_jobs=1)
    lad_rf = RandomForestClassifier(n_estimators=200, max_depth=15, min_samples_split=2, random_state=42, n_jobs=1)
    lad_lr = LogisticRegression(C=0.1, max_iter=2500, random_state=42)
    
    lad_voting = VotingClassifier(
        estimators=[('et', lad_et), ('cat', lad_cat), ('rf', lad_rf), ('lr', lad_lr)],
        voting='soft'
    )
    lad_voting.fit(X_train_res, y_train_res)
    lad_metrics = evaluate(lad_voting, X_test, y_test, "LAD Ensemble")
    joblib.dump(lad_voting, os.path.join(models_dir, 'best_model_LAD.joblib'))
    deployed_summary['LAD'] = lad_metrics
    print(f"  --> Deployed! Test Acc: {lad_metrics['Accuracy']:.4f} | Recall: {lad_metrics['Recall']:.4f} | AUC: {lad_metrics['ROC-AUC']:.4f}")
    
    # -------------------------------------------------------------
    # Target 3: LCX -> Tuned Extra Trees & LightGBM (68.85% Acc, 0.7292 AUC)
    # -------------------------------------------------------------
    print("\n[3/4] Training & Deploying LCX (Ensemble)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y['LCX'], test_size=0.20, stratify=y['LCX'], random_state=42
    )
    X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
    
    lcx_et = ExtraTreesClassifier(n_estimators=200, max_depth=12, min_samples_split=2, random_state=42, n_jobs=1)
    lcx_lgb = LGBMClassifier(n_estimators=100, learning_rate=0.05, num_leaves=31, random_state=42, verbose=-1, n_jobs=1)
    lcx_cat = CatBoostClassifier(iterations=150, learning_rate=0.05, depth=5, random_state=42, verbose=0, allow_writing_files=False, thread_count=1)
    
    lcx_voting = VotingClassifier(
        estimators=[('et', lcx_et), ('lgb', lcx_lgb), ('cat', lcx_cat)],
        voting='soft'
    )
    lcx_voting.fit(X_train_res, y_train_res)
    lcx_metrics = evaluate(lcx_voting, X_test, y_test, "LCX Ensemble")
    joblib.dump(lcx_voting, os.path.join(models_dir, 'best_model_LCX.joblib'))
    deployed_summary['LCX'] = lcx_metrics
    print(f"  --> Deployed! Test Acc: {lcx_metrics['Accuracy']:.4f} | Recall: {lcx_metrics['Recall']:.4f} | AUC: {lcx_metrics['ROC-AUC']:.4f}")
    
    # -------------------------------------------------------------
    # Target 4: RCA -> CatBoost & Stacking (75.41% Acc, 0.7963 AUC)
    # -------------------------------------------------------------
    print("\n[4/4] Training & Deploying RCA (CatBoost & Stacking Ensemble)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y['RCA'], test_size=0.20, stratify=y['RCA'], random_state=42
    )
    X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
    
    rca_cat = CatBoostClassifier(iterations=200, learning_rate=0.06, depth=6, l2_leaf_reg=3, random_state=42, verbose=0, allow_writing_files=False, thread_count=1)
    rca_lgb = LGBMClassifier(n_estimators=150, learning_rate=0.05, num_leaves=31, random_state=42, verbose=-1, n_jobs=1)
    rca_et = ExtraTreesClassifier(n_estimators=150, max_depth=10, random_state=42, n_jobs=1)
    
    rca_stack = StackingClassifier(
        estimators=[('cat', rca_cat), ('lgb', rca_lgb), ('et', rca_et)],
        final_estimator=LogisticRegression(C=0.5, random_state=42),
        cv=cv,
        n_jobs=-1
    )
    rca_stack.fit(X_train_res, y_train_res)
    rca_metrics = evaluate(rca_stack, X_test, y_test, "RCA Stacking")
    joblib.dump(rca_stack, os.path.join(models_dir, 'best_model_RCA.joblib'))
    deployed_summary['RCA'] = rca_metrics
    print(f"  --> Deployed! Test Acc: {rca_metrics['Accuracy']:.4f} | Recall: {rca_metrics['Recall']:.4f} | AUC: {rca_metrics['ROC-AUC']:.4f}")
    
    # -------------------------------------------------------------
    # Final Deployment Summary
    # -------------------------------------------------------------
    print("\n" + "="*70)
    print("PRODUCTION DEPLOYMENT COMPLETED SUCCESSFULLY")
    print("="*70)
    summary_df = pd.DataFrame(deployed_summary).T[['Accuracy', 'Recall', 'Precision', 'F1', 'ROC-AUC']]
    print(summary_df.round(4))

if __name__ == "__main__":
    main()
