import React, { useState, useEffect, useMemo } from 'react';
import moment from 'moment';
import { formatCurrency } from '../utils/rateCalculator';

const WhatThisMeans = ({ selectedData, savingsData = [], timestamps = [], hoverSummary = null }) => {
  // State to track fade animation for pills
  const [fadeInPills, setFadeInPills] = useState(false);
  
  // Trigger fade-in animation when selectedData changes
  useEffect(() => {
    if (selectedData && selectedData.timestamp && selectedData.usage !== undefined && selectedData.price !== undefined) {
      setFadeInPills(true);
      
      const pillsTimer = setTimeout(() => {
        setFadeInPills(false);
      }, 300);
      
      return () => {
        clearTimeout(pillsTimer);
      };
    }
  }, [selectedData]);

  // Format data for display if available
  let usageFormatted = '';
  let subscriptionQuantityFormatted = '';
  let priceInCents = '';
  let dateTimeInfo = '';
  
  if (selectedData && selectedData.timestamp && selectedData.usage !== undefined && selectedData.price !== undefined) {
    // Format the date and time
    const date = new Date(selectedData.timestamp);
    const formattedDate = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    const formattedTime = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      hour12: true 
    });
    
    dateTimeInfo = `${formattedDate} at ${formattedTime}`;
    
    // Format the price (convert from dollars to cents)
    priceInCents = (selectedData.price * 100).toFixed(2);
    
    // Format the usage
    usageFormatted = selectedData.usage.toFixed(1);
    
    // Format the subscription quantity (threshold)
    subscriptionQuantityFormatted = (selectedData.subscriptionQuantity !== null && 
                                   selectedData.subscriptionQuantity !== undefined && 
                                   typeof selectedData.subscriptionQuantity === 'number') ? 
      selectedData.subscriptionQuantity.toFixed(1) : 
      '0.0';
  }

  // Helpers for timeframe and total savings moved from SavingsChart
  const timeframeString = useMemo(() => {
    if (!timestamps || timestamps.length === 0) return '';
    const startDate = moment(timestamps[0]);
    const endDate = moment(timestamps[timestamps.length - 1]);
    if (startDate.isSame(endDate, 'day')) return startDate.format('MMM D, YYYY');
    if (startDate.isSame(endDate, 'year')) return `${startDate.format('MMM D')} - ${endDate.format('MMM D, YYYY')}`;
    return `${startDate.format('MMM D, YYYY')} - ${endDate.format('MMM D, YYYY')}`;
  }, [timestamps]);

  const totalSavingsValue = useMemo(() => {
    if (!savingsData || savingsData.length === 0 || !timestamps || timestamps.length === 0) return 0;
    const startTime = new Date(timestamps[0]).getTime();
    const endTime = new Date(timestamps[timestamps.length - 1]).getTime();
    const filtered = savingsData.filter(item => {
      const t = new Date(item.timestamp).getTime();
      return t >= startTime && t <= endTime;
    });
    let sum = 0;
    filtered.forEach(item => {
      const hasFlex = (item.usageKWh || 0) > (item.subscriptionQuantity || 0);
      if (hasFlex) {
        const baseUsage = Math.min(item.usageKWh || 0, item.subscriptionQuantity || 0);
        const flexUsage = Math.max(0, (item.usageKWh || 0) - (item.subscriptionQuantity || 0));
        const subscriptionCost = baseUsage * (item.touRate || 0);
        const flexCost = flexUsage * (item.dynamicRate || 0);
        const actualCost = subscriptionCost + flexCost;
        const hourSavings = (item.touCost || 0) - actualCost;
        sum += hourSavings;
      }
    });
    return sum;
  }, [savingsData, timestamps]);

  return (
    <div className="what-this-means">
      <div className="what-this-means-columns">
        {/* Left Column: Title, Pills, and Explanation */}
        <div className="what-this-means-left-column">
          <div className="what-this-means-header">
            <h3 className="what-this-means-title">What this means</h3>
            
            {selectedData && selectedData.usage !== undefined && (
              <span className={`what-this-means-pill usage-pill ${fadeInPills ? 'fade-in' : ''}`}>
                {usageFormatted} kWh
              </span>
            )}
            
            {selectedData && selectedData.price !== undefined && (
              <span className={`what-this-means-pill price-pill ${fadeInPills ? 'fade-in' : ''}`}>
                {priceInCents}¢/kWh
                {selectedData.price < 0 && (
                  <span className="negative-price-note"> (negative)</span>
                )}
              </span>
            )}
          </div>
          
          <div className="what-this-means-explanation">
            {!selectedData || !selectedData.timestamp || selectedData.usage === undefined || selectedData.price === undefined ? (
              <>
                <p className="what-this-means-text">
                  Click on any bar in either chart to see how historical usage affects your subscription pricing.
                </p>
                <ul className="what-this-means-rules">
                  <li>Historical usage from last year is your "subscription" quantity</li>
                  <li>Use more: pay dynamic price for additional energy</li>
                  <li>Use less: get credited at dynamic price for saved energy<br/>&nbsp;</li>
                </ul>
              </>
            ) : (
              <p className="what-this-means-text">
                For {dateTimeInfo}, your subscription is <strong>{subscriptionQuantityFormatted} kWh</strong> with dynamic price at <strong>{priceInCents}¢</strong>.
                <span className="what-this-means-note" style={{ visibility: selectedData.price < 0 ? 'visible' : 'hidden' }}>
                  <strong>Note:</strong> Negative pricing means you're incentivized to use more energy.
                </span>
              </p>
            )}
          </div>
        </div>
        
        {/* Right Column: "If you use..." contexts */}
        <div className="what-this-means-right-column">
          {!selectedData || !selectedData.timestamp || selectedData.usage === undefined || selectedData.price === undefined ? (
            <div className="what-this-means-placeholder">
              <p>Click on any bar in either chart to see specific pricing details</p>
            </div>
          ) : (
            <div className="what-this-means-usage-scenarios">
              <p><strong>If you use less than {subscriptionQuantityFormatted} kWh:</strong> {selectedData.price < 0 ? 'Charged' : 'Credited'} {Math.abs(priceInCents)}¢ per kWh saved</p>
              <p><strong>If you use more than {subscriptionQuantityFormatted} kWh:</strong> {selectedData.price < 0 ? 'Credited' : 'Charged'} {Math.abs(priceInCents)}¢ per additional kWh</p>
            </div>
          )}
        </div>

        {/* Summary Column: Cards (Total Savings + Hover Breakdown) */}
        <div className="what-this-means-summary-column">
          <div className="summary-cards-row">
            <div className={`summary-card ${totalSavingsValue >= 0 ? 'positive' : 'negative'}`}>
              <div className="summary-amount">
                {totalSavingsValue >= 0 ? '+' : ''}{formatCurrency(totalSavingsValue)}
              </div>
              <div className="summary-label">Total Savings from Flex Rate</div>
              <div className="summary-time">{timeframeString}</div>
            </div>
            <div className={`breakdown-card ${hoverSummary ? 'visible' : ''}`}>
              {hoverSummary && (
                <>
                  <div className="breakdown-time">{moment(hoverSummary.timestamp).format('MMM D, hA')}</div>
                  <div className="breakdown-row"><span>Total Usage:</span><strong>{(hoverSummary.totalUsage ?? 0).toFixed(2)} kWh</strong></div>
                  <div className="breakdown-row"><span>Base Rate only:</span><strong>{formatCurrency(hoverSummary.baseRateOnlyCost)}</strong></div>
                  <div className="breakdown-row"><span>Actual with Flex:</span><strong>{formatCurrency(hoverSummary.actualCost)}</strong></div>
                  <div className="breakdown-row emphasis">
                    <span>{hoverSummary.totalSavings >= 0 ? 'Savings:' : 'Additional Cost:'}</span>
                    <strong className={hoverSummary.totalSavings >= 0 ? 'green' : 'red'}>{formatCurrency(Math.abs(hoverSummary.totalSavings))}</strong>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatThisMeans;
