#!/usr/bin/env node

// Simple test script to verify the dashboard API endpoints are working
const jwt = require('jsonwebtoken');

// Test helper to make authenticated requests
async function testDashboardEndpoints() {
  const baseUrl = 'http://localhost:8000/api';
  
  // This is a test JWT token - in reality this would come from Clerk
  const testToken = 'test-jwt-token-here';
  
  console.log('🧪 Testing Dashboard API Endpoints...\n');

  // Test endpoints without authentication first
  const endpoints = [
    '/users/dashboard-stats',
    '/users/dashboard-appointments',
    '/users/dashboard-professionals'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Testing ${endpoint}...`);
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${endpoint} - Status: ${response.status}`);
        console.log(`   Data keys: ${Object.keys(data).join(', ')}`);
      } else {
        console.log(`❌ ${endpoint} - Status: ${response.status}`);
        console.log(`   Error: ${data.message || data.error}`);
      }
      
    } catch (error) {
      console.log(`💥 ${endpoint} - Network Error: ${error.message}`);
    }
    
    console.log('');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testDashboardEndpoints().catch(console.error);
}

module.exports = { testDashboardEndpoints };