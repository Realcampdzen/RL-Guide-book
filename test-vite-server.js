const http = require('http');

console.log('Testing Vite server on port 4000...');

const req = http.get('http://localhost:4000/', (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Vite server is working!');
      console.log(`Content length: ${data.length} bytes`);
      console.log(`First 300 chars:\n${data.substring(0, 300)}`);
    } else {
      console.log(`❌ Server returned status ${res.statusCode}`);
      console.log(`Response: ${data.substring(0, 500)}`);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Error:', err.message);
});

req.setTimeout(5000, () => {
  console.error('❌ Request timeout');
  req.destroy();
});

