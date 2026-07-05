// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState } from 'react';
import './styles/search-filter.css';

export default function SearchFilterBar({ 
  onSearch, 
  onFilter, 
  onSort, 
  searchQuery, 
  filterType, 
  sortBy 
}) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [localFilter, setLocalFilter] = useState(filterType);
  const [localSort, setLocalSort] = useState(sortBy);

  const handleSearch = (e) => {
    const value = e.target.value;
    setLocalSearch(value);
    onSearch(value);
  };

  const handleFilter = (e) => {
    const value = e.target.value;
    setLocalFilter(value);
    onFilter(value);
  };

  const handleSort = (e) => {
    const value = e.target.value;
    setLocalSort(value);
    onSort(value);
  };

  const docTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'contract', label: 'Contract' },
    { value: 'id_card', label: 'ID Card' },
    { value: 'passport', label: 'Passport' },
    { value: 'certificate', label: 'Certificate' },
    { value: 'other', label: 'Other' },
  ];

  const sortOptions = [
    { value: 'date-desc', label: 'Newest First' },
    { value: 'date-asc', label: 'Oldest First' },
    { value: 'name-asc', label: 'Name A-Z' },
    { value: 'name-desc', label: 'Name Z-A' },
    { value: 'type-asc', label: 'Type A-Z' },
    { value: 'type-desc', label: 'Type Z-A' },
  ];

  return (
    <div className="search-filter-bar">
      <div className="search-group">
        <input
          type="text"
          placeholder="Search documents..."
          value={localSearch}
          onChange={handleSearch}
          className="glass-form-control"
        />
        <button className="glass-btn glass-btn-ghost" onClick={() => onSearch('')}>
          Clear
        </button>
      </div>
      
      <div className="filter-group">
        <select 
          value={localFilter} 
          onChange={handleFilter}
          className="glass-form-control"
        >
          {docTypes.map(d => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </div>

      <div className="sort-group">
        <select 
          value={localSort} 
          onChange={handleSort}
          className="glass-form-control"
        >
          {sortOptions.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}