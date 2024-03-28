from flask import Flask, render_template, url_for
import bs4
import requests
import re
import time
from flask import request
from math import ceil
from flask import redirect
app = Flask(__name__)

app.debug = True

@app.route('/')
def main_page():
    print("Loading home page")
    return render_template("home.html")

@app.route('/search', methods=['GET'])
def search_redirect():
    return redirect(url_for('load_home', page_number=1))
@app.route('/search/<int:page_number>', methods=['GET'])
def load_home(page_number=1):
    zip = request.args.get('zipCode', default="45036")
    print("App ran")

    def search(url):
        response = requests.get(url)
        response.raise_for_status()
        return response.text

    def load_home(page_number=1):
        final_items = {}
        container_class = "w-full mx-auto"
        soup = bs4.BeautifulSoup(search(f'https://www.bidfta.com/location-zip?miles=25&zipCode={zip}'), 'html.parser')
        auctions = soup.find_all('div', class_=container_class)
        all_items_time_remaining = []
        print(f'Total number of auctions: {len(auctions)}')
        for auction in auctions:
            auction_location_class="flex items-center mb-1"
            auction_location = auction.find('div', class_=auction_location_class)
            auction_location = auction_location.text
            auction_link = auction.find('a', href=True)
            auction_url = auction_link['href']
            auction_number = re.findall(r'\d+', auction_url)
            auction_number = auction_number[0]
            items = requests.get(
                f"https://auction.bidfta.io/api/item/getItemsByAuctionId/{auction_number}?&pageId=1&auctionId={auction_number}")
            items_json = items.json()
            active_items = {}

            for item in items_json:
                time_remaining = item['itemTimeRemaining']
                if int(time_remaining) > 0:
                    id_key = item['id']
                    current_bid_key = item['currentBid']
                    quantity_key = item['quantity']
                    condition_key = item['condition']
                    msrp_key = item['msrp']
                    brand_key = item['brand']
                    title = item['title']
                    next_bid = item['nextBid']
                    time_remaining = item['itemTimeRemaining']
                    time_remaining = int(time_remaining)
                    # time remaining is in seconds, convery to h:m:s
                    time_remaining = time.strftime("%H:%M:%S", time.gmtime(time_remaining))

                    bids_count = item['bidsCount']
                    pictures = item['pictures']
                    item_url = f"https://www.bidfta.com/{auction_number}/item-detail/{id_key}"
                    active_items[id_key] = {'title': title, 'current_bid': current_bid_key, 'quantity': quantity_key,
                                            'condition': condition_key, 'msrp': msrp_key, 'brand': brand_key,
                                            'next_bid': next_bid, 'time_remaining': time_remaining,
                                            'bids_count': bids_count, 'pictures': pictures}
                    all_items_time_remaining.append((item_url,auction_location, title, time_remaining, current_bid_key, next_bid, bids_count,condition_key,pictures))

            final_items[auction_number] = active_items

        all_items_time_remaining = [list(item) for item in all_items_time_remaining]
        ## split items into lists of 50
        items_per_page = 50
        items_lists = [all_items_time_remaining[i:i + items_per_page] for i in
                       range(0, len(all_items_time_remaining), items_per_page)]
        total_pages = ceil(len(all_items_time_remaining) / items_per_page)
        print(f"Total number of items: {len(all_items_time_remaining)}")
        current_page_items = items_lists[page_number - 1]

        return render_template('index.html', items=items_lists, current_page=current_page_items,
                               total_pages=total_pages, page_number=page_number)

    return load_home()

if __name__ == "__main__":
    app.run(debug=True)
