const axios = require('axios');

const baseURL = 'http://localhost:3001/api';

async function test() {
  try {
    console.log('--- 1. POST /api/reminders ---');
    const postRes = await axios.post(`${baseURL}/reminders`, {
      title: 'Buy groceries',
      note: 'Milk, eggs, bread',
      datetime: '2026-03-20T10:00:00.000Z'
    });
    console.log(JSON.stringify(postRes.data, null, 2));
    const reminderId = postRes.data.data.id;

    console.log('\n--- 2. GET /api/reminders ---');
    const getAllRes = await axios.get(`${baseURL}/reminders`);
    console.log(JSON.stringify(getAllRes.data, null, 2));

    console.log('\n--- 3. GET /api/reminders/pending ---');
    const getPendingRes = await axios.get(`${baseURL}/reminders/pending`);
    console.log(JSON.stringify(getPendingRes.data, null, 2));

    console.log(`\n--- 4. GET /api/reminders/${reminderId} ---`);
    const getOneRes = await axios.get(`${baseURL}/reminders/${reminderId}`);
    console.log(JSON.stringify(getOneRes.data, null, 2));

    console.log(`\n--- 5. PUT /api/reminders/${reminderId} ---`);
    const putRes = await axios.put(`${baseURL}/reminders/${reminderId}`, {
      done: true
    });
    console.log(JSON.stringify(putRes.data, null, 2));

    console.log(`\n--- 6. DELETE /api/reminders/${reminderId} ---`);
    const deleteRes = await axios.delete(`${baseURL}/reminders/${reminderId}`);
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
