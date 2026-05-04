/**
 * ABDU AI - BACKEND SERVER
 * Документация: Сервер на Node.js. 
 * Исправлено название модели и настройка порта для Render.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Загружаем ключи из переменных окружения
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Подключаем API через переменную GEMINI_API_KEY, которую ты настроил на Render
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.post('/chat', async (req, res) => {
    try {
        const { message, history } = req.body;

        // ИСПРАВЛЕНИЕ: Используем стабильную и быструю модель gemini-1.5-flash
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const chat = model.startChat({
            history: history || [],
        });

        let retries = 3;
        let responseText = "";

        while (retries > 0) {
            try {
                const result = await chat.sendMessage(message);
                const response = await result.response;
                responseText = response.text();
                break; 

            } catch (apiError) {
                if (apiError.status === 503 && retries > 1) {
                    console.log("Сервер Google занят. Пробуем снова...");
                    await delay(2000); 
                    retries--; 
                } else {
                    throw apiError; 
                }
            }
        }
        
        res.json({ text: responseText });

    } catch (error) {
        console.error("--- ОШИБКА ГЕНЕРАЦИИ ---");
        console.error("Код:", error.status);
        console.error("Сообщение:", error.message);
        
        if (error.status === 503) {
            res.status(503).json({ error: "Серверы перегружены. Попробуй через минуту." });
        } else {
            res.status(500).json({ error: `Ошибка ИИ: ${error.message}` });
        }
    }
});

// ИСПРАВЛЕНИЕ: Для Render важно использовать process.env.PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`Сервер Abdu AI запущен на порту: ${PORT}`);
    console.log(`=========================================`);
});
