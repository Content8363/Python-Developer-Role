import os
import time
import requests
import argparse
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

def full_scroll_page(page, scroll_pause_time=1000, debug=False):
    """
    Scrolls down the page to the absolute bottom until no new content is loaded.
    This function repeatedly scrolls to the bottom and waits until the page height 
    stops increasing.
    
    :param page: Playwright page object.
    :param scroll_pause_time: Wait time after each scroll in milliseconds.
    :param debug: If True, prints debugging information.
    """
    previous_height = 0
    iteration = 0
    while True:
        current_height = page.evaluate("document.body.scrollHeight")
        if debug:
            print(f"[DEBUG] Iteration {iteration}: Current page height: {current_height}")
        # If no change in height, assume we've reached the bottom
        if current_height == previous_height:
            if debug:
                print("[DEBUG] No change in page height detected. Reached the bottom.")
            break
        previous_height = current_height
        # Scroll to the absolute bottom of the page
        page.evaluate("window.scrollTo(0, document.body.scrollHeight);")
        page.wait_for_timeout(scroll_pause_time)
        iteration += 1

def download_images_from_html(html, base_url, folder, debug=False):
    """
    Parses the HTML for image tags, deduplicates image URLs,
    and downloads each unique image.
    
    :param html: The full HTML content.
    :param base_url: The URL of the page (used to resolve relative URLs).
    :param folder: The folder to save images in.
    :param debug: If True, prints debugging information.
    """
    if not os.path.exists(folder):
        os.makedirs(folder)
        if debug:
            print(f"[DEBUG] Created folder: {folder}")
    
    soup = BeautifulSoup(html, 'html.parser')
    img_tags = soup.find_all('img')
    if debug:
        print(f"[DEBUG] Found {len(img_tags)} <img> tags in the HTML")
    unique_image_urls = set()

    for img in img_tags:
        srcset = img.get('srcset')
        if srcset:
            candidates = [s.strip() for s in srcset.split(',')]
            best_candidate = None
            best_multiplier = 1.0
            for candidate in candidates:
                parts = candidate.split()
                if len(parts) == 2:
                    url_candidate, scale = parts
                    try:
                        multiplier = float(scale.rstrip('x'))
                        if multiplier > best_multiplier:
                            best_candidate = url_candidate
                            best_multiplier = multiplier
                    except ValueError:
                        continue
            if best_candidate:
                full_url = urljoin(base_url, best_candidate)
                if debug:
                    print(f"[DEBUG] Using srcset candidate: {best_candidate} with multiplier {best_multiplier}")
            else:
                full_url = urljoin(base_url, img.get('src'))
                if debug:
                    print(f"[DEBUG] No valid candidate in srcset; using src: {img.get('src')}")
        else:
            src = img.get('src')
            if src:
                full_url = urljoin(base_url, src)
                if debug:
                    print(f"[DEBUG] Using src: {src}")
            else:
                if debug:
                    print("[DEBUG] <img> tag without src; skipping")
                continue
        unique_image_urls.add(full_url)
    
    if debug:
        print(f"[DEBUG] Total unique image URLs extracted: {len(unique_image_urls)}")
    
    for img_url in unique_image_urls:
        parsed_url = urlparse(img_url)
        filename = os.path.basename(parsed_url.path)
        if not filename:
            filename = "image"  # Fallback if no filename is provided
        
        filepath = os.path.join(folder, filename)
        base, ext = os.path.splitext(filename)
        counter = 1
        while os.path.exists(filepath):
            filepath = os.path.join(folder, f"{base}_{counter}{ext}")
            counter += 1
        
        try:
            response = requests.get(img_url, stream=True)
            response.raise_for_status()
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
            if debug:
                print(f"[DEBUG] Downloaded: {img_url} -> {filepath}")
        except Exception as e:
            if debug:
                print(f"[DEBUG] Error downloading {img_url}: {e}")

def count_images_on_page(url, scroll_pause_time=1000, debug=False):
    """
    Loads the page using Playwright, scrolls to the absolute bottom until no new
    content loads, and returns the number of <img> tags found in the rendered HTML.
    
    :param url: The URL of the page to check.
    :param scroll_pause_time: Wait time after each scroll (milliseconds).
    :param debug: If True, prints debugging information.
    :return: Number of image tags found on the page.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Use headful mode to observe the scrolling
        context = browser.new_context()
        page = context.new_page()
        if debug:
            print(f"[DEBUG] Loading page: {url}")
        page.goto(url, wait_until="networkidle", timeout=60000)
        
        if debug:
            print("[DEBUG] Page loaded. Starting full scroll to bottom...")
        full_scroll_page(page, scroll_pause_time=scroll_pause_time, debug=debug)
        
        html = page.content()
        if debug:
            print("[DEBUG] Final HTML content obtained after full scroll.")
        browser.close()
    
    soup = BeautifulSoup(html, 'html.parser')
    img_tags = soup.find_all('img')
    if debug:
        print(f"[DEBUG] Total <img> tags found after full scroll: {len(img_tags)}")
    return len(img_tags)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description="Download images from a dynamically loaded page using Playwright with full scrolling and debugging."
    )
    parser.add_argument("url", help="URL of the page to download images from.")
    parser.add_argument("-f", "--folder", default="images", help="Folder to save the images (default: 'images').")
    parser.add_argument("--scroll-pause", type=int, default=1000, help="Pause time in ms after each scroll (default: 1000).")
    parser.add_argument("--debug", action="store_true", help="Enable debugging output.")
    args = parser.parse_args()

    # Count images on the page after fully scrolling
    image_count = count_images_on_page(args.url, scroll_pause_time=args.scroll_pause, debug=args.debug)
    print(f"Total images found on the page: {image_count}")

    # Optionally, download images by uncommenting the block below:
    # with sync_playwright() as p:
    #     browser = p.chromium.launch(headless=False)
    #     context = browser.new_context()
    #     page = context.new_page()
    #     print(f"[DEBUG] Loading page for download: {args.url}")
    #     page.goto(args.url, wait_until="networkidle", timeout=60000)
    #     full_scroll_page(page, scroll_pause_time=args.scroll_pause, debug=args.debug)
    #     html = page.content()
    #     browser.close()
    # print("Page fully loaded. Extracting and downloading images...")
    # download_images_from_html(html, args.url, args.folder, debug=args.debug)
