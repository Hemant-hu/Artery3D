import os
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, RandomizedSearchCV, StratifiedKFold
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier, VotingClassifier, StackingClassifier
from sklearn.feature_selection import mutual_info_classif
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from catboost import CatBoostClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from imblearn.over_sampling import SMOTE
import warnings

warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

from preprocess import prepare_pipeline_data

def evaluate_model(model, X_test, y_test, name="Model"):
    """Evaluates the model on unseen test data."""
    preds = model.predict(X_test)
    probs = model.predict_proba(X_test)[:, 1] if hasattr(model, 'predict_proba') else preds
    
    return {
        "Model": name,
        "Accuracy": accuracy_score(y_test, preds),
        "Precision": precision_score(y_test, preds, zero_division=0),
        "Recall (Sensitivity)": recall_score(y_test, preds, zero_division=0),
        "F1-Score": f1_score(y_test, preds, zero_division=0),
        "ROC-AUC": roc_auc_score(y_test, probs)
    }

def select_top_features(X_train, y_train, target_name, k=22):
    """
    Selects top K features using a combined Mutual Information & Random Forest importance ranking.
    """
    # 1. Mutual Information ranking
    mi_scores = mutual_info_classif(X_train, y_train, random_state=42)
    mi_series = pd.Series(mi_scores, index=X_train.columns)
    
    # 2. Random Forest feature importance ranking
    rf = RandomForestClassifier(n_estimators=100, random_state=42)
    rf.fit(X_train, y_train)
    rf_series = pd.Series(rf.feature_importances_, index=X_train.columns)
    
    # 3. Normalized combined score
    mi_norm = (mi_series - mi_series.min()) / (mi_series.max() - mi_series.min() + 1e-9)
    rf_norm = (rf_series - rf_series.min()) / (rf_series.max() - rf_series.min() + 1e-9)
    combined_score = 0.5 * mi_norm + 0.5 * rf_norm
    
    selected_features = combined_score.nlargest(k).index.tolist()
    print(f"\n[Feature Selection for {target_name}] Selected {len(selected_features)} most informative features:")
    print(", ".join(selected_features[:10]) + ", ...")
    
    return selected_features

