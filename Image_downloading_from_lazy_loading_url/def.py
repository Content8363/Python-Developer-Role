import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import argparse

def download_images(url, folder):
    # Create the folder if it doesn't exist
    if not os.path.exists(folder):
        os.makedirs(folder)
    
    # Load the full page content
    try:
        response = requests.get(url)
        response.raise_for_status()
        print(f"Successfully loaded the page: {url}")
    except Exception as e:
        print(f"Error loading {url}: {e}")
        return
    
    # Parse the HTML content
    soup = BeautifulSoup(response.text, 'html.parser')
    img_tags = soup.find_all('img')
    
    if not img_tags:
        print("No images found on the page.")
        return

    print(f"Found {len(img_tags)} image tag(s) on the page.")

    # Collect unique image URLs
    unique_image_urls = set()
    for img in img_tags:
        src = img.get('src')
        if src:
            full_url = urljoin(url, src)
            unique_image_urls.add(full_url)
    
    print(f"Downloading {len(unique_image_urls)} unique image(s)...")

    for img_url in unique_image_urls:
        # Extract filename from URL
        parsed_url = urlparse(img_url)
        filename = os.path.basename(parsed_url.path)
        if not filename:
            filename = "image"  # default name if no filename found

        filepath = os.path.join(folder, filename)
        base, ext = os.path.splitext(filename)
        counter = 1
        
        # Modify filename if it already exists to avoid overwriting
        while os.path.exists(filepath):
            filepath = os.path.join(folder, f"{base}_{counter}{ext}")
            counter += 1
        
        # Download and save the image
        try:
            img_response = requests.get(img_url, stream=True)
            img_response.raise_for_status()
            with open(filepath, 'wb') as f:
                for chunk in img_response.iter_content(1024):
                    f.write(chunk)
            print(f"Downloaded: {img_url} -> {filepath}")
        except Exception as e:
            print(f"Failed to download {img_url}: {e}")

def main():
    parser = argparse.ArgumentParser(
        description="Load a full page and download each unique image found on it."
    )
    parser.add_argument("url", help="URL of the page to download images from.")
    parser.add_argument("-f", "--folder", default="images", help="Folder to save the images (default: 'images').")
    args = parser.parse_args()

    download_images(args.url, args.folder)

if __name__ == '__main__':
    main()
