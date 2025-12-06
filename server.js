// server.js

import * as dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai'; 
import bodyParser from 'body-parser';

// 1. Configure dotenv
dotenv.config();

// 2. Access variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const PORT = process.env.PORT || 3000; 
const modelName = "gemini-2.5-flash"; 

// Initialization and Error Handling
if (!GEMINI_API_KEY) {
  console.error("❌ ERROR: GEMINI_API_KEY not found in .env file. Shutting down.");
  process.exit(1);
}

// Initialize the Gemini client
// Note: We are no longer using ai.getGenerativeModel to avoid the persistent TypeError
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const app = express();

// Middleware
app.use(cors()); 
app.use(bodyParser.json()); 

// Define the system instruction for the AI model
const systemInstruction = `
You are MemoryMate, an AI Care Partner designed to support caregivers of individuals with Alzheimer's and dementia.
Your role is to be empathetic, provide practical, actionable advice, and offer emotional support.
Your responses must be:
1. Empathetic and supportive in tone.
2. Concise (maximum 3-4 sentences).
3. Directly relevant to the caregiver's question.
4. If a 'patientId' is provided, your response should be tailored and personalized based on the data you would theoretically access for that patient (e.g., mention recent agitation or poor sleep if you had access, otherwise give general personalized advice).
`;


// Chat endpoint
app.post('/chat', async (req, res) => {
  const { message, patientId } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message field is required.' });
  }

  // Craft a more detailed prompt including the patient context
  let fullPrompt = message;
  if (patientId) {
    const patientContext = `The patient ID is ${patientId}. This caregiver tracks their patient's daily behavior. Please provide one actionable, personalized care tip based on general needs for Alzheimer's patients.`;
    fullPrompt = `${message}. Context for response: ${patientContext}`;
  }

  try {
    console.log(`💭 Received message: ${message}`);
    
    // ✅ FIX: Using ai.models.generateContent (Legacy/Alternative Pattern)
    // This calls the method on a nested 'models' object, which is common in older SDK versions.
    const response = await ai.models.generateContent({ 
        model: modelName,
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        config: {
            systemInstruction: systemInstruction,
        }
    });
    
    const replyText = response.text.trim();
    
    console.log('✅ Gemini Reply received.');
    res.json({ reply: replyText });
  } catch (error) {
    // If the error persists here (e.g., ai.models.generateContent is not a function),
    // it confirms your SDK package MUST be reinstalled.
    console.error('❌ Gemini API Error:', error);
    res.status(500).json({ reply: 'I am sorry, but the AI service is currently unavailable. Please check the server logs.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`\n🎯 MemoryMate Backend Running (Gemini AI Mode)`);
  console.log(`📍 Accessible on: http://localhost:${PORT}`);
  console.log(`💡 Ready for personalized data analysis via Gemini`);
});