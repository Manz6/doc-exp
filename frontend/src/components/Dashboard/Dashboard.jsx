import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { analyticsAPI } from '../../services/api';
import Navbar from '../Layout/Navbar';
import DocumentList from './DocumentList';
import DocumentForm from './DocumentForm';
import Analytics from './Analytics';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('documents');
  const [analytics, setAnalytics] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchAnalytics();
  }, [refreshTrigger]);

  const fetchAnalytics = async () => {
    try {
      const response = await analyticsAPI.getDashboard();
      setAnalytics(response.data.analytics);
    } catch (error) {
      toast.error('Error loading analytics');
    }
  };

  const handleDocumentAdded = () => {
    setShowForm(false);
    setRefreshTrigger(prev => prev + 1);
    toast.success('Document added successfully!');
  };

  return (
    <div style={styles.container}>
      <Navbar />
      
      {/* Stats Cards */}
      <div style={styles.statsContainer}>
        <div style={{ ...styles.statCard, ...styles.activeCard }}>
          <div style={styles.statIcon}>📊</div>
          <div>
            <div style={styles.statValue}>{analytics?.totalDocuments || 0}</div>
            <div style={styles.statLabel}>Total Documents</div>
          </div>
        </div>

        <div style={{ ...styles.statCard, ...styles.expiringSoonCard }}>
          <div style={styles.statIcon}>⚠️</div>
          <div>
            <div style={styles.statValue}>{analytics?.expiringSoon || 0}</div>
            <div style={styles.statLabel}>Expiring Soon</div>
          </div>
        </div>

        <div style={{ ...styles.statCard, ...styles.expiredCard }}>
          <div style={styles.statIcon}>❌</div>
          <div>
            <div style={styles.statValue}>{analytics?.expired || 0}</div>
            <div style={styles.statLabel}>Expired</div>
          </div>
        </div>

        <div style={{ ...styles.statCard, ...styles.successCard }}>
          <div style={styles.statIcon}>✅</div>
          <div>
            <div style={styles.statValue}>{analytics?.active || 0}</div>
            <div style={styles.statLabel}>Active</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={styles.tabsContainer}>
        <button
          onClick={() => setActiveTab('documents')}
          style={{
            ...styles.tab,
            ...(activeTab === 'documents' ? styles.activeTab : {}),
          }}
        >
          📄 Documents
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          style={{
            ...styles.tab,
            ...(activeTab === 'analytics' ? styles.activeTab : {}),
          }}
        >
          📈 Analytics
        </button>
      </div>

      {/* Content Area */}
      <div style={styles.content}>
        {activeTab === 'documents' && (
          <>
            <div style={styles.actionBar}>
              <h2 style={styles.heading}>Document Management</h2>
              <button onClick={() => setShowForm(!showForm)} style={styles.addButton}>
                {showForm ? '✕ Cancel' : '+ Add Document'}
              </button>
            </div>

            {showForm && (
              <DocumentForm
                onSuccess={handleDocumentAdded}
                onCancel={() => setShowForm(false)}
              />
            )}

            <DocumentList refreshTrigger={refreshTrigger} onUpdate={() => setRefreshTrigger(prev => prev + 1)} />
          </>
        )}

        {activeTab === 'analytics' && <Analytics analytics={analytics} />}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f7fa',
  },
  statsContainer: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '30px 24px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  activeCard: {
    borderLeft: '4px solid #3B82F6',
  },
  expiringSoonCard: {
    borderLeft: '4px solid #F59E0B',
  },
  expiredCard: {
    borderLeft: '4px solid #EF4444',
  },
  successCard: {
    borderLeft: '4px solid #10B981',
  },
  statIcon: {
    fontSize: '32px',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: '14px',
    color: '#6B7280',
    marginTop: '4px',
  },
  tabsContainer: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    gap: '8px',
    borderBottom: '2px solid #E5E7EB',
  },
  tab: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    color: '#6B7280',
    transition: 'all 0.3s',
  },
  activeTab: {
    color: '#4F46E5',
    borderBottom: '3px solid #4F46E5',
  },
  content: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '30px 24px',
  },
  actionBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  heading: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addButton: {
    backgroundColor: '#4F46E5',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'background-color 0.3s',
  },
};

export default Dashboard;