import os
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, RandomizedSearchCV, StratifiedKFold
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

def evaluate_model(model, X_test, y_test, name="Model"):
    """Evaluates the model on unseen test data and returns clinical metrics."""
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

def train_and_benchmark_target(X_train, X_test, y_train, y_test, target_name, output_dir):
    """
    Benchmarks individual models and builds Soft-Voting and Stacking Ensembles for a target.
    """
    print(f"\n{'='*65}\nBenchmarking Models & Ensembles for: {target_name}\n{'='*65}")
    
    # 1. SMOTE on training data only
    smote = SMOTE(random_state=42)
    X_train_resampled, y_train_resampled = smote.fit_resample(X_train, y_train)
    print(f"Original Training Class Distribution: {y_train.value_counts().to_dict()}")
    print(f"SMOTE Balanced Distribution:         {y_train_resampled.value_counts().to_dict()}")
    
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    
    # 2. Define Candidate Base Models with Clinical Hyperparameter Spaces
    model_configs = {
        "Logistic Regression": {
            'estimator': LogisticRegression(random_state=42, max_iter=2500),
            'params': {
                'C': [0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0],
                'solver': ['liblinear', 'lbfgs']
            }
        },
        "Random Forest": {
            'estimator': RandomForestClassifier(random_state=42),
            'params': {
                'n_estimators': [100, 200, 300],
                'max_depth': [None, 8, 15, 25],
                'min_samples_split': [2, 5, 10],
                'min_samples_leaf': [1, 2, 4]
            }
        },
        "Extra Trees": {
            'estimator': ExtraTreesClassifier(random_state=42),
            'params': {
                'n_estimators': [100, 200, 300],
                'max_depth': [None, 8, 15, 25],
                'min_samples_split': [2, 5],
                'min_samples_leaf': [1, 2]
            }
        },
        "XGBoost": {
            'estimator': XGBClassifier(eval_metric='logloss', random_state=42, n_jobs=1),
            'params': {
                'n_estimators': [75, 150, 250],
                'learning_rate': [0.02, 0.05, 0.1, 0.15],
                'max_depth': [3, 4, 6],
                'subsample': [0.75, 0.9, 1.0],
                'colsample_bytree': [0.75, 0.85, 1.0]
            }
        },
        "LightGBM": {
            'estimator': LGBMClassifier(random_state=42, verbose=-1, n_jobs=1),
            'params': {
                'n_estimators': [75, 150, 250],
                'learning_rate': [0.02, 0.05, 0.1],
                'num_leaves': [15, 31, 45],
                'min_child_samples': [10, 20, 30],
                'subsample': [0.8, 1.0],
                'colsample_bytree': [0.8, 1.0]
            }
        },
        "CatBoost": {
            'estimator': CatBoostClassifier(random_state=42, verbose=0, allow_writing_files=False, thread_count=1),
            'params': {
                'iterations': [100, 200, 300],
                'learning_rate': [0.03, 0.06, 0.1],
                'depth': [4, 6, 8],
                'l2_leaf_reg': [1, 3, 5, 7]
            }
        }
    }
    
    tuned_models = {}
    results = []
    
    # 3. Train and tune each individual model
    for name, cfg in model_configs.items():
        print(f"  --> Tuning {name}...")
        search = RandomizedSearchCV(
            estimator=cfg['estimator'],
            param_distributions=cfg['params'],
            n_iter=10,
            scoring='roc_auc',
            cv=cv,
            random_state=42,
            n_jobs=-1
        )
        search.fit(X_train_resampled, y_train_resampled)
        best_est = search.best_estimator_
        tuned_models[name] = best_est
        
        metrics = evaluate_model(best_est, X_test, y_test, name)
        results.append(metrics)
    
    # 4. Construct Advanced Ensembles
    # Soft Voting Ensemble: Combines top diverse algorithmic paradigms
    # 1 tree/boosting (CatBoost), 1 gradient booster (LightGBM or XGBoost), 1 bagging (ExtraTrees/RF), 1 linear (LogisticRegression)
    voting_estimators = [
        ('cat', tuned_models['CatBoost']),
        ('lgb', tuned_models['LightGBM']),
        ('xgb', tuned_models['XGBoost']),
        ('et', tuned_models['Extra Trees']),
        ('lr', tuned_models['Logistic Regression'])
    ]
    
    voting_clf = VotingClassifier(estimators=voting_estimators, voting='soft')
    voting_clf.fit(X_train_resampled, y_train_resampled)
    metrics_voting = evaluate_model(voting_clf, X_test, y_test, "Soft-Voting Ensemble")
    results.append(metrics_voting)
    
    # Stacking Classifier: Base models output predictions, meta-learner (LogisticRegression) blends them
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
    stacking_clf.fit(X_train_resampled, y_train_resampled)
    metrics_stacking = evaluate_model(stacking_clf, X_test, y_test, "Stacking Ensemble")
    results.append(metrics_stacking)
    
    # Add ensembles to candidates
    candidate_models = {**tuned_models, "Soft-Voting Ensemble": voting_clf, "Stacking Ensemble": stacking_clf}
    
    # 5. Comparative Report
    results_df = pd.DataFrame(results).set_index("Model")
    print("\nModel Performance on Unseen Test Set (20% Hold-out):")
    print(results_df.round(4))
    
    # Pick best model prioritizing ROC-AUC, breaking ties with F1-Score
    best_candidate_name = max(results, key=lambda r: (r["ROC-AUC"], r["F1-Score"]))["Model"]
    best_model = candidate_models[best_candidate_name]
    best_stats = next(r for r in results if r["Model"] == best_candidate_name)
    
    print(f"\n--> TOP PERFORMER for {target_name}: {best_candidate_name}")
    print(f"    ROC-AUC: {best_stats['ROC-AUC']:.4f} | Accuracy: {best_stats['Accuracy']:.4f} | Recall: {best_stats['Recall (Sensitivity)']:.4f} | F1: {best_stats['F1-Score']:.4f}")
    
    # Save candidate model
    os.makedirs(output_dir, exist_ok=True)
    save_path = os.path.join(output_dir, f'best_model_{target_name}.joblib')
    joblib.dump(best_model, save_path)
    
    return {
        "target": target_name,
        "best_model_name": best_candidate_name,
        "best_stats": best_stats,
        "all_results": results_df
    }

def main():
    file_path = '../data/extention of Z-Alizadeh sani dataset.xlsx'
    output_dir = 'models_candidate'
    
    print("Preparing Clinical Features and Targets...")
    X, y = prepare_pipeline_data(file_path, output_dir='models_candidate')
    print(f"Processed Features Matrix: {X.shape[0]} patients, {X.shape[1]} features")
    
    targets = ['Overall_CAD', 'LAD', 'LCX', 'RCA']
    summary = {}
    
    for target in targets:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y[target], test_size=0.20, stratify=y[target], random_state=42
        )
        res = train_and_benchmark_target(X_train, X_test, y_train, y_test, target, output_dir)
        summary[target] = res
        
    print("\n" + "="*70)
    print("FINAL SUMMARY: TOP PERFORMING MODELS PER CLINICAL TARGET")
    print("="*70)
    for target, info in summary.items():
        s = info["best_stats"]
        print(f"{target:12s} -> {info['best_model_name']:22s} | AUC: {s['ROC-AUC']:.4f} | Acc: {s['Accuracy']:.4f} | Recall: {s['Recall (Sensitivity)']:.4f} | F1: {s['F1-Score']:.4f}")
        
if __name__ == "__main__":
    main()
