import gradio as gr
import pandas as pd
import requests
from bs4 import BeautifulSoup
import os

def normalize(text):
    return text.strip().lower().replace(" ", "-")

def extract_city_from_name(name):
    if " in " in name:
        return name.split(" in ")[-1].strip()
    return ""

def fetch_embassy_details(url):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        response = requests.get(url, headers=headers, timeout=20)
        response.raise_for_status()
    except:
        return {"Address": "Error", "Phone": "Error", "Fax": "Error", "Email": "Error",
                "Website": "Error", "Office Hours": "Error", "Current Time Local": "Error",
                "Current Time Home": "Error", "Services": "Error"}

    soup = BeautifulSoup(response.text, "html.parser")
    details = {
        "Address": "", "Phone": "", "Fax": "", "Email": "",
        "Website": "", "Office Hours": "", "Current Time Local": "",
        "Current Time Home": "", "Services": []
    }

    table = soup.find("table", class_="tb5")
    if table:
        for row in table.find_all("tr"):
            cols = row.find_all("td")
            if len(cols) == 2:
                label = cols[0].text.strip().lower()
                value = cols[1].text.strip()
                if "address" in label:
                    details["Address"] = value
                elif "phone" in label:
                    details["Phone"] = value
                elif "fax" in label:
                    details["Fax"] = value
                elif "email" in label:
                    details["Email"] = value
                elif "website" in label:
                    details["Website"] = value
                elif "office hours" in label:
                    details["Office Hours"] = value
                elif "current time in" in label and "saudi arabia" in label.lower():
                    details["Current Time Home"] = value
                elif "current time in" in label:
                    details["Current Time Local"] = value

    services_list = soup.find("div", class_="s14_c")
    if services_list:
        items = services_list.find_all("li")
        details["Services"] = [li.text.strip() for li in items]

    return details

def generate_embassy_urls_and_scrape(file):
    df = pd.read_excel(file.name)
    urls, details_list = [], []

    for _, row in df.iterrows():
        name = row['name']
        of_country = normalize(row['of_cn'])
        in_country = normalize(row['in_cn'])
        city = normalize(extract_city_from_name(row['name']))
        url = f"https://embassies.net/{of_country}-in-{in_country}/{city}" if of_country and in_country and city else "Invalid data"
        urls.append(url)
        details = fetch_embassy_details(url) if "Invalid" not in url else {
            "Address": "Invalid", "Phone": "Invalid", "Fax": "Invalid",
            "Email": "Invalid", "Website": "Invalid", "Office Hours": "Invalid",
            "Current Time Local": "Invalid", "Current Time Home": "Invalid",
            "Services": "Invalid"
        }
        details_list.append(details)

    details_df = pd.DataFrame(details_list)
    df['Embassy_URL'] = urls
    df = pd.concat([df, details_df], axis=1)

    output_path = "emb_datas (4).xlsx"
    df.to_excel(output_path, index=False)
    return output_path

gr.Interface(
    fn=generate_embassy_urls_and_scrape,
    inputs=gr.File(label="Upload Excel File"),
    outputs=gr.File(label="Download Embassy Excel"),
    title="Embassy Scraper",
    description="Upload an Excel file with embassy names to get full contact info scraped from embassies.net"
).launch(share=True)
