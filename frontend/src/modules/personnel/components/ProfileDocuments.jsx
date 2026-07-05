// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useRef, useEffect } from 'react';
import hrApi from '../../../shared/api/hrApi';
import DocumentPreviewModal from './DocumentPreviewModal';
import SearchFilterBar from './SearchFilterBar';
import DocumentCard from './DocumentCard';
import EnhancedUploadComponent from './EnhancedUploadComponent';
import '../styles/documents.css';

export default function ProfileDocuments({ profile, onUpdate }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [previewDocument, setPreviewDocument] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleUploadComplete = () => {
    onUpdate();
  };

  useEffect(() => {
    // Load documents when component mounts or when search/filter changes
    const loadDocuments = async () => {
      setLoading(true);
      try {
        let url = '/my-documents';
        const params = [];
        
        if (searchQuery || filterType !== 'all' || sortBy !== 'date-desc') {
          url = '/my-documents/search';
          if (searchQuery) params.push(`query=${encodeURIComponent(searchQuery)}`);
          if (filterType !== 'all') params.push(`type=${filterType}`);
          if (sortBy !== 'date-desc') {
            const [sortField, sortOrder] = sortBy.split('-');
            params.push(`sortBy=${sortField}`);
            params.push(`sortOrder=${sortOrder}`);
          }
        }
        
        const response = await hrApi.get(url, params.length > 0 ? { params } : {});
        setDocuments(response.data);
      } catch (error) {
        console.error('Error loading documents:', error);
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [searchQuery, filterType, sortBy, profile.id]);

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleFilter = (type) => {
    setFilterType(type);
  };

  const handleSort = (sort) => {
    setSortBy(sort);
  };

  const handlePreview = (document) => {
    setPreviewDocument(document);
    setIsPreviewOpen(true);
  };

  const handleDelete = async (docId) => {
    if (!confirm('Delete this document?')) return;
    await hrApi.delete(`/employees/${profile.id}/documents/${docId}`);
    setDocuments(documents.filter(d => d.id !== docId));
    onUpdate();
  };

  const getFilteredAndSortedDocuments = () => {
    let filtered = documents;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(doc => 
        doc.doc_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by document type
    if (filterType !== 'all') {
      filtered = filtered.filter(doc => doc.doc_type === filterType);
    }

    // Sort documents
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'date-asc':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'name-asc':
          return a.doc_name.localeCompare(b.doc_name);
        case 'name-desc':
          return b.doc_name.localeCompare(a.doc_name);
        case 'type-asc':
          return a.doc_type.localeCompare(b.doc_type);
        case 'type-desc':
          return b.doc_type.localeCompare(a.doc_type);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredDocuments = getFilteredAndSortedDocuments();

  return (
    <div className="glass-card">
      <div className="glass-card-header">
        <h3>Documents</h3>
        <span className="document-count">{filteredDocuments.length} documents</span>
      </div>
      <div className="glass-card-body">
        <SearchFilterBar 
          onSearch={handleSearch}
          onFilter={handleFilter}
          onSort={handleSort}
          searchQuery={searchQuery}
          filterType={filterType}
          sortBy={sortBy}
        />

        <EnhancedUploadComponent profile={profile} onUploadComplete={handleUploadComplete} />

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner">Loading documents...</div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="no-documents">
            <div className="no-documents-icon">📁</div>
            <p>No documents found.</p>
            {searchQuery && <p>Try adjusting your search or filters.</p>}
          </div>
        ) : (
          <div className="documents-grid">
            {filteredDocuments.map(d => (
              <DocumentCard 
                key={d.id} 
                document={d} 
                onPreview={handlePreview}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <DocumentPreviewModal 
        document={previewDocument}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
}
