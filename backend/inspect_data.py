import pandas as pd

def inspect_data():
    file_path = "data/extention of Z-Alizadeh sani dataset.xlsx"
    df = pd.read_excel(file_path)
    print("Columns in dataset:")
    print(df.columns.tolist())
    print("\nFirst few rows:")
    print(df.head())

if __name__ == "__main__":
    inspect_data()
