import dotenv from 'dotenv';

// Загружаем наш ключ из файла .env
dotenv.config();

async function checkAvailableModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    // Проверяем, загрузился ли ключ
    if (!apiKey) {
        console.log("Ошибка: Ключ API не найден. Проверь файл .env");
        return;
    }

    console.log("Отправляем запрос к Google, ждем список моделей...");

    // Формируем прямую ссылку к API Google для получения списка
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        console.log("\n=== СПИСОК ДОСТУПНЫХ МОДЕЛЕЙ ===");
        
        // Перебираем все модели и выводим только те, которые умеют генерировать текст (generateContent)
        data.models.forEach(model => {
            if(model.supportedGenerationMethods.includes("generateContent")) {
                // Отрезаем приставку 'models/', чтобы получить чистое имя
                const cleanName = model.name.replace('models/', '');
                console.log(`-> ${cleanName}`);
            }
        });
        console.log("================================\n");
        
    } catch (error) {
        console.error("Произошла ошибка при запросе:", error);
    }
}

// Запускаем нашу функцию
checkAvailableModels();