import { formatDateForAPI } from './chartUtils';

// Function to fetch pricing data from the API
export const fetchPricingData = async (startDate, endDate) => {
  // Format dates for API
  const formattedStartDate = formatDateForAPI(startDate);
  const formattedEndDate = formatDateForAPI(endDate);
  
  // Define the API URL with selected dates
  const apiUrl = `https://pge-pe-api.gridx.com/v1/getPricing?utility=PGE&market=DAM&startdate=${formattedStartDate}&enddate=${formattedEndDate}&ratename=EV2A&representativeCircuitId=013921103&program=CalFUSE`;
  
  // Set a timeout for API call
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timed out')), 10000);
  });

  try {
    // Fetch data with timeout
    const response = await Promise.race([
      fetch(apiUrl),
      timeoutPromise
    ]);
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    const data = await response.json();
    
    // Extract the "data" array from the response
    const pricingData = data.data;

    // Initialize arrays for timestamps and prices
    const timestamps = [];
    const prices = [];

    // Process each day's data
    pricingData.forEach(day => {
      const priceDetails = day.priceDetails;
      // Check if priceDetails is an array and has data
      if (Array.isArray(priceDetails) && priceDetails.length > 0) {
        priceDetails.forEach(interval => {
          timestamps.push(interval.startIntervalTimeStamp);
          prices.push(parseFloat(interval.intervalPrice));
        });
      }
    });

    return { timestamps, prices };
  } catch (error) {
    throw new Error(`Failed to load data: ${error.message}`);
  }
};
