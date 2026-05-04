/**
 * ABDU AI - BACKEND SERVER
 * Документация: Сервер на Node.js. 
 * Используем модель "gemini-flash-lite-latest" и систему автоматических повторов (retry).
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Загружаем ключи
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Подключаем API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Специальная функция для создания паузы (в миллисекундах)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.post('/chat', async (req, res) => {
    try {
        const { message, history } = req.body;

        // ИСПРАВЛЕНИЕ: Используем облегченную версию модели, чтобы избежать пробок на серверах
        const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

        const chat = model.startChat({
            history: history || [],
        });

        // Система автоматических попыток (пробуем 3 раза)
        let retries = 3;
        let responseText = "";

        while (retries > 0) {
            try {
                // Пытаемся отправить сообщение
                const result = await chat.sendMessage(message);
                const response = await result.response;
                responseText = response.text();
                break; // Если получилось, выходим из цикла!

            } catch (apiError) {
                // Если ошибка 503 (сервер занят) и у нас еще остались попытки
                if (apiError.status === 503 && retries > 1) {
                    console.log("Сервер Google занят. Ждем 2 секунды и пробуем снова...");
                    await delay(2000); // Ждем 2 секунды
                    retries--; // Уменьшаем количество оставшихся попыток
                } else {
                    // Если это другая ошибка или попытки закончились, выбрасываем ошибку дальше
                    throw apiError; 
                }
            }
        }
        
        // Отправляем успешный ответ на сайт
        res.json({ text: responseText });

    } catch (error) {
        console.error("--- ОШИБКА ГЕНЕРАЦИИ ---");
        console.error("Код:", error.status);
        console.error("Сообщение:", error.message);
        
        // Отправляем понятный текст ошибки в наш интерфейс
        if (error.status === 503) {
            res.status(503).json({ error: "Серверы ИИ сейчас сильно перегружены. Пожалуйста, подожди пару минут и отправь сообщение еще раз." });
        } else {
            res.status(500).json({ error: `Ошибка ИИ: ${error.message}` });
        }
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`Сервер Abdu AI работает: http://localhost:${PORT}`);
    console.log(`Модель: gemini-flash-lite-latest`);
    console.log(`=========================================`);
});