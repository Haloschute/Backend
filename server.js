// server.js - Fully compliant ES Module for Render

import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai'; 
import bodyParser from 'body-parser';
import * as dotenv from 'dotenv'; // Keep for local testing if needed

// 1. Configuration & Security
// NOTE: Render will inject GEMINI_API_KEY directly into process.env
// The dotenv.config() is primarily for local testing.
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
// Use the PORT environment variable provided by Render, or default to 3000
const PORT = process.env.PORT || 3000; 
const modelName = "gemini-2.5-flash"; 

if (!GEMINI_API_KEY) {
  console.error("❌ ERROR: GEMINI_API_KEY not found in environment. Shutting down.");
  process.exit(1);
}

// Initialize the Gemini client
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const app = express();

// Middleware
app.use(cors()); 
// Use express.json() instead of body-parser for modern Express apps
// But since you included body-parser, let's stick to it if you need its specific features
app.use(bodyParser.json()); 

// Define the system instruction for the AI model
const systemInstruction = `
You are MemoryMate, an AI Care Partner designed to support caregivers of individuals with Alzheimer's and dementia.
Your role is to be empathetic, provide practical, actionable advice, and offer emotional support.
Your responses must be:
1. Empathetic and supportive in tone.
2. Concise (maximum 3-4 sentences).
3. Directly relevant to the caregiver's question.
4. If a 'patientId' is provided, your response should be tailored and personalized based on the data you would theoretically access for that patient.
`;

// Chat endpoint: /chat
app.post('/chat', async (req, res) => {
  const { message, patientId } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message field is required.' });
  }

  // Use the full context provided by the Flutter app (which includes all log data)
  let fullPrompt = message;

  try {
    console.log(`💭 Received message for patient ${patientId}: ${message.substring(0, 50)}...`);
    
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
    console.error('❌ Gemini API Error:', error);
    // Send 500 status to trigger the robust local fallback logic in the Flutter app
    res.status(500).json({ reply: 'I am sorry, but the AI service is currently unavailable.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`\n🎯 MemoryMate Backend Running (Gemini AI Mode)`);
  console.log(`📍 Accessible on port: ${PORT}`);
});