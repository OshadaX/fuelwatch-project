const axios = require('axios');

const API_BASE_URL = 'http://localhost:8081/api';
const stationId = 'STATION_001';

async function testIntegration() {
    console.log('--- Starting Integration Test ---');

    try {
        // 1. Test Saving Prediction
        console.log('1. Testing POST /reports/fuel-prediction...');
        const saveRes = await axios.post(`${API_BASE_URL}/reports/fuel-prediction`, {
            stationId,
            mode: 'weekly',
            predictions: [
                { Date: '2026-03-07', total_demand: 5000 },
                { Date: '2026-03-08', total_demand: 5500 }
            ]
        });
        console.log('Save status:', saveRes.status);
        console.log('Save response:', saveRes.data.message);

        // 2. Test Fetching Prediction
        console.log('\n2. Testing GET /reports/fuel-prediction/latest...');
        const getRes = await axios.get(`${API_BASE_URL}/reports/fuel-prediction/latest`, {
            params: { stationId }
        });
        console.log('Fetch status:', getRes.status);
        console.log('Fetch response predictions count:', getRes.data.data.predictions.length);

        if (getRes.data.data.predictions.length === 2) {
            console.log('\n✅ Integration Test PASSED');
        } else {
            console.log('\n❌ Integration Test FAILED: Prediction count mismatch');
        }

    } catch (err) {
        console.error('\n❌ Integration Test FAILED with error:');
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', err.response.data);
        } else {
            console.error(err.message);
        }
        console.log('\nHint: Check if the backend server is running on port 8081.');
    }
}

testIntegration();
