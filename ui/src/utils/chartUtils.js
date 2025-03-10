import moment from 'moment';
import { Chart as ChartJS } from 'chart.js';

// Function to generate day background annotations
export const generateDayBackgrounds = (timestamps) => {
  if (!timestamps || timestamps.length === 0) return {};
  
  const dayBackgrounds = {};
  const days = {};
  
  // Group timestamps by day
  timestamps.forEach(timestamp => {
    const date = moment(timestamp).format('YYYY-MM-DD');
    if (!days[date]) {
      days[date] = {
        date: date,
        dayOfWeek: moment(timestamp).format('dddd'),
        timestamps: []
      };
    }
    days[date].timestamps.push(timestamp);
  });
  
  // Create background annotation for each day
  Object.values(days).forEach((day, index) => {
    if (day.timestamps.length > 0) {
      // Sort timestamps for this day
      const sortedTimestamps = [...day.timestamps].sort();
      
      // Get first and last timestamp for the day
      const firstTimestamp = sortedTimestamps[0];
      // For the end time, use the start of the next day or a bit after the last timestamp
      const lastTimestamp = moment(sortedTimestamps[sortedTimestamps.length - 1])
        .add(1, 'hour').toISOString(); // Add an hour to ensure coverage
      
      dayBackgrounds[`day_${index}`] = {
        type: 'box',
        xMin: firstTimestamp,
        xMax: lastTimestamp,
        yMin: 'min',
        yMax: 'max',
        backgroundColor: 'rgba(200, 200, 200, 0.2)', // Subtle gray background
        borderWidth: 0,
        label: {
          display: true,
          content: day.dayOfWeek,
          position: 'start',
          font: {
            family: "'Inter', sans-serif",
            size: 12,
            weight: 'bold'
          },
          color: 'rgba(100, 100, 100, 0.7)', // Subtle text color
          padding: {
            top: 4,
            bottom: 4
          }
        }
      };
    }
  });
  
  return dayBackgrounds;
};

// Custom tooltip handler for Chart.js
export const externalTooltipHandler = (tooltipEl, isHistorical = false) => (context) => {
  // Hide if no tooltip
  const {chart, tooltip} = context;
  if (tooltip.opacity === 0) {
    tooltipEl.style.opacity = 0;
    return;
  }

  // Set Text
  if (tooltip.body) {
    const dataIndex = tooltip.dataPoints[0].dataIndex;
    const label = chart.data.labels[dataIndex];
    const formattedDate = moment(label).format('MMM D, YYYY');
    const formattedTime = moment(label).format('h:mm A');
    const hour = moment(label).hour();
    const isDaytime = hour >= 6 && hour < 18; // 6am-6pm is daytime
    const timeIcon = isDaytime ? '☀️' : '🌙'; // Sun icon for day, moon icon for night
    
    // Check if this is one of the best price hours
    let isBestPrice = false;
    if (!isHistorical) {
      // For price chart, check if this is one of the lowest price indices
      const { daytimeLowIndices, nighttimeLowIndices } = findLowestPriceIndicesPerDay(chart.data.labels, chart.data.datasets[0].data, 2);
      isBestPrice = daytimeLowIndices.includes(dataIndex) || nighttimeLowIndices.includes(dataIndex);
    }
    
    let tooltipContent = '';
    
    if (isHistorical) {
      // Historical usage chart (multiple datasets)
      const usageDataset = chart.data.datasets.find(d => d.label.includes('Usage'));
      const costDataset = chart.data.datasets.find(d => d.label.includes('Cost'));
      
      const usageValue = usageDataset ? usageDataset.data[dataIndex] : null;
      const costValue = costDataset ? costDataset.data[dataIndex] : null;
      
      tooltipContent = `
        <div class="tooltip-title">${formattedDate}</div>
        ${usageValue !== null ? `<div class="tooltip-value usage-value">${usageValue.toFixed(2)} kWh</div>` : ''}
        ${costValue !== null ? `<div class="tooltip-value cost-value">$${costValue.toFixed(2)}</div>` : ''}
        <div class="tooltip-time">${timeIcon} ${formattedTime}</div>
      `;
    } else {
      // Price chart (single dataset)
      const dataPoint = chart.data.datasets[0].data[dataIndex];
      const isNegative = dataPoint < 0;
      const valueClass = isNegative ? 'negative-value' : 'positive-value';
      
      tooltipContent = `
        <div class="tooltip-title">${formattedDate}</div>
        <div class="tooltip-value ${valueClass}">${(dataPoint * 100).toFixed(2)} ¢/kWh</div>
        <div class="tooltip-time">${timeIcon} ${formattedTime}</div>
        ${isBestPrice ? `<div class="tooltip-best-price">${timeIcon} best price</div>` : ''}
      `;
    }
    
    tooltipEl.innerHTML = tooltipContent;
  }

  // Position tooltip and show
  const {offsetLeft: positionX, offsetTop: positionY} = chart.canvas;
  tooltipEl.style.opacity = 1;
  tooltipEl.style.left = positionX + tooltip.caretX + 'px';
  tooltipEl.style.top = positionY + tooltip.caretY + 'px';
  
  // Synchronize tooltips between charts
  if (window.syncTooltip) {
    clearTimeout(window.syncTooltip);
  }
  
  window.syncTooltip = setTimeout(() => {
    const timestamp = chart.data.labels[tooltip.dataPoints[0].dataIndex];
    const allCharts = Object.values(ChartJS.instances);
    
    // For historical chart, we need to adjust the timestamp to match the current year
    let searchTimestamp = timestamp;
    if (isHistorical) {
      // If this is the historical chart, add 1 year to find the corresponding point in the price chart
      searchTimestamp = moment(timestamp).add(1, 'year').toISOString();
    } else {
      // If this is the price chart, subtract 1 year to find the corresponding point in the historical chart
      searchTimestamp = moment(timestamp).subtract(1, 'year').toISOString();
    }
    
    allCharts.forEach(otherChart => {
      if (otherChart.id !== chart.id) {
        // If we're in the historical chart, look for the timestamp + 1 year in the price chart
        // If we're in the price chart, look for the timestamp - 1 year in the historical chart
        const compareTimestamp = isHistorical ? timestamp : searchTimestamp;
        
        try {
          const dataIndex = otherChart.data.labels.findIndex(label => {
            // For historical chart, we need to compare with the adjusted timestamp
            if (isHistorical) {
              return moment(label).isSame(moment(searchTimestamp), 'hour');
            } else {
              return moment(label).isSame(moment(compareTimestamp), 'hour');
            }
          });
          
          // Only proceed if we found a matching index and it's within the valid range
          if (dataIndex !== -1 && 
              dataIndex < otherChart.data.datasets[0].data.length && 
              otherChart.data.datasets[0].data[dataIndex] !== undefined) {
            
            try {
              otherChart.tooltip.setActiveElements([
                { datasetIndex: 0, index: dataIndex }
              ], { x: 0, y: 0 });
              otherChart.update();
            } catch (error) {
              console.log("Error setting tooltip:", error);
            }
          }
        } catch (error) {
          console.log("Error synchronizing tooltips:", error);
        }
      }
    });
  }, 10);
};

