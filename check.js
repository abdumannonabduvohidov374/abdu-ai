import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    // Этот метод напрямую спрашивает у Google список доступных тебе моделей
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    
    console.log("=== ДОСТУПНЫЕ МОДЕЛИ ===");
    data.models.forEach(m => console.log(m.name));
    console.log("=========================");
  } catch (e) {
    console.error("Ошибка при получении списка:", e);
  }
}

listModels();