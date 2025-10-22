import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { documentAPI } from '../../services/api';

const DocumentList = ({ refreshTrigger, onUpdate }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    documentType: '',
    search: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchDocuments();
  }, [filters, currentPage, refreshTrigger]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await documentAPI.getAll({
        ...filters,
        page: currentPage,
        limit: 10,
      });
      setDocuments(response.data.documents);
      setTotalPages(response.data.pages);
    } catch (error) {
      toast.error('Error loading documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await documentAPI.delete(id);
        toast.success('Document deleted successfully');
        onUpdate();
      } catch (error) {
        toast.error('Error deleting document');
      }
    }
  };

  const handleDownload = async (id, fileName) => {
    try {
      const response = await documentAPI.download(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Error downloading file');
    }
  };

  const getStatusStyle = (status) => {
    const styles = {
      Active: { backgroundColor: '#D1FAE5', color: '#065F46' },
      'Expiring Soon': { backgroundColor: '#FEF3C7', color: '#92400E' },
      Expired: { backgroundColor: '#FEE2E2', color: '#991B1B' },
      Renewed: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
    };
    return styles[status] || {};
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysUntilExpiry = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return <div style={styles.loading}>Loading documents...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Filters */}
      <div style={styles.filters}>
        <input
          type="text"
          placeholder="🔍 Search documents..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          style={styles.searchInput}
        />

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          style={styles.select}
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Expiring Soon">Expiring Soon</option>
          <option value="Expired">Expired</option>
          <option value="Renewed">Renewed</option>
        </select>

        <select
          value={filters.documentType}
          onChange={(e) => setFilters({ ...filters, documentType: e.target.value })}
          style={styles.select}
        >
          <option value="">All Types</option>
          <option value="Contract">Contract</option>
          <option value="License">License</option>
          <option value="Certificate">Certificate</option>
          <option value="Insurance">Insurance</option>
          <option value="Lease">Lease</option>
          <option value="Permit">Permit</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Documents Table */}
      {documents.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>📄</span>
          <p style={styles.emptyText}>No documents found</p>
        </div>
      ) : (
        <>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Title</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Issue Date</th>
                  <th style={styles.th}>Expiry Date</th>
                  <th style={styles.th}>Days Left</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc._id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.titleCell}>
                        <strong>{doc.title}</strong>
                        {doc.documentNumber && (
                          <span style={styles.docNumber}>{doc.documentNumber}</span>
                        )}
                      </div>
                    </td>
                    <td style={styles.td}>{doc.documentType}</td>
                    <td style={styles.td}>{formatDate(doc.issueDate)}</td>
                    <td style={styles.td}>{formatDate(doc.expiryDate)}</td>
                    <td style={styles.td}>
                      <span style={styles.daysLeft}>
                        {getDaysUntilExpiry(doc.expiryDate)} days
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.statusBadge, ...getStatusStyle(doc.status) }}>
                        {doc.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        {doc.filePath && (
                          <button
                            onClick={() => handleDownload(doc._id, doc.fileName)}
                            style={styles.actionButton}
                            title="Download"
                          >
                            ⬇️
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(doc._id)}
                          style={{ ...styles.actionButton, ...styles.deleteButton }}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={styles.pageButton}
              >
                ← Previous
              </button>
              <span style={styles.pageInfo}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={styles.pageButton}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  filters: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  searchInput: {
    flex: '1',
    minWidth: '250px',
    padding: '10px 16px',
    border: '2px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
  },
  select: {
    padding: '10px 16px',
    border: '2px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#6B7280',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: '64px',
    display: 'block',
    marginBottom: '16px',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: '16px',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    borderBottom: '2px solid #E5E7EB',
    fontWeight: '600',
    color: '#374151',
    fontSize: '14px',
  },
  tr: {
    borderBottom: '1px solid #F3F4F6',
  },
  td: {
    padding: '16px 12px',
    fontSize: '14px',
    color: '#1F2937',
  },
  titleCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  docNumber: {
    fontSize: '12px',
    color: '#6B7280',
  },
  daysLeft: {
    fontWeight: '600',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  actionButton: {
    padding: '6px 10px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    backgroundColor: '#F3F4F6',
    transition: 'background-color 0.3s',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginTop: '24px',
  },
  pageButton: {
    padding: '8px 16px',
    border: '2px solid #E5E7EB',
    borderRadius: '8px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
  },
  pageInfo: {
    color: '#6B7280',
    fontSize: '14px',
  },
};

export default DocumentList;