// Function to format date as YYYYMMDD for API
export const formatDateForAPI = (dateString) => {
  return dateString.replace(/-/g, '');
};

// Function to find the N lowest price indices for each day, separated by day and night
export const findLowestPriceIndicesPerDay = (timestamps, prices, count = 2) => {
  if (!timestamps || !prices || timestamps.length === 0 || prices.length === 0) {
    return {
      lowestIndices: [],
      daytimeLowIndices: [],
      nighttimeLowIndices: []
    };
  }
  
  // Group timestamps and prices by day
  const dayGroups = {};
  
  timestamps.forEach((timestamp, index) => {
    const date = moment(timestamp).format('YYYY-MM-DD');
    
    if (!dayGroups[date]) {
      dayGroups[date] = {
        date,
        indices: [],
        prices: []
      };
    }
    
    dayGroups[date].indices.push(index);
    dayGroups[date].prices.push(prices[index]);
  });
  
  // Find the lowest price indices for each day, separated by daytime and nighttime
  let lowestIndices = [];
  let daytimeLowIndices = [];
  let nighttimeLowIndices = [];
  
  Object.values(dayGroups).forEach(day => {
    // Create array of {index, price, hour, isDaytime} objects for this day
    const priceObjects = day.prices.map((price, i) => {
      const timestamp = timestamps[day.indices[i]];
      const hour = moment(timestamp).hour();
      const isDaytime = hour >= 6 && hour < 18; // 6am-6pm is daytime
      return {
        originalIndex: day.indices[i],
        price,
        hour,
        isDaytime
      };
    });
    
    // Separate daytime and nighttime prices
    const daytimePrices = priceObjects.filter(obj => obj.isDaytime);
    const nighttimePrices = priceObjects.filter(obj => !obj.isDaytime);
    
    // Sort daytime prices by price (ascending)
    daytimePrices.sort((a, b) => a.price - b.price);
    
    // Sort nighttime prices by price (ascending)
    nighttimePrices.sort((a, b) => a.price - b.price);
    
    // Take the lowest daytime price
    if (daytimePrices.length > 0) {
      const lowestDaytimePrice = daytimePrices[0];
      lowestIndices.push(lowestDaytimePrice.originalIndex);
      daytimeLowIndices.push(lowestDaytimePrice.originalIndex);
    }
    
    // Take the lowest nighttime price
    if (nighttimePrices.length > 0) {
      const lowestNighttimePrice = nighttimePrices[0];
      lowestIndices.push(lowestNighttimePrice.originalIndex);
      nighttimeLowIndices.push(lowestNighttimePrice.originalIndex);
    }
  });
  
  return {
    lowestIndices,
    daytimeLowIndices,
    nighttimeLowIndices
  };
};
