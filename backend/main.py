import asyncio
import json
import logging
import re
import time
from concurrent.futures import ThreadPoolExecutor
from math import ceil
from urllib.parse import quote_plus
import aiohttp
import bs4
from aiohttp import ClientSession
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Set up logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS setup for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this with your React app's URL in production
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

async def async_search(session, url):
    logger.debug(f"Making request to: {url}")
    try:
        async with session.get(url) as response:
            if response.status != 200:
                logger.error(f"Failed request to {url}. Status: {response.status}")
                return None
            return await response.text()
    except Exception as e:
        logger.error(f"Error in async_search: {str(e)}")
        return None

async def fetch_items(session, auction):
    auction_location_class = "flex items-center mb-1"
    auction_location = auction.find('div', class_=auction_location_class).text
    auction_link = auction.find('a', href=True)
    auction_url = auction_link['href']
    auction_number = re.findall(r'\d+', auction_url)[0]
    url = f"https://auction.bidfta.io/api/item/getItemsByAuctionId/{auction_number}?&pageId=1&auctionId={auction_number}"
    return await async_search(session, url), auction_location, auction_number

@app.get("/home/{page_number}")
async def load_home(request: Request, page_number: int, zip: str, skip_pagination: bool = False):
    logger.info(f"Processing API request for zip: {zip}, page: {page_number}, skip_pagination: {skip_pagination}")
    try:
        async with aiohttp.ClientSession() as session:
            container_class = "w-full mx-auto"
            soup = BeautifulSoup(
                await async_search(session, f'https://www.bidfta.com/location-zip?miles=25&zipCode={zip}'), 'html.parser')
            auctions = soup.find_all('div', class_=container_class)
            logger.info(f"Found {len(auctions)} auctions")

            tasks = [fetch_items(session, auction) for auction in auctions]
            responses = await asyncio.gather(*tasks)

        processed_items = []
        for items_json, auction_location, auction_number in responses:
            if not items_json:
                continue
            try:
                items_dict = json.loads(items_json)
                # print first items dict to see what it looks like
                print(items_dict[0])
                for item in items_dict:
                    
                    time_remaining = item['itemTimeRemaining']
                    if int(time_remaining) > 0:
                        amazon_search_url = f"https://www.amazon.com/s?k={quote_plus(item['title'])}"
                        
                        processed_items.append({
                            'title': item['title'],
                            'current_bid': item['currentBid'],
                            'next_bid': item['nextBid'],
                            'time_remaining': time.strftime("%H:%M:%S", time.gmtime(int(time_remaining))),
                            'item_url': f"https://www.bidfta.com/{auction_number}/item-detail/{item['id']}",
                            'location': auction_location,
                            'msrp': item['msrp'],
                            'bids_count': item['bidsCount'],
                            'condition': item['condition'],
                            'pictures': item['pictures'],
                            'amazon_search_url': amazon_search_url,
                            'category1': item['category1'],
                            'category2': item['category2'],
                        })
            except json.JSONDecodeError as e:
                print(f"Error decoding JSON: {e}")
            except Exception as e:
                print(f"Unexpected error processing items: {e}")

        # Always return all items when skip_pagination is True
        if skip_pagination == True:
            logger.info(f"Skipping pagination, returning all {len(processed_items)} items")
            response_data = {
                "items": processed_items,
                "total_items": len(processed_items),
                "total_pages": 1,
                "page_number": 1,
                "first_item": 1,
                "last_item": len(processed_items)
            }
        else:
            # Pagination for normal requests
            items_per_page = 50
            total_items = len(processed_items)
            start_idx = (page_number - 1) * items_per_page
            end_idx = min(page_number * items_per_page, total_items)
            
            logger.info(f"Paginating {total_items} items, returning items {start_idx + 1} to {end_idx}")
            response_data = {
                "items": processed_items[start_idx:end_idx],
                "total_pages": ceil(total_items / items_per_page),
                "page_number": page_number,
                "total_items": total_items,
                "first_item": start_idx + 1,
                "last_item": end_idx
            }
        
        logger.info(f"Returning {len(response_data['items'])} items")
        return JSONResponse(content=response_data)
        
    except Exception as e:
        logger.error(f"Error in load_home: {str(e)}")
        return JSONResponse(
            content={"error": f"Failed to fetch auction data: {str(e)}"},
            status_code=500
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="debug")