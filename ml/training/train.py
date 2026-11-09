import os
import json
import pickle
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report
)

def train_and_export(
    processed_dir: str = "ml/dataset/processed",
    models_dir: str = "ml/models",
    public_dir: str = "public",
    max_features: int = 5000,
    c_val: float = 1.0,
    random_state: int = 42
):
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(public_dir, exist_ok=True)

    print("Loading datasets...")
    train_df = pd.read_csv(os.path.join(processed_dir, "train.csv"))
    val_df = pd.read_csv(os.path.join(processed_dir, "val.csv"))
    test_df = pd.read_csv(os.path.join(processed_dir, "test.csv"))

    for df in [train_df, val_df, test_df]:
        df['text'] = df['text'].fillna("")
        df['clean_title'] = df['clean_title'].fillna("")

    print(f"Training set: {len(train_df)} samples")
    print(f"Validation set: {len(val_df)} samples")
    print(f"Test set: {len(test_df)} samples")

    # 1. Feature Extraction: TF-IDF
    print(f"\nVectorizing with TF-IDF (max_features={max_features}, ngram_range=(1, 2))...")
    vectorizer = TfidfVectorizer(
        max_features=max_features,
        min_df=2,
        ngram_range=(1, 2),
        sublinear_tf=True
    )
    X_train = vectorizer.fit_transform(train_df['text'])
    y_train = train_df['Class'].values

    X_val = vectorizer.transform(val_df['text'])
    y_val = val_df['Class'].values

    X_test = vectorizer.transform(test_df['text'])
    y_test = test_df['Class'].values

    # 2. Train Logistic Regression
    print(f"Training Logistic Regression (C={c_val}, class_weight='balanced')...")
    clf = LogisticRegression(
        C=c_val,
        max_iter=1000,
        class_weight='balanced',
        random_state=random_state
    )
    clf.fit(X_train, y_train)

    # 3. Evaluation on Validation Set
    y_val_pred = clf.predict(X_val)
    y_val_prob = clf.predict_proba(X_val)[:, 1]

    val_acc = accuracy_score(y_val, y_val_pred)
    val_prec = precision_score(y_val, y_val_pred)
    val_rec = recall_score(y_val, y_val_pred)
    val_f1 = f1_score(y_val, y_val_pred)
    val_auc = roc_auc_score(y_val, y_val_prob)

    print("\n" + "="*50)
    print("VALIDATION SET RESULTS (Full Text: Title + Desc + Tags)")
    print(f"Accuracy:  {val_acc:.4f}")
    print(f"Precision: {val_prec:.4f}")
    print(f"Recall:    {val_rec:.4f}")
    print(f"F1-Score:  {val_f1:.4f}")
    print(f"ROC-AUC:   {val_auc:.4f}")
    print("\nConfusion Matrix:\n", confusion_matrix(y_val, y_val_pred))

    # 4. Evaluation on Test Set
    y_test_pred = clf.predict(X_test)
    y_test_prob = clf.predict_proba(X_test)[:, 1]

    test_acc = accuracy_score(y_test, y_test_pred)
    test_prec = precision_score(y_test, y_test_pred)
    test_rec = recall_score(y_test, y_test_pred)
    test_f1 = f1_score(y_test, y_test_pred)
    test_auc = roc_auc_score(y_test, y_test_prob)

    print("\n" + "="*50)
    print("TEST SET RESULTS (Full Text)")
    print(f"Accuracy:  {test_acc:.4f}")
    print(f"Precision: {test_prec:.4f}")
    print(f"Recall:    {test_rec:.4f}")
    print(f"F1-Score:  {test_f1:.4f}")
    print(f"ROC-AUC:   {test_auc:.4f}")
    print("\nClassification Report:\n", classification_report(y_test, y_test_pred, target_names=["Non-Educational", "Educational"]))
    print("Confusion Matrix:\n", confusion_matrix(y_test, y_test_pred))

    # Also evaluate on Title Only (simulate scenarios where descriptions aren't visible)
    X_test_title = vectorizer.transform(test_df['clean_title'])
    y_test_title_pred = clf.predict(X_test_title)
    title_acc = accuracy_score(y_test, y_test_title_pred)
    title_f1 = f1_score(y_test, y_test_title_pred)
    print(f"\nTEST SET (Title Only): Accuracy = {title_acc:.4f}, F1-Score = {title_f1:.4f}")

    # Top Features
    feature_names = np.array(vectorizer.get_feature_names_out())
    coefs = clf.coef_[0]
    top_pos_idx = np.argsort(coefs)[-15:][::-1]
    top_neg_idx = np.argsort(coefs)[:15]

    print("\nTop 15 Indicative Educational Features:")
    for idx in top_pos_idx:
        print(f"  + {feature_names[idx]}: {coefs[idx]:.3f}")

    print("\nTop 15 Indicative Non-Educational (Distracting) Features:")
    for idx in top_neg_idx:
        print(f"  - {feature_names[idx]}: {coefs[idx]:.3f}")

    # 5. Export Python Pickle
    pkl_path = os.path.join(models_dir, "model_pipeline.pkl")
    with open(pkl_path, "wb") as f:
        pickle.dump({"vectorizer": vectorizer, "classifier": clf}, f)
    print(f"\nSaved Python pipeline to {pkl_path}")

    # 6. Export Lightweight JSON for Browser Extension Local Inference
    # Model structure:
    # {
    #   "version": "1.0",
    #   "vocabulary": { word: index },
    #   "idf": [ ... ],
    #   "weights": [ ... ],
    #   "intercept": float,
    #   "threshold": 0.5
    # }
    vocab = {str(k): int(v) for k, v in vectorizer.vocabulary_.items()}
    idf = [float(x) for x in vectorizer.idf_]
    weights = [float(x) for x in clf.coef_[0]]
    intercept = float(clf.intercept_[0])

    model_json = {
        "version": "1.0.0",
        "model_type": "TF-IDF + Logistic Regression",
        "threshold": 0.5,
        "intercept": intercept,
        "vocabulary": vocab,
        "idf": idf,
        "weights": weights,
        "metrics": {
            "test_accuracy": float(test_acc),
            "test_f1": float(test_f1),
            "test_precision": float(test_prec),
            "test_recall": float(test_rec),
            "test_auc": float(test_auc),
        }
    }

    # Save to ml/models/model_weights.json
    json_path = os.path.join(models_dir, "model_weights.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(model_json, f, indent=2)
    print(f"Saved JSON weights to {json_path} (Size: {os.path.getsize(json_path) / 1024:.1f} KB)")

    # Also copy to public/model.json for extension bundle
    pub_json_path = os.path.join(public_dir, "model.json")
    with open(pub_json_path, "w", encoding="utf-8") as f:
        json.dump(model_json, f)
    print(f"Exported browser model to {pub_json_path} (Size: {os.path.getsize(pub_json_path) / 1024:.1f} KB)")

    return model_json

if __name__ == "__main__":
    train_and_export()

