import os
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split, RandomizedSearchCV
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from imblearn.over_sampling import SMOTE
import warnings

# Suppress warnings for clean output
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

from preprocess import prepare_pipeline_data

def evaluate_model(model, X_test, y_test, name="Model"):
    """Evaluates the model and returns a dictionary of metrics."""
    preds = model.predict(X_test)
    probs = model.predict_proba(X_test)[:, 1] if hasattr(model, 'predict_proba') else preds
    
    return {
        "Model": name,
        "Accuracy": accuracy_score(y_test, preds),
        "Precision": precision_score(y_test, preds, zero_division=0),
        "Recall": recall_score(y_test, preds, zero_division=0),
        "F1-Score": f1_score(y_test, preds, zero_division=0),
        "ROC-AUC": roc_auc_score(y_test, probs)
    }

def train_and_evaluate_target(X_train, X_test, y_train, y_test, target_name, output_dir):
    """Trains models with SMOTE and Hyperparameter Tuning on a specific target."""
    print(f"\n{'='*50}\nTraining & Tuning Models for Target: {target_name}\n{'='*50}")
    
    # 1. Apply SMOTE to training data ONLY (prevents data leakage into test set)
    # This mathematically balances the healthy vs sick patient ratios for better learning
    smote = SMOTE(random_state=42)
    X_train_resampled, y_train_resampled = smote.fit_resample(X_train, y_train)
    print(f"Original training class distribution:\n{y_train.value_counts().to_dict()}")
    print(f"Resampled training class distribution:\n{y_train_resampled.value_counts().to_dict()}")

    # 2. Define Parameter Grids for RandomizedSearchCV (Hyperparameter Tuning)
    param_grids = {
        "Logistic Regression": {
            'model': LogisticRegression(random_state=42, max_iter=2000),
            'params': {
                'C': [0.01, 0.1, 1, 10, 100],
                'solver': ['liblinear', 'lbfgs']
            }
        },
        "Random Forest": {
            'model': RandomForestClassifier(random_state=42),
            'params': {
                'n_estimators': [50, 100, 200, 300],
                'max_depth': [None, 10, 20, 30],
                'min_samples_split': [2, 5, 10]
            }
        },
        "XGBoost": {
            'model': XGBClassifier(use_label_encoder=False, eval_metric='logloss', random_state=42),
            'params': {
                'n_estimators': [50, 100, 200],
                'learning_rate': [0.01, 0.05, 0.1, 0.2],
                'max_depth': [3, 5, 7]
            }
        },
        "LightGBM": {
            'model': LGBMClassifier(random_state=42, verbose=-1),
            'params': {
                'n_estimators': [50, 100, 200],
                'learning_rate': [0.01, 0.05, 0.1, 0.2],
                'num_leaves': [15, 31, 50]
            }
        }
    }
    
    results = []
    best_auc = -1
    best_model = None
    best_name = ""
    
    for name, config in param_grids.items():
        print(f"Tuning {name}...")
        # Cross-validation hyperparameter search
        search = RandomizedSearchCV(
            estimator=config['model'],
            param_distributions=config['params'],
            n_iter=10, # 10 random combinations per model to keep runtime reasonable
            scoring='roc_auc',
            cv=3,
            random_state=42,
            n_jobs=-1
        )
        
        # Fit on RESAMPLED data
        search.fit(X_train_resampled, y_train_resampled)
        best_tuned_model = search.best_estimator_
        
        # Evaluate on the original TEST data (never resampled)
        metrics = evaluate_model(best_tuned_model, X_test, y_test, name)
        results.append(metrics)
        
        # We optimize for ROC-AUC
        if metrics["ROC-AUC"] > best_auc:
            best_auc = metrics["ROC-AUC"]
            best_model = best_tuned_model
            best_name = name
            
    # Print formatted comparative report
    results_df = pd.DataFrame(results).set_index("Model")
    print("\nPerformance on Unseen Test Set:")
    print(results_df.round(4))
    print(f"\n--> Best Tuned Model for {target_name}: {best_name} (ROC-AUC: {best_auc:.4f})")
    
    # Save best model
    model_path = os.path.join(output_dir, f'best_model_{target_name}.joblib')
    joblib.dump(best_model, model_path)
    print(f"Saved best model to {model_path}")
    
    return best_model

def main():
    file_path = '../data/extention of Z-Alizadeh sani dataset.xlsx'
    output_dir = 'models'
    
    # 1 & 2. Preprocess Data and Engineer Features
    print("Starting Preprocessing & Feature Engineering Phase...")
    X, y = prepare_pipeline_data(file_path, output_dir)
    print(f"Shape of Processed Features (X): {X.shape}")
    print(f"Shape of Multi-Targets (y): {y.shape}")
    
    # 3. Train, Tune & Evaluate for each target
    targets = ['Overall_CAD', 'LAD', 'LCX', 'RCA']
    
    for target in targets:
        # Train/Test split for each target preserving class balance
        X_train, X_test, y_train, y_test = train_test_split(
            X, y[target], test_size=0.20, stratify=y[target], random_state=42
        )
        train_and_evaluate_target(X_train, X_test, y_train, y_test, target, output_dir)
        
if __name__ == "__main__":
    main()
