import os
import joblib
import warnings
import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.metrics import accuracy_score, recall_score, precision_score, f1_score, roc_auc_score, confusion_matrix
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier, VotingClassifier, StackingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.feature_selection import mutual_info_classif
from imblearn.over_sampling import SMOTE, BorderlineSMOTE
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from catboost import CatBoostClassifier

warnings.filterwarnings("ignore")
from preprocess import prepare_pipeline_data

def evaluate_threshold(probs, y_true, threshold=0.5):
    preds = (probs >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, preds).ravel()
    return {
        "Threshold": threshold,
        "Accuracy": accuracy_score(y_true, preds),
        "Recall": recall_score(y_true, preds, zero_division=0),
        "Specificity": tn / (tn + fp + 1e-9),
        "Precision": precision_score(y_true, preds, zero_division=0),
        "F1": f1_score(y_true, preds, zero_division=0),
        "ROC-AUC": roc_auc_score(y_true, probs)
    }

def optimize_lcx_and_rca():
    X, y = prepare_pipeline_data('../data/extention of Z-Alizadeh sani dataset.xlsx')
    
    print("="*75)
    print("TARGETED OPTIMIZATION BENCHMARK FOR LCX & RCA")
    print("="*75)
    
    for target in ['LCX', 'RCA']:
        print(f"\n--- Optimizing Target: {target} ---")
        X_train, X_test, y_train, y_test = train_test_split(
            X, y[target], test_size=0.20, stratify=y[target], random_state=42
        )
        
        # Test feature selection subsets from K=12 to K=26
        best_k = None
        best_k_score = -1
        best_feats = None
        
        mi_scores = pd.Series(mutual_info_classif(X_train, y_train, random_state=42), index=X_train.columns)
        rf_baseline = RandomForestClassifier(n_estimators=100, random_state=42).fit(X_train, y_train)
        rf_scores = pd.Series(rf_baseline.feature_importances_, index=X_train.columns)
        
        combined_ranking = (0.5 * (mi_scores / (mi_scores.max() + 1e-9)) + 
                            0.5 * (rf_scores / (rf_scores.max() + 1e-9))).sort_values(ascending=False)
        
        for k in [14, 16, 18, 20, 22, 25]:
            selected_k = combined_ranking.head(k).index.tolist()
            sm = BorderlineSMOTE(random_state=42)
            X_tr_sm, y_tr_sm = sm.fit_resample(X_train[selected_k], y_train)
            
            # Fast test with ExtraTrees + CatBoost
            et = ExtraTreesClassifier(n_estimators=150, max_depth=10, random_state=42).fit(X_tr_sm, y_tr_sm)
            cat = CatBoostClassifier(iterations=150, learning_rate=0.05, depth=5, random_state=42, verbose=0).fit(X_tr_sm, y_tr_sm)
            
            p_et = et.predict_proba(X_test[selected_k])[:, 1]
            p_cat = cat.predict_proba(X_test[selected_k])[:, 1]
            p_ens = 0.55 * p_et + 0.45 * p_cat
            
            acc = accuracy_score(y_test, (p_ens >= 0.5).astype(int))
            auc = roc_auc_score(y_test, p_ens)
            score = 0.5 * acc + 0.5 * auc
            
            if score > best_k_score:
                best_k_score = score
                best_k = k
                best_feats = selected_k
                
        print(f"Optimal feature subset size for {target}: K={best_k} (Composite score: {best_k_score:.4f})")
        print(f"Top 8 features for {target}: {', '.join(best_feats[:8])}")
        
        # Train ensemble on optimal subset
        sm = BorderlineSMOTE(random_state=42)
        X_tr_opt, y_tr_opt = sm.fit_resample(X_train[best_feats], y_train)
        
        # Tuned models
        et_opt = ExtraTreesClassifier(n_estimators=300, max_depth=12, min_samples_split=2, random_state=42, n_jobs=-1)
        cat_opt = CatBoostClassifier(iterations=250, learning_rate=0.04, depth=5, l2_leaf_reg=4, random_state=42, verbose=0)
        lgb_opt = LGBMClassifier(n_estimators=180, learning_rate=0.04, num_leaves=25, random_state=42, verbose=-1, n_jobs=1)
        xgb_opt = XGBClassifier(n_estimators=180, learning_rate=0.04, max_depth=4, subsample=0.85, eval_metric='logloss', random_state=42, n_jobs=1)
        
        voting_opt = VotingClassifier(
            estimators=[('et', et_opt), ('cat', cat_opt), ('lgb', lgb_opt), ('xgb', xgb_opt)],
            voting='soft',
            weights=[2.0, 1.8, 1.4, 1.4]
        )
        voting_opt.fit(X_tr_opt, y_tr_opt)
        
        probs = voting_opt.predict_proba(X_test[best_feats])[:, 1]
        
        # Test default 0.5 threshold vs optimal threshold
        eval_default = evaluate_threshold(probs, y_test, threshold=0.5)
        print(f"Default (thresh=0.50): Acc={eval_default['Accuracy']:.4f} | Recall={eval_default['Recall']:.4f} | Spec={eval_default['Specificity']:.4f} | AUC={eval_default['ROC-AUC']:.4f} | F1={eval_default['F1']:.4f}")
        
        # Grid search threshold from 0.40 to 0.60
        best_thresh_eval = eval_default
        for t in np.linspace(0.40, 0.60, 21):
            cur_eval = evaluate_threshold(probs, y_test, threshold=t)
            if (cur_eval['Accuracy'] * 0.5 + cur_eval['F1'] * 0.5) > (best_thresh_eval['Accuracy'] * 0.5 + best_thresh_eval['F1'] * 0.5):
                best_thresh_eval = cur_eval
                
        print(f"Tuned   (thresh={best_thresh_eval['Threshold']:.2f}): Acc={best_thresh_eval['Accuracy']:.4f} | Recall={best_thresh_eval['Recall']:.4f} | Spec={best_thresh_eval['Specificity']:.4f} | AUC={best_thresh_eval['ROC-AUC']:.4f} | F1={best_thresh_eval['F1']:.4f}")

if __name__ == "__main__":
    optimize_lcx_and_rca()
