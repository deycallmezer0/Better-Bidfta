import React, { useMemo, useState } from 'react';
import { Tags, ChevronRight, X, ChevronDown } from 'lucide-react';
import _ from 'lodash';

const CategoryFilter = ({ 
  allCategories, 
  selectedCategories,
  onCategoryChange 
}) => {
  const [expandedCategory, setExpandedCategory] = useState(null);

  // Organize categories into a hierarchical structure and track counts
  const categoryHierarchy = useMemo(() => {
    const hierarchy = {};
    const counts = {};
    
    allCategories.forEach(({ category1, category2 }) => {
      // Initialize or increment main category count
      counts[category1] = (counts[category1] || 0) + 1;
      
      if (!hierarchy[category1]) {
        hierarchy[category1] = {
          subCategories: new Set(),
          subCategoryCounts: {}
        };
      }
      
      if (category2) {
        hierarchy[category1].subCategories.add(category2);
        // Track subcategory counts
        hierarchy[category1].subCategoryCounts[category2] = 
          (hierarchy[category1].subCategoryCounts[category2] || 0) + 1;
      }
    });

    // Convert Sets to sorted arrays and include counts
    return Object.entries(hierarchy).sort().reduce((acc, [cat1, data]) => {
      acc[cat1] = {
        count: counts[cat1],
        subCategories: Array.from(data.subCategories).sort(),
        subCategoryCounts: data.subCategoryCounts
      };
      return acc;
    }, {});
  }, [allCategories]);

  const toggleMainCategory = (category) => {
    const isSelected = selectedCategories.some(cat => cat.main === category);
    let newCategories;

    if (isSelected) {
      // Remove main category and all its subcategories
      newCategories = selectedCategories.filter(cat => cat.main !== category);
    } else {
      // Add main category with no specific subcategory
      newCategories = [...selectedCategories, { main: category, sub: null }];
    }
    onCategoryChange(newCategories);
  };

  const toggleSubCategory = (mainCategory, subCategory) => {
    const existingEntry = selectedCategories.find(
      cat => cat.main === mainCategory && cat.sub === subCategory
    );

    let newCategories;
    if (existingEntry) {
      newCategories = selectedCategories.filter(cat => 
        !(cat.main === mainCategory && cat.sub === subCategory)
      );
    } else {
      newCategories = [...selectedCategories, { main: mainCategory, sub: subCategory }];
    }
    onCategoryChange(newCategories);
  };

  const isMainCategorySelected = (category) => {
    return selectedCategories.some(cat => cat.main === category);
  };

  const isSubCategorySelected = (mainCategory, subCategory) => {
    return selectedCategories.some(
      cat => cat.main === mainCategory && cat.sub === subCategory
    );
  };

  const handleCategoryClick = (category) => {
    if (expandedCategory === category) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(category);
    }
  };

  if (!Object.keys(categoryHierarchy).length) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center mb-4">
        <Tags className="h-5 w-5 text-gray-500 mr-2" />
        <h2 className="text-lg font-semibold text-gray-900">Filter by Category</h2>
      </div>

      {/* Selected Categories */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedCategories.map(({ main, sub }) => (
            <button
              key={`${main}-${sub}`}
              onClick={() => sub ? toggleSubCategory(main, sub) : toggleMainCategory(main)}
              className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200"
            >
              {main}{sub && <ChevronRight className="h-4 w-4 mx-1" />}{sub}
              <X className="h-4 w-4 ml-2" />
            </button>
          ))}
        </div>
      )}

      {/* Category Selection - Compact Layout */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {Object.entries(categoryHierarchy).map(([mainCategory, categoryData]) => (
          <div key={mainCategory} className="relative">
            <button
              onClick={() => handleCategoryClick(mainCategory)}
              className={`w-full px-3 py-2 text-left border rounded-lg flex justify-between items-center ${
                isMainCategorySelected(mainCategory)
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center">
                  <span className="truncate mr-2">{mainCategory}</span>
                  <span className="text-sm text-gray-500">({categoryData.count})</span>
                </div>
              </div>
              <ChevronDown 
                className={`h-4 w-4 transition-transform flex-shrink-0 ${
                  expandedCategory === mainCategory ? 'transform rotate-180' : ''
                }`}
              />
            </button>
            
            {/* Subcategories Dropdown */}
            {expandedCategory === mainCategory && categoryData.subCategories.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                {categoryData.subCategories.map(subCategory => (
                  <button
                    key={subCategory}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSubCategory(mainCategory, subCategory);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex justify-between items-center ${
                      isSubCategorySelected(mainCategory, subCategory)
                        ? 'text-blue-800 bg-blue-50'
                        : 'text-gray-700'
                    }`}
                  >
                    <span className="truncate mr-2">{subCategory}</span>
                    <span className="text-sm text-gray-500">({categoryData.subCategoryCounts[subCategory]})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryFilter;