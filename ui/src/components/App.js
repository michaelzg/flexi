import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './Header';
import Chart from './Chart';
import HistoricalUsageChart from './HistoricalUsageChart';
import WhatThisMeans from './WhatThisMeans';
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
  const initialFetchDone = useRef(false);
  const [historicalUsageData, setHistoricalUsageData] = useState([]);
  const [selectedData, setSelectedData] = useState(null);
  const [selectedTimestamp, setSelectedTimestamp] = useState(null);

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
    // Filter to only include historical data
    const historicalData = data.filter(item => item.isHistorical);
    setHistoricalUsageData(historicalData);
    
    // Reset selected data when new historical data is loaded
    setSelectedData(null);
    
    console.log("Historical data loaded:", historicalData.length, "data points");
  };
  
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
      else if (historicalUsageData.length > 0) {
        // Find the closest historical usage data point by matching hour, day, and month
        // First try exact match
        let historicalDataPoint = historicalUsageData.find(item => {
          const itemDate = new Date(item.timestamp);
          return itemDate.getHours() === pastTimestamp.getHours() && 
                 itemDate.getDate() === pastTimestamp.getDate() && 
                 itemDate.getMonth() === pastTimestamp.getMonth();
        });
        
        // If no exact match, try to find the closest hour on the same day
        if (!historicalDataPoint) {
          const sameDay = historicalUsageData.filter(item => {
            const itemDate = new Date(item.timestamp);
            return itemDate.getDate() === pastTimestamp.getDate() && 
                   itemDate.getMonth() === pastTimestamp.getMonth();
          });
          
          if (sameDay.length > 0) {
            // Find the closest hour
            sameDay.sort((a, b) => {
              const hourA = new Date(a.timestamp).getHours();
              const hourB = new Date(b.timestamp).getHours();
              const targetHour = pastTimestamp.getHours();
              return Math.abs(hourA - targetHour) - Math.abs(hourB - targetHour);
            });
            
            historicalDataPoint = sameDay[0];
          }
        }
        
        // If still no match, use the first available data point
        if (!historicalDataPoint && historicalUsageData.length > 0) {
          historicalDataPoint = historicalUsageData[0];
          console.log("Using first available historical data point as fallback");
        }
        
        if (historicalDataPoint) {
          newSelectedData.usage = historicalDataPoint.usage;
        } else {
          // This should never happen now, but just in case
          console.log("No historical usage data found for timestamp:", timestamp);
          // Use a default value instead of returning
          newSelectedData.usage = 0;
        }
      } else {
        // If no historical usage data is available at all, use a default value
        console.log("No historical usage data available, using default value");
        newSelectedData.usage = 0;
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
