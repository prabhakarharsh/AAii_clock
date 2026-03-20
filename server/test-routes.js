const axios = require('axios');

const baseURL = 'http://localhost:3001/api';

async function test() {
  try {
    console.log('--- 1. POST /api/alarms ---');
    const postRes = await axios.post(`${baseURL}/alarms`, {
      label: 'Wake up',
      time: '07:00',
      repeat: 'daily',
      ringtoneName: 'Default',
      active: true
    });
    console.log(JSON.stringify(postRes.data, null, 2));
    const alarmId = postRes.data.data.id;

    console.log('\n--- 2. GET /api/alarms ---');
    const getAllRes = await axios.get(`${baseURL}/alarms`);
    console.log(JSON.stringify(getAllRes.data, null, 2));

    console.log(`\n--- 3. GET /api/alarms/${alarmId} ---`);
    const getOneRes = await axios.get(`${baseURL}/alarms/${alarmId}`);
    console.log(JSON.stringify(getOneRes.data, null, 2));

    console.log(`\n--- 4. PUT /api/alarms/${alarmId} ---`);
    const putRes = await axios.put(`${baseURL}/alarms/${alarmId}`, {
      active: false
    });
    console.log(JSON.stringify(putRes.data, null, 2));

    console.log(`\n--- 5. DELETE /api/alarms/${alarmId} ---`);
    const deleteRes = await axios.delete(`${baseURL}/alarms/${alarmId}`);
    console.log(JSON.stringify(deleteRes.data, null, 2));

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.log('\n❌ Test failed:');
    if (error.response) {
      console.log(JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(error.message);
    }
  }
}

test();
