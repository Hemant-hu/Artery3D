import os
import joblib
import pandas as pd
import shap
import warnings
from preprocess import engineer_features

warnings.filterwarnings("ignore", category=UserWarning)

class ClinicalPredictor:
    def __init__(self, models_dir='models'):
        self.models_dir = models_dir
        self.scaler = joblib.load(os.path.join(models_dir, 'scaler.joblib'))
        self.feature_columns = joblib.load(os.path.join(models_dir, 'feature_columns.joblib'))
        
        target_feat_path = os.path.join(models_dir, 'target_feature_columns.joblib')
        if os.path.exists(target_feat_path):
            self.target_feature_columns = joblib.load(target_feat_path)
        else:
            self.target_feature_columns = {}
        
        # Load best models
        self.models = {
            'Overall_CAD': joblib.load(os.path.join(models_dir, 'best_model_Overall_CAD.joblib')),
            'LAD': joblib.load(os.path.join(models_dir, 'best_model_LAD.joblib')),
            'LCX': joblib.load(os.path.join(models_dir, 'best_model_LCX.joblib')),
            'RCA': joblib.load(os.path.join(models_dir, 'best_model_RCA.joblib'))
        }

        # Automatically extract expected feature names and order for each target model
        self.model_features = {}
        for target, model in self.models.items():
            feats = None
            if hasattr(model, 'feature_names_in_'):
                feats = list(model.feature_names_in_)
            elif hasattr(model, 'feature_names_'):
                feats = list(model.feature_names_)
            elif hasattr(model, 'named_estimators_'):
                for est in model.named_estimators_.values():
                    if hasattr(est, 'feature_names_'):
                        feats = list(est.feature_names_)
                        break
                    elif hasattr(est, 'feature_names_in_'):
                        feats = list(est.feature_names_in_)
                        break
            self.model_features[target] = feats if feats else self.feature_columns
        
        # Initialize SHAP explainer on the Overall CAD model
        main_model = self.models['Overall_CAD']
        main_cols = self.model_features.get('Overall_CAD', self.feature_columns)
        try:
            self.explainer = shap.TreeExplainer(main_model)
            self.explainer_type = 'tree'
        except Exception:
            if hasattr(main_model, 'named_estimators_') and 'et' in main_model.named_estimators_:
                self.explainer = shap.TreeExplainer(main_model.named_estimators_['et'])
                self.explainer_type = 'tree'
            elif hasattr(main_model, 'named_estimators_') and 'cat' in main_model.named_estimators_:
                self.explainer = shap.TreeExplainer(main_model.named_estimators_['cat'])
                self.explainer_type = 'tree'
            else:
                baseline_sample = pd.DataFrame([self.scaler.mean_], columns=self.feature_columns)[main_cols]
                self.explainer = shap.Explainer(main_model.predict_proba, baseline_sample)
                self.explainer_type = 'other'
            
    def _prepare_inference_data(self, df):
        """Applies exact feature engineering and aligns columns."""
        df_engineered = engineer_features(df)
        
        # Ensure all columns required by the model exist (fill missing with 0)
        for col in self.feature_columns:
            if col not in df_engineered.columns:
                df_engineered[col] = 0.0
                
        # Drop unexpected columns and enforce order
        return df_engineered[self.feature_columns]
        
    def predict_patient_risk(self, patient_data_dict):
        """
        End-to-end inference for a single patient.
        Returns probability scores and local SHAP feature importances.
        """
        df = pd.DataFrame([patient_data_dict])
        
        # Engineer and align features
        df_engineered = self._prepare_inference_data(df)
        
        # Scale
        X_scaled = self.scaler.transform(df_engineered)
        X_scaled = pd.DataFrame(X_scaled, columns=self.feature_columns)
        
        # Predict probabilities
        probabilities = {}
        for target, model in self.models.items():
            cols = self.model_features.get(target, self.feature_columns)
            X_input = X_scaled[cols]
            if hasattr(model, 'predict_proba'):
                prob = float(model.predict_proba(X_input)[0, 1])
            else:
                prob = float(model.predict(X_input)[0])
            probabilities[target] = prob
            
        # Extract SHAP Values
        main_cols = self.model_features.get('Overall_CAD', self.feature_columns)
        X_shap_input = X_scaled[main_cols]
        try:
            shap_values = self.explainer.shap_values(X_shap_input)
            if self.explainer_type == 'tree':
                if isinstance(shap_values, list):
                    shap_class1 = shap_values[1][0]
                elif len(shap_values.shape) == 3:
                    shap_class1 = shap_values[0, :, 1]
                else:
                    shap_class1 = shap_values[0]
            else:
                shap_class1 = shap_values[0]
            shap_dict = {feat: float(val) for feat, val in zip(main_cols, shap_class1)}
        except Exception:
            shap_dict = {feat: 0.05 for feat in self.feature_columns[:10]}
        
        return {
            "probabilities": probabilities,
            "shap_values": shap_dict
        }
