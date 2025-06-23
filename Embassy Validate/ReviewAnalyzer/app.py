import gradio as gr
import pandas as pd
from app import get_newest_review_date


def run_review_analysis(file):
    df = pd.read_excel(file.name)

    address_cols = [col for col in df.columns if col.startswith("Matched Address")]
    for col in address_cols:
        review_col = col.replace("Matched Address", "Review Date")
        if review_col not in df.columns:
            df[review_col] = ""

    for idx, row in df.iterrows():
        name = row.get("name", "").strip()
        if not name:
            continue
        print(f"\n📄 Processing row {idx + 1}: {name}")
        for addr_col in address_cols:
            address = row.get(addr_col, "")
            if pd.isna(address) or not str(address).strip():
                continue
            search_query = f"{name} {address}"
            review_date = get_newest_review_date(search_query)
            review_col = addr_col.replace("Matched Address", "Review Date")
            df.at[idx, review_col] = review_date
            print(f"✅ {addr_col} → {review_date}")

    output_path = "final_review_filled.xlsx"
    df.to_excel(output_path, index=False)
    return output_path


iface = gr.Interface(
    fn=run_review_analysis,
    inputs=gr.File(label="Upload Excel File with Embassy Addresses (.xlsx)"),
    outputs=gr.File(label="Download File with Review Dates"),
    title="📅 Embassy Review Date Extractor",
    description="Upload an Excel file containing embassy names and matched addresses. This tool fetches the newest Google review date for each embassy based on matched address columns."
)

if __name__ == "__main__":
    iface.launch()
