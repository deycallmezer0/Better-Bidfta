import React, { useState } from 'react';
import { Search, Clock, DollarSign, ExternalLink, MapPin, Tag, ShoppingCart, Activity, ChevronLeft, ChevronRight } from 'lucide-react';

const App = () => {
  const [zipCode, setZipCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [auctionData, setAuctionData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchAuctionData = async (page) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/home/${page}?zip=${zipCode}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch auction data');
      setAuctionData(data);
      setCurrentPage(page);
    } catch (error) {
      setError('Failed to fetch auction data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
    await fetchAuctionData(1);
  };

  const handlePageChange = async (newPage) => {
    if (newPage < 1 || (auctionData && newPage > auctionData.total_pages)) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await fetchAuctionData(newPage);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  // Pagination component
  const Pagination = () => {
    if (!auctionData || auctionData.total_pages <= 1) return null;

    return (
      <div className="flex justify-center items-center space-x-4 mt-8 mb-12">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          Previous
        </button>
        
        <span className="text-gray-600">
          Page {currentPage} of {auctionData.total_pages}
        </span>
        
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === auctionData.total_pages}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="h-5 w-5 ml-1" />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Auction Search
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Find local auctions and great deals in your area
          </p>
        </div>

        {/* Search Form */}
        <div className="max-w-xl mx-auto mb-12">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="Enter ZIP code"
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search Auctions'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-center">{error}</p>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        )}

        {/* Results */}
        {auctionData && auctionData.items && (
          <>
            <div className="text-center mb-8">
              <p className="text-gray-600">
                Showing items {auctionData.first_item} - {auctionData.last_item} of {auctionData.total_items}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {auctionData.items.map((item, index) => (
                <div key={index} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                  {item.pictures && item.pictures.length > 0 && (
                    <div className="w-full h-48 overflow-hidden">
                      <img
                        src={item.pictures[0]}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 line-clamp-2">
                      {item.title}
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center text-gray-700">
                        <MapPin className="h-5 w-5 text-gray-500 mr-2" />
                        <span className="text-sm">{item.location}</span>
                      </div>

                      <div className="flex items-center text-gray-700">
                        <DollarSign className="h-5 w-5 text-green-600 mr-2" />
                        <span className="font-medium">Current Bid: </span>
                        <span className="ml-2">{formatCurrency(item.current_bid)}</span>
                      </div>

                      <div className="flex items-center text-gray-700">
                        <Tag className="h-5 w-5 text-purple-600 mr-2" />
                        <span className="font-medium">Next Bid: </span>
                        <span className="ml-2">{formatCurrency(item.next_bid)}</span>
                      </div>

                      <div className="flex items-center text-gray-700">
                        <ShoppingCart className="h-5 w-5 text-blue-600 mr-2" />
                        <span className="font-medium">MSRP: </span>
                        <span className="ml-2">{formatCurrency(item.msrp)}</span>
                      </div>
                      
                      <div className="flex items-center text-gray-700">
                        <Clock className="h-5 w-5 text-orange-600 mr-2" />
                        <span className="font-medium">Time Left: </span>
                        <span className="ml-2">{item.time_remaining}</span>
                      </div>

                      <div className="flex items-center text-gray-700">
                        <Activity className="h-5 w-5 text-indigo-600 mr-2" />
                        <span className="font-medium">Bids: </span>
                        <span className="ml-2">{item.bids_count}</span>
                      </div>

                      <div className="flex items-center text-gray-700">
                        <span className="font-medium mr-2">Condition: </span>
                        <span className="px-2 py-1 text-sm rounded-full bg-gray-100">
                          {item.condition}
                        </span>
                      </div>
                      
                      <a
                        href={item.item_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium mt-4"
                      >
                        View Details
                        <ExternalLink className="h-4 w-4 ml-1" />
                      </a>
                      <a
                        href={item.amazon_search_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium mt-2"
                      >
                        Search on Amazon
                        <ExternalLink className="h-4 w-4 ml-1" />
                      </a>
                      
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <Pagination />
          </>
        )}
      </div>
    </div>
  );
};

export default App;