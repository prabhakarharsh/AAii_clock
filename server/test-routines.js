const axios = require('axios');

const baseURL = 'http://localhost:3001/api';

async function test() {
  try {
    console.log('--- 1. POST /api/routines ---');
    const postRes = await axios.post(`${baseURL}/routines`, {
      name: "Morning Routine",
      steps: [
        { order: 1, type: "alarm", label: "Wake up", time: "06:30" },
        { order: 2, type: "reminder", label: "Drink water", time: "06:35", note: "2 glasses" },
        { order: 3, type: "reminder", label: "Exercise", time: "06:45" }
      ]
    });
    console.log(JSON.stringify(postRes.data, null, 2));
    const routineId = postRes.data.data.id;

    console.log('\n--- 2. GET /api/routines ---');
    const getAllRes = await axios.get(`${baseURL}/routines`);
    console.log(JSON.stringify(getAllRes.data, null, 2));

    console.log(`\n--- 3. GET /api/routines/${routineId} ---`);
    const getOneRes = await axios.get(`${baseURL}/routines/${routineId}`);
    console.log(JSON.stringify(getOneRes.data, null, 2));

    console.log(`\n--- 4. POST /api/routines/${routineId}/run ---`);
    const runRes = await axios.post(`${baseURL}/routines/${routineId}/run`);
    console.log(JSON.stringify(runRes.data, null, 2));

    console.log(`\n--- 5. PUT /api/routines/${routineId} ---`);
    const putRes = await axios.put(`${baseURL}/routines/${routineId}`, {
      active: false
    });
    console.log(JSON.stringify(putRes.data, null, 2));

    console.log(`\n--- 6. DELETE /api/routines/${routineId} ---`);
    const deleteRes = await axios.delete(`${baseURL}/routines/${routineId}`);
    console.log(JSON.stringify(deleteRes.data, null, 2));

    console.log('\n--- 7. GET /health ---');
    const healthRes = await axios.get('http://localhost:3001/health');
    console.log(JSON.stringify(healthRes.data, null, 2));

    console.log('\n✅ All Routine tests passed!');
  } catch (error) {
    console.log('\n❌ Routine Test failed:');
    if (error.response) {
      console.log(JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(error.message);
    }
  }
}

test();
