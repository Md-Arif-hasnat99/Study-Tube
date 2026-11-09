import os
import re
import pandas as pd
from sklearn.model_selection import train_test_split

def clean_text(text: str) -> str:
    """Normalize text: lowercasing, whitespace cleanup, removing noisy URLs & special chars."""
    if not isinstance(text, str):
        return ""
    text = text.lower()
    # Remove URLs
    text = re.sub(r'https?://\S+|www\.\S+', ' ', text)
    # Remove html entities / non-alphanumeric noise but keep words
    text = re.sub(r'[^\w\s]', ' ', text)
    # Collapse extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def preprocess_dataset(
    raw_path: str = "ml/dataset/raw/Data_final.csv",
    output_dir: str = "ml/dataset/processed",
    test_size: float = 0.15,
    val_size: float = 0.15,
    random_state: int = 42
):
    print(f"Reading raw data from {raw_path}...")
    df = pd.read_csv(raw_path)
    df.columns = df.columns.str.strip()

    initial_count = len(df)
    print(f"Initial raw rows: {initial_count}")

    # Drop duplicates
    if 'Video ID' in df.columns:
        df = df.drop_duplicates(subset=['Video ID'])
    if 'Title' in df.columns:
        df = df.drop_duplicates(subset=['Title'])
    print(f"Rows after deduplication: {len(df)} (dropped {initial_count - len(df)})")

    # Fill NA text
    for col in ['Title', 'Description1', 'Description2', 'Description3', 'Tags']:
        if col in df.columns:
            df[col] = df[col].fillna("")

    # Create cleaned features
    df['clean_title'] = df['Title'].apply(clean_text)
    
    # Combined textual representation
    def combine_fields(row):
        parts = [
            row['Title'],
            row.get('Description1', ''),
            row.get('Description2', ''),
            row.get('Description3', ''),
            row.get('Tags', '')
        ]
        return clean_text(" ".join(str(p) for p in parts if p))

    df['text'] = df.apply(combine_fields, axis=1)

    # Filter out empty texts
    df = df[df['text'].str.len() > 5].copy()
    print(f"Rows after dropping empty texts: {len(df)}")

    # Target class distribution
    class_dist = df['Class'].value_counts().to_dict()
    print(f"Class distribution: {class_dist}")

    # Stratified split: Train (70%), Val (15%), Test (15%)
    os.makedirs(output_dir, exist_ok=True)
    
    # First split off test set
    train_val_df, test_df = train_test_split(
        df,
        test_size=test_size,
        stratify=df['Class'],
        random_state=random_state
    )

    # Then split train and validation
    relative_val_size = val_size / (1.0 - test_size)
    train_df, val_df = train_test_split(
        train_val_df,
        test_size=relative_val_size,
        stratify=train_val_df['Class'],
        random_state=random_state
    )

    print(f"Split sizes - Train: {len(train_df)}, Val: {len(val_df)}, Test: {len(test_df)}")

    # Save to disk
    train_path = os.path.join(output_dir, "train.csv")
    val_path = os.path.join(output_dir, "val.csv")
    test_path = os.path.join(output_dir, "test.csv")

    cols_to_save = ['Video ID', 'Title', 'clean_title', 'text', 'Class']
    train_df[cols_to_save].to_csv(train_path, index=False)
    val_df[cols_to_save].to_csv(val_path, index=False)
    test_df[cols_to_save].to_csv(test_path, index=False)

    print(f"Saved processed splits to {output_dir}")

if __name__ == "__main__":
    preprocess_dataset()

