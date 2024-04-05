import asyncio
import json
import logging
import re
import time
from concurrent.futures import ThreadPoolExecutor
from math import ceil
import bs4
from aiohttp import ClientSession
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

logging.basicConfig(level=logging.DEBUG)
app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

async def async_search(session, url):
    async with session.get(url) as response:
        if response.status != 200:
            logging.debug(f'Response status code is not 200 for url {url}')
            return None
        return await response.text()

async def fetch_items(session, auction):
    auction_location_class = "flex items-center mb-1"
    auction_location = auction.find('div', class_=auction_location_class).text
    auction_link = auction.find('a', href=True)
    auction_url = auction_link['href']
    auction_number = re.findall(r'\d+', auction_url)[0]
    url = f"https://auction.bidfta.io/api/item/getItemsByAuctionId/{auction_number}?&pageId=1&auctionId={auction_number}"
    logging.debug(f'Adding task for url {url}')
    return await async_search(session, url), auction_location, auction_number

@app.get("/")
async def main_page(request: Request):
    return templates.TemplateResponse("home.html", {"request": request})

@app.get("/search")
async def search_redirect():
    return RedirectResponse(url=app.url_path_for("load_home", page_number=1))

@app.get("/search/{page_number}", response_class=HTMLResponse)
async def load_home(request: Request, page_number: int = 1, zip: int = 45036):
    zip = request.query_params.get('zipCode', default="45036")
    container_class = "w-full mx-auto"
    soup = bs4.BeautifulSoup(await async_search(ClientSession(), f'https://www.bidfta.com/location-zip?miles=25&zipCode={zip}'), 'html.parser')
    auctions = soup.find_all('div', class_=container_class)
    logging.debug(f'Total number of auctions: {len(auctions)}')

    async with ClientSession() as session:
        tasks = [fetch_items(session, auction) for auction in auctions]
        responses = await asyncio.gather(*tasks)

    all_items_time_remaining = []
    for items_json, auction_location, auction_number in responses:
        if not items_json:
            continue
        active_items = {}
        items_dict = json.loads(items_json)
        print(items_dict[0])
        for item in items_dict:
            time_remaining = item['itemTimeRemaining']
            if int(time_remaining) > 0:
                id_key = item['id']
                active_items[id_key] = {
                    'title': item['title'],
                    'current_bid': item['currentBid'],
                    'quantity': item['quantity'],
                    'condition': item['condition'],
                    'msrp': item['msrp'],
                    'brand': item['brand'],
                    'next_bid': item['nextBid'],
                    'time_remaining': time.strftime("%H:%M:%S", time.gmtime(int(time_remaining))),
                    'bids_count': item['bidsCount'],
                    'pictures': item['pictures'],
                    'item_url': f"https://www.bidfta.com/{auction_number}/item-detail/{id_key}"
                }
                # Construct Amazon search URL with the item's name
                search_query = "+".join(item['title'].split())  # Replace spaces with "+"
                amazon_search_url = f"https://www.amazon.com/s?k={search_query}"
                print(amazon_search_url)
                # Add Amazon search URL to active_items
                active_items[id_key]['amazon_search_link'] = amazon_search_url
                all_items_time_remaining.append((
                    active_items[id_key]['item_url'],
                    auction_location,
                    active_items[id_key]['title'],
                    active_items[id_key]['time_remaining'],
                    active_items[id_key]['current_bid'],
                    active_items[id_key]['next_bid'],
                    active_items[id_key]['msrp'],
                    active_items[id_key]['bids_count'],
                    active_items[id_key]['condition'],
                    active_items[id_key]['pictures']
                    , active_items[id_key]['amazon_search_link']
                ))

    all_items_time_remaining = [list(item) for item in all_items_time_remaining]
    items_per_page = 50
    items_lists = [all_items_time_remaining[i:i + items_per_page] for i in range(0, len(all_items_time_remaining), items_per_page)]
    total_pages = ceil(len(all_items_time_remaining) / items_per_page)
    total_items = len(all_items_time_remaining)
    current_page_items = items_lists[page_number - 1]
    first_item = (page_number - 1) * items_per_page + 1
    last_item = min(page_number * items_per_page, total_items)
    # Modify the context passed to the template
    context = {
        "request": request,
        "items": items_lists,
        "current_page": current_page_items,
        "total_pages": total_pages,
        "page_number": page_number,
        "first_item": first_item,
        "last_item": last_item,
        "total_items": total_items
    }
    return templates.TemplateResponse('index.html', context)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
