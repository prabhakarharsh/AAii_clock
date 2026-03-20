const axios = require('axios');

const baseURL = 'http://localhost:3001/api/ai';

const sentences = [
  "Wake me up tomorrow at 7am",
  "Remind me to call mom on Sunday at 5pm",
  "Buy groceries every week on Monday",
  "Set an alarm for 6:30 every morning"
];

async function test() {
  for (let i = 0; i < sentences.length; i++) {
    const text = sentences[i];
    console.log(`\n--- Test ${i + 1}: "${text}" ---`);
    try {
      const res = await axios.post(`${baseURL}/extract-and-save`, { text });
      console.log(JSON.stringify(res.data, null, 2));
    } catch (error) {
      console.log(`\n❌ Test ${i + 1} failed:`);
      if (error.response) {
        console.log(JSON.stringify(error.response.data, null, 2));
      } else {
        console.log(error.message);
      }
    }
  }
}

test();
