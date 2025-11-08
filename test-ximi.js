// Test script for Ximi AI service
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testXimi() {
  console.log('Testing Ximi AI Service with Replit AI Integrations...\n');
  
  try {
    // First, let's test if the server is running
    console.log('1. Testing server connection...');
    const serverResponse = await fetch(`${BASE_URL}/`);
    if (!serverResponse.ok) {
      throw new Error(`Server not responding: ${serverResponse.status}`);
    }
    console.log('✅ Server is running\n');
    
    // Test direct call to Ximi service function
    console.log('2. Testing Ximi response generation...');
    const { generateXimiResponse } = await import('./server/services/ximi.ts');
    
    const testContext = {
      moodType: 'foggy',
      wellnessDimensions: ['mindfulness', 'social'],
      mode: 'sibling'
    };
    
    const response = await generateXimiResponse(
      "I'm feeling confused and lost today",
      testContext
    );
    
    console.log('✅ Ximi response generated successfully!');
    console.log('Response:', response.message);
    console.log('Crisis detected:', response.crisisDetected);
    console.log('\n');
    
    // Test with positive mood
    console.log('3. Testing with positive mood context...');
    const positiveContext = {
      moodType: 'breezy',
      wellnessDimensions: ['fitness', 'creativity'],
      mode: 'peer'
    };
    
    const positiveResponse = await generateXimiResponse(
      "What should I do with all this energy?",
      positiveContext
    );
    
    console.log('✅ Positive mood response generated!');
    console.log('Response:', positiveResponse.message);
    console.log('\n');
    
    console.log('🎉 All tests passed! Ximi AI is working properly with Replit AI Integrations (gpt-5 model)');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testXimi().catch(console.error);