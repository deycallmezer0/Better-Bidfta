import React, { useMemo } from 'react';
import { MapPin, X } from 'lucide-react';
import _ from 'lodash';

const LocationFilter = ({ allLocations, selectedLocations, onLocationChange }) => {
  // Sort locations alphabetically
  const sortedLocations = useMemo(() => {
    return [...allLocations].sort();
  }, [allLocations]);

  const toggleLocation = (location) => {
    if (selectedLocations.includes(location)) {
      onLocationChange(selectedLocations.filter(loc => loc !== location));
    } else {
      onLocationChange([...selectedLocations, location]);
    }
  };

  if (!sortedLocations.length) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center mb-4">
        <MapPin className="h-5 w-5 text-gray-500 mr-2" />
        <h2 className="text-lg font-semibold text-gray-900">Filter by Location</h2>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {selectedLocations.map(location => (
          <button
            key={location}
            onClick={() => toggleLocation(location)}
            className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200"
          >
            {location}
            <X className="h-4 w-4 ml-2" />
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {sortedLocations.map(location => (
          <button
            key={location}
            onClick={() => toggleLocation(location)}
            className={`px-4 py-2 rounded-lg text-left hover:bg-gray-50 ${
              selectedLocations.includes(location)
                ? 'bg-blue-50 text-blue-800 border-2 border-blue-200'
                : 'bg-white border border-gray-200'
            }`}
          >
            {location}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LocationFilter;