import React, { useState, useEffect } from 'react';

const WhatThisMeans = ({ selectedData }) => {
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
  }

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
                For {dateTimeInfo}, your subscription is <strong>{usageFormatted} kWh</strong> with dynamic price at <strong>{priceInCents}¢</strong>.
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
              <p><strong>If you use less than {usageFormatted} kWh:</strong> {selectedData.price < 0 ? 'Charged' : 'Credited'} {Math.abs(priceInCents)}¢ per kWh saved</p>
              <p><strong>If you use more than {usageFormatted} kWh:</strong> {selectedData.price < 0 ? 'Credited' : 'Charged'} {Math.abs(priceInCents)}¢ per additional kWh</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatThisMeans;