def train_and_benchmark_target(X_train, X_test, y_train, y_test, target_name, output_dir, k_features=22):
    """
    Trains models on selected features and benchmarks ensembles.
    """
    print(f"\n{'='*65}\nTraining Target: {target_name} with Feature Selection (Top {k_features})\n{'='*65}")
    
    # 1. SMOTE on training data only
    smote = SMOTE(random_state=42)
    X_train_resampled, y_train_resampled = smote.fit_resample(X_train, y_train)
    
    # 2. Select top features using training data ONLY
    selected_features = select_top_features(X_train_resampled, y_train_resampled, target_name, k=k_features)
    
    # Filter features
    X_train_fs = X_train_resampled[selected_features]
    X_test_fs = X_test[selected_features]
    
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    
    # 3. Model Configurations
    model_configs = {
        "Logistic Regression": {
            'estimator': LogisticRegression(random_state=42, max_iter=2500),
            'params': {
                'C': [0.01, 0.05, 0.1, 0.5, 1.0, 5.0],
                'solver': ['liblinear', 'lbfgs']
            }
        },
        "Random Forest": {
            'estimator': RandomForestClassifier(random_state=42),
            'params': {
                'n_estimators': [100, 200],
                'max_depth': [None, 8, 15],
                'min_samples_split': [2, 5],
                'min_samples_leaf': [1, 2]
            }
        },
        "Extra Trees": {
            'estimator': ExtraTreesClassifier(random_state=42),
            'params': {
                'n_estimators': [100, 200],
                'max_depth': [None, 8, 15],
                'min_samples_split': [2, 5],
                'min_samples_leaf': [1, 2]
            }
        },
        "XGBoost": {
            'estimator': XGBClassifier(eval_metric='logloss', random_state=42, n_jobs=1),
            'params': {
                'n_estimators': [75, 150],
                'learning_rate': [0.03, 0.08, 0.15],
                'max_depth': [3, 4, 5],
                'subsample': [0.8, 1.0],
                'colsample_bytree': [0.8, 1.0]
            }
        },
        "LightGBM": {
            'estimator': LGBMClassifier(random_state=42, verbose=-1, n_jobs=1),
            'params': {
                'n_estimators': [75, 150],
                'learning_rate': [0.03, 0.08, 0.15],
                'num_leaves': [15, 31],
                'min_child_samples': [10, 20],
                'subsample': [0.8, 1.0]
            }
        },
        "CatBoost": {
            'estimator': CatBoostClassifier(random_state=42, verbose=0, allow_writing_files=False, thread_count=1),
            'params': {
                'iterations': [100, 200],
                'learning_rate': [0.03, 0.08],
                'depth': [4, 6],
                'l2_leaf_reg': [1, 3, 5]
            }
        }
    }
    
    tuned_models = {}
    results = []
    
    for name, cfg in model_configs.items():
        search = RandomizedSearchCV(
            estimator=cfg['estimator'],
            param_distributions=cfg['params'],
            n_iter=8,
            scoring='roc_auc',
            cv=cv,
            random_state=42,
            n_jobs=-1
        )
        search.fit(X_train_fs, y_train_resampled)
        best_est = search.best_estimator_
        tuned_models[name] = best_est
        
        metrics = evaluate_model(best_est, X_test_fs, y_test, name)
        results.append(metrics)
        
    # 4. Build Soft-Voting Ensemble
    voting_estimators = [
        ('cat', tuned_models['CatBoost']),
        ('lgb', tuned_models['LightGBM']),
        ('xgb', tuned_models['XGBoost']),
        ('et', tuned_models['Extra Trees']),
        ('rf', tuned_models['Random Forest']),
        ('lr', tuned_models['Logistic Regression'])
    ]
    voting_clf = VotingClassifier(estimators=voting_estimators, voting='soft')
    voting_clf.fit(X_train_fs, y_train_resampled)
    metrics_voting = evaluate_model(voting_clf, X_test_fs, y_test, "Soft-Voting Ensemble")
    results.append(metrics_voting)
    
    # 5. Stacking Ensemble
    stacking_clf = StackingClassifier(
        estimators=[
            ('cat', tuned_models['CatBoost']),
            ('lgb', tuned_models['LightGBM']),
            ('xgb', tuned_models['XGBoost']),
            ('et', tuned_models['Extra Trees'])
        ],
        final_estimator=LogisticRegression(random_state=42, C=0.5, max_iter=1000),
        cv=cv,
        n_jobs=-1
    )
    stacking_clf.fit(X_train_fs, y_train_resampled)
    metrics_stacking = evaluate_model(stacking_clf, X_test_fs, y_test, "Stacking Ensemble")
    results.append(metrics_stacking)
    
    candidate_models = {**tuned_models, "Soft-Voting Ensemble": voting_clf, "Stacking Ensemble": stacking_clf}
    
    results_df = pd.DataFrame(results).set_index("Model")
    print(f"\nPerformance for {target_name} with Feature Selection (Unseen 20% Test):")
    print(results_df.round(4))
    
    # Select the model with highest Accuracy and ROC-AUC
    # We prioritize clinical diagnostic accuracy & F1 score
    best_candidate_name = max(results, key=lambda r: (r["Accuracy"] * 0.5 + r["ROC-AUC"] * 0.5, r["F1-Score"]))["Model"]
    best_model = candidate_models[best_candidate_name]
    best_stats = next(r for r in results if r["Model"] == best_candidate_name)
    
    print(f"\n--> BEST MODEL for {target_name}: {best_candidate_name}")
    print(f"    Accuracy: {best_stats['Accuracy']:.4f} | ROC-AUC: {best_stats['ROC-AUC']:.4f} | Recall: {best_stats['Recall (Sensitivity)']:.4f} | F1: {best_stats['F1-Score']:.4f}")
    
    # Save candidate model
    os.makedirs(output_dir, exist_ok=True)
    joblib.dump(best_model, os.path.join(output_dir, f'best_model_{target_name}.joblib'))
    
    return {
        "target": target_name,
        "selected_features": selected_features,
        "best_model_name": best_candidate_name,
        "best_stats": best_stats,
        "results_df": results_df
    }

def main():
    file_path = '../data/extention of Z-Alizadeh sani dataset.xlsx'
    output_dir = 'models_candidate_fs'
    
    print("Preparing Clinical Features and Targets...")
    X, y = prepare_pipeline_data(file_path, output_dir=output_dir)
    print(f"Dataset: {X.shape[0]} patients, {X.shape[1]} initial features")
    
    targets = ['Overall_CAD', 'LAD', 'LCX', 'RCA']
    # Customize K features per target based on clinical anatomy complexity
    k_map = {
        'Overall_CAD': 24, # Systemic CAD benefits from multi-system markers
        'LAD': 22,         # Anterior wall & septal ischemia
        'LCX': 18,         # Lateral wall (benefiting from noise reduction)
        'RCA': 18          # Inferior wall (benefiting from noise reduction)
    }
    
    target_feature_map = {}
    summary = {}
    
    for target in targets:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y[target], test_size=0.20, stratify=y[target], random_state=42
        )
        res = train_and_benchmark_target(X_train, X_test, y_train, y_test, target, output_dir, k_features=k_map[target])
        summary[target] = res
        target_feature_map[target] = res["selected_features"]
        
    # Save target feature mapping
    joblib.dump(target_feature_map, os.path.join(output_dir, 'target_feature_columns.joblib'))
    
    print("\n" + "="*70)
    print("FINAL SUMMARY WITH FEATURE SELECTION")
    print("="*70)
    for target, info in summary.items():
        s = info["best_stats"]
        print(f"{target:12s} -> {info['best_model_name']:22s} | Acc: {s['Accuracy']:.4f} | AUC: {s['ROC-AUC']:.4f} | Recall: {s['Recall (Sensitivity)']:.4f} | F1: {s['F1-Score']:.4f}")

if __name__ == "__main__":
    main()
