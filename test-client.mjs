#!/usr/bin/env node
// Simple MCP client to test the calendar server

const SERVER_URL = 'http://localhost:3001/mcp';

async function mcpRequest(sessionId, method, params = {}, id = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream'
  };

  if (sessionId) {
    headers['Mcp-Session-Id'] = sessionId;
  }

  const body = {
    jsonrpc: '2.0',
    method,
    ...(params && Object.keys(params).length > 0 && { params }),
    ...(id !== null && { id })
  };

  const response = await fetch(SERVER_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const newSessionId = response.headers.get('mcp-session-id');
  const contentType = response.headers.get('content-type');

  // Only try to parse JSON if content-type is application/json
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    return { data, sessionId: newSessionId || sessionId };
  }

  // For notifications or other non-JSON responses
  return { sessionId: newSessionId || sessionId };
}

async function main() {
  console.log('🔌 Connecting to MCP Calendar Server...\n');

  // Step 1: Initialize
  const { data: initData, sessionId } = await mcpRequest(null, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' }
  }, 1);

  console.log('✓ Connected! Session:', sessionId.substring(0, 8) + '...');
  console.log('✓ Server:', initData.result.serverInfo.name, 'v' + initData.result.serverInfo.version);
  console.log();

  // Step 2: Send initialized notification
  await mcpRequest(sessionId, 'notifications/initialized');

  // Step 3: List tools
  const { data: toolsData } = await mcpRequest(sessionId, 'tools/list', {}, 2);
  console.log('📋 Available tools:');
  toolsData.result.tools.forEach(tool => {
    console.log(`  - ${tool.name}: ${tool.description}`);
  });
  console.log();

  // Step 4: Check availability (WITHOUT progress token)
  console.log('🔍 Testing check_availability...');
  const { data: availData } = await mcpRequest(sessionId, 'tools/call', {
    name: 'check_availability',
    arguments: { date: '2025-12-10', duration: 30, preferred_time: 'any' }
  }, 3);

  if (availData.result) {
    console.log('✓ Result:', JSON.stringify(availData.result, null, 2));
  } else if (availData.error) {
    console.log('✗ Error:', availData.error.message);
  }
  console.log();

  // Step 5: Get today's appointments
  console.log('📅 Testing get_todays_appointments...');
  const { data: todayData } = await mcpRequest(sessionId, 'tools/call', {
    name: 'get_todays_appointments',
    arguments: {}
  }, 4);

  if (todayData.result) {
    console.log('✓ Result:', JSON.stringify(todayData.result, null, 2));
  } else if (todayData.error) {
    console.log('✗ Error:', todayData.error.message);
  }

  console.log('\n✅ All tests completed!');
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
