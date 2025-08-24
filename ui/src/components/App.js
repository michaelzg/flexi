import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './Header';
import Chart from './Chart';
import HistoricalUsageChart from './HistoricalUsageChart';
import SavingsChart from './SavingsChart';
import WhatThisMeans from './WhatThisMeans';
import { fetchPricingData } from '../utils/apiService';
import { 
  calculateSubscriptionQuantities, 
  calculateSavingsForPeriods 
} from '../utils/rateCalculator';
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
  const initialFetchDone = useRef(false);
  const [historicalUsageData, setHistoricalUsageData] = useState([]);
  const [currentUsageData, setCurrentUsageData] = useState([]);
  const [selectedData, setSelectedData] = useState(null);
  const [selectedTimestamp, setSelectedTimestamp] = useState(null);
  const [savingsData, setSavingsData] = useState([]);
  const [subscriptionQuantities, setSubscriptionQuantities] = useState({});

  // Initialize with today's date and 2 days from now on component mount
  useEffect(() => {
    if (initialFetchDone.current) return;
    
    // Always use yesterday's date and 2 days from now
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    
    const twoDaysFromNow = new Date(now);
    twoDaysFromNow.setDate(now.getDate() + 2);
    
    const initialStartDate = yesterday.toISOString().split('T')[0];
    const initialEndDate = twoDaysFromNow.toISOString().split('T')[0];
    
    // Set date range
    setDateRange({ 
      startDate: initialStartDate, 
      endDate: initialEndDate 
    });
    
    // Fetch data
    fetchData(initialStartDate, initialEndDate);
    initialFetchDone.current = true;
    
    // Remove any URL parameters
    if (window.location.search) {
      const url = new URL(window.location);
      url.search = '';
      window.history.pushState({}, '', url);
    }
  }, []);

  // No longer updating URL when date range changes

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

  const handleDateChange = useCallback(async (startDate, endDate) => {
    // Prevent unnecessary fetches if dates haven't changed
    if (dateRange.startDate === startDate && dateRange.endDate === endDate) {
      return;
    }
    setDateRange({ startDate, endDate });
    await fetchData(startDate, endDate);
  }, [dateRange]);

  const handleHistoricalDataParsed = (data) => {
    // Filter to only include historical data (for baseline calculation)
    const historicalData = data.filter(item => item.isHistorical);
    setHistoricalUsageData(historicalData);
    
    // Reset selected data when new historical data is loaded
    setSelectedData(null);
    
    // Calculate subscription quantities from historical data
    if (historicalData.length > 0) {
      const subscriptions = calculateSubscriptionQuantities(historicalData);
      setSubscriptionQuantities(subscriptions);
      console.log("Subscription quantities calculated:", subscriptions);
    }
    
    console.log("Baseline historical data loaded:", historicalData.length, "data points");
  };

  const handleCurrentUsageDataParsed = (data) => {
    // Filter to only include current usage data
    const currentData = data.filter(item => item.isCurrentUsage);
    setCurrentUsageData(currentData);
    
    // Reset selected data when new current usage data is loaded
    setSelectedData(null);
    
    console.log("Current usage data loaded:", currentData.length, "data points");
    console.log("Sample current data:", currentData.slice(0, 3));
    console.log("Current state - pricing data points:", chartData.timestamps.length);
    console.log("Current state - subscription quantities:", Object.keys(subscriptionQuantities).length);
  };

  // Calculate savings whenever we have current usage data, pricing data, and subscription quantities
  useEffect(() => {
    console.log("Savings calculation check:", {
      hasCurrentUsage: currentUsageData.length > 0,
      hasPricingData: chartData.timestamps.length > 0,
      hasSubscriptions: Object.keys(subscriptionQuantities).length > 0,
      currentUsageCount: currentUsageData.length,
      pricingCount: chartData.timestamps.length,
      subscriptionHours: Object.keys(subscriptionQuantities).length
    });
    
    if (currentUsageData.length > 0 && chartData.timestamps.length > 0 && Object.keys(subscriptionQuantities).length > 0) {
      console.log("Calculating savings with:", {
        currentUsageDataPoints: currentUsageData.length,
        pricingDataPoints: chartData.timestamps.length,
        subscriptionHours: Object.keys(subscriptionQuantities).length
      });
      
      const savings = calculateSavingsForPeriods(
        currentUsageData,
        chartData,
        subscriptionQuantities
      );
      
      setSavingsData(savings);
      console.log("Savings calculated:", savings.length, "data points");
      console.log("Sample savings:", savings.slice(0, 3));
    } else {
      console.log("Not calculating savings - missing data");
      setSavingsData([]);
    }
  }, [currentUsageData, chartData, subscriptionQuantities]);
  
  // Handle bar selection from charts
  const handleBarSelect = (timestamp, usage, price) => {
    if (timestamp && price !== undefined) {
      // Store the selected timestamp for visual highlighting
      setSelectedTimestamp(timestamp);
      
      // If we have a timestamp and price, prepare the selection data
      const newSelectedData = { timestamp, price };
      
      // Find the corresponding historical usage data for this timestamp
      // We need to adjust the timestamp to be 1 year in the past
      const pastTimestamp = new Date(timestamp);
      pastTimestamp.setFullYear(pastTimestamp.getFullYear() - 1);
      
      // If usage is provided directly (from usage chart), use it
      if (usage !== null && usage !== undefined) {
        newSelectedData.usage = usage;
      } 
      // If we're selecting a bar on the price chart (no usage), try to find the corresponding usage
      else if (currentUsageData.length > 0) {
        // Find the closest current usage data point by matching timestamp exactly or closest time
        let currentDataPoint = currentUsageData.find(item => {
          return item.timestamp === timestamp;
        });
        
        // If no exact match, try to find the closest time
        if (!currentDataPoint) {
          const targetTime = new Date(timestamp);
          currentUsageData.sort((a, b) => {
            const timeA = new Date(a.timestamp);
            const timeB = new Date(b.timestamp);
            return Math.abs(timeA - targetTime) - Math.abs(timeB - targetTime);
          });
          
          currentDataPoint = currentUsageData[0];
          console.log("Using closest current usage data point");
        }
        
        if (currentDataPoint) {
          newSelectedData.usage = currentDataPoint.usage;
        } else {
          console.log("No current usage data found for timestamp:", timestamp);
          newSelectedData.usage = 0;
        }
      } else {
        // If no current usage data is available at all, use a default value
        console.log("No current usage data available, using default value");
        newSelectedData.usage = 0;
      }
      
      // Try to find subscription quantity from savings data for this timestamp
      if (savingsData.length > 0) {
        const savingsItem = savingsData.find(item => item.timestamp === timestamp);
        if (savingsItem) {
          newSelectedData.subscriptionQuantity = savingsItem.subscriptionQuantity;
        }
      }
      
      // If no subscription quantity found, try to get it from subscriptionQuantities
      if (!newSelectedData.subscriptionQuantity && Object.keys(subscriptionQuantities).length > 0) {
        const pastTimestamp = new Date(timestamp);
        pastTimestamp.setFullYear(pastTimestamp.getFullYear() - 1);
        const hour = pastTimestamp.getHours();
        newSelectedData.subscriptionQuantity = subscriptionQuantities[hour] || 0;
      }
      
      // Always update with the data we have
      console.log("Setting selected data:", newSelectedData);
      setSelectedData(newSelectedData);
    } else {
      // Reset selected data when clicking outside the bars
      setSelectedData(null);
      setSelectedTimestamp(null);
    }
  };

  return (
    <div className="container">
      <Header 
        dateRange={dateRange}
        onDateChange={handleDateChange}
        onHistoricalDataParsed={handleHistoricalDataParsed}
        onCurrentUsageDataParsed={handleCurrentUsageDataParsed}
      />
      
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
      
      <WhatThisMeans selectedData={selectedData} />
      
      <Chart 
        timestamps={chartData.timestamps} 
        prices={chartData.prices}
        isLoading={isLoading}
        onBarSelect={handleBarSelect}
        selectedTimestamp={selectedTimestamp}
      />
      
      <SavingsChart 
        savingsData={savingsData}
        timestamps={chartData.timestamps}
        prices={chartData.prices}
        onBarSelect={handleBarSelect}
        selectedTimestamp={selectedTimestamp}
        isLoading={isLoading}
      />

      {historicalUsageData.length > 0 && (
        <HistoricalUsageChart 
          usageData={historicalUsageData}
          timestamps={chartData.timestamps}
          prices={chartData.prices}
          isLoading={false}
          onBarSelect={handleBarSelect}
          selectedTimestamp={selectedTimestamp}
        />
      )}
    </div>
  );
};

export default App;
