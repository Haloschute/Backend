// server.js - Updated with explicit Safety Settings

import express from 'express';
import cors from 'cors';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai'; // 👈 Import safety classes
import bodyParser from 'body-parser';
import * as dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const PORT = process.env.PORT || 3000; 
const modelName = "gemini-2.5-flash"; 

if (!GEMINI_API_KEY) {
  console.error("❌ ERROR: GEMINI_API_KEY not found in environment.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const app = express();

app.use(cors()); 
app.use(bodyParser.json()); 

const systemInstruction = `
You are MemoryMate, an AI Care Partner designed to support caregivers of individuals with Alzheimer's and dementia.

STRICT BOUNDARIES:
1. You MUST ONLY answer questions related to Alzheimer's, dementia, caregiving, or the provided patient data. Reject all unrelated topics politely.
2. If a user uses minor swearing due to frustration (e.g., "This is so damn hard"), acknowledge their stress with high empathy.
3. You must NEVER use swear words, vulgarity, or profanity yourself under any circumstances. Keep your language clean, warm, and professional.
4. You are not a doctor. Never diagnose conditions or prescribe medications.

TONE & FORMAT:
1. Empathetic and supportive in tone.
2. Concise (maximum 3-4 sentences).
3. Directly relevant to the caregiver's question.
`;

app.post('/chat', async (req, res) => {
  const { message, patientId } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message field is required.' });
  }

  try {
    console.log(`💭 Received message for patient ${patientId}`);
    
    const response = await ai.models.generateContent({ 
        model: modelName,
        contents: [{ role: "user", parts: [{ text: message }] }],
        config: {
            systemInstruction: systemInstruction,
            // 👈 Configure safety settings so bad profanity/harassment is handled cleanly
            safetySettings: [
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE, // Blocks heavy profanity/slurs
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE, // Blocks aggressive personal attacks
                }
            ]
        }
    });
    
    const replyText = response.text.trim();
    res.json({ reply: replyText });
    
  } catch (error) {
    console.error('❌ Gemini API Error:', error);
    
    // Check if the error happened because the safety filter blocked the text
    if (error.toString().toLowerCase().includes('safety')) {
       return res.json({ 
         reply: "I understand you're stressed, but please express your frustrations without using harsh language or slurs so I can continue to help support you." 
       });
    }
    
    res.status(500).json({ reply: 'I am sorry, but the AI service is currently unavailable.' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🎯 MemoryMate Backend Running`);
});
