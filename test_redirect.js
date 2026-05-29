
const io = require("socket.io-client");
const axios = require("axios");
// const { expect } = require("chai");

// Configuration
const SERVER_URL = "http://localhost:3040";
const TEST_IP = "123.45.67.89";

async function testRedirection() {
  console.log("1. Connecting socket client...");
  const socket = io(SERVER_URL, {
    query: {
      clientIP: TEST_IP,
      clientIPSource: 'test-script'
    },
    transports: ['websocket']
  });

  await new Promise((resolve) => {
    socket.on("connect", () => {
      console.log(`Socket connected with ID: ${socket.id}`);
      resolve();
    });
  });

  // Listen for redirect event
  const redirectPromise = new Promise((resolve, reject) => {
    socket.on("redirect", (data, ack) => {
      console.log("Received redirect event:", data);
      if (typeof ack === 'function') {
        console.log("Sending Ack...");
        ack('received');
      }
      resolve(data);
    });
    
    // Timeout of 10 seconds
    setTimeout(() => reject(new Error("Timeout waiting for redirect event")), 10000);
  });

  console.log("3. Checking debug API for room membership...");
  try {
    const debugResponse = await axios.get(`${SERVER_URL}/debug-status`);
    const activeRooms = debugResponse.data.activeRooms;
    console.log("Active Rooms:", JSON.stringify(activeRooms, null, 2));
    
    if (activeRooms[TEST_IP]) {
        console.log(`SUCCESS: IP ${TEST_IP} is in activeRooms with ${activeRooms[TEST_IP].length} socket(s).`);
    } else {
        console.error(`FAILURE: IP ${TEST_IP} NOT found in activeRooms.`);
    }
  } catch (error) {
    console.error("Debug API Error:", error.message);
  }

  // Keep alive for a bit to ensure server processing
  await new Promise(r => setTimeout(r, 2000));

  console.log("4. Sending API request to redirect IP...");
  try {
    const response = await axios.post(`${SERVER_URL}/dashboard/redirect-ip`, {
      ip: TEST_IP,
      redirectUrl: "https://example.com/redirected",
      isPermanent: false
    });
    console.log("API Response:", response.data);
  } catch (error) {
    console.error("API Error:", error.message);
  }

  console.log("5. Waiting for socket event...");
  try {
    const data = await redirectPromise;
    console.log("SUCCESS: Socket received redirect:", data);
  } catch (error) {
    console.error("FAILURE:", error.message);
  }

  socket.disconnect();
}

testRedirection();
