const http = require('http');

const testUrl = 'http://localhost:3001/';

http
  .get(testUrl, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log(`Content length: ${data.length} bytes`);
      console.log(`First 200 chars: ${data.substring(0, 200)}`);
      if (res.statusCode === 200) {
        console.log('✅ Server is working!');
      } else {
        console.log('❌ Server returned error status');
      }
    });
  })
  .on('error', (err) => {
    console.error('❌ Error:', err.message);
  });
