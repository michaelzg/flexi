import React, { useState, useEffect } from 'react';
import Header from './Header';
import Metadata from './Metadata';
import DatePicker from './DatePicker';
import Chart from './Chart';
import { fetchPricingData } from '../utils/apiService';
import '../styles/main.css';

const App = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState({
    timestamps: [],
    prices: []
  });
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // Parse URL parameters on component mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const startDate = params.get('startDate');
    const endDate = params.get('endDate');
    
    if (startDate && endDate) {
      setDateRange({ startDate, endDate });
      fetchData(startDate, endDate);
    } else {
      // Default dates if not provided in URL
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      
      const twoDaysFromNow = new Date(now);
      twoDaysFromNow.setDate(now.getDate() + 2);
      
      const defaultStartDate = yesterday.toISOString().split('T')[0];
      const defaultEndDate = twoDaysFromNow.toISOString().split('T')[0];
      
      setDateRange({ 
        startDate: defaultStartDate, 
        endDate: defaultEndDate 
      });
      
      fetchData(defaultStartDate, defaultEndDate);
    }
  }, []);

  // Update URL when date range changes
  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      const url = new URL(window.location);
      url.searchParams.set('startDate', dateRange.startDate);
      url.searchParams.set('endDate', dateRange.endDate);
      window.history.pushState({}, '', url);
    }
  }, [dateRange]);

  const fetchData = async (startDate, endDate) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchPricingData(startDate, endDate);
      setChartData(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = async (startDate, endDate) => {
    setDateRange({ startDate, endDate });
    await fetchData(startDate, endDate);
  };

  return (
    <div className="container">
      <Header />
      
      <div className="metadata-container">
        <Metadata />
        <DatePicker 
          onDateChange={handleDateChange}
          initialStartDate={dateRange.startDate}
          initialEndDate={dateRange.endDate}
        />
      </div>
      
      {isLoading && (
        <div className="loading" style={{ display: 'flex' }}>
          <div className="spinner"></div>
          <div className="loading-text">Loading pricing data...</div>
        </div>
      )}
      
      {error && (
        <div className="error" style={{ display: 'block' }}>
          {error}
        </div>
      )}
      
      <Chart 
        timestamps={chartData.timestamps} 
        prices={chartData.prices}
        isLoading={isLoading}
      />
    </div>
  );
};

export default App;
