/**
 * ABDU AI - FRONTEND LOGIC (Адаптивный дизайн для мобильных)
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const firebaseConfig = {
   apiKey: "AIzaSyBEiItJI0EAJ-baXfYmSfBDU5lTVWgxnQc",
  authDomain: "abduai.firebaseapp.com",
  projectId: "abduai",
  storageBucket: "abduai.firebasestorage.app",
  messagingSenderId: "631263824504",
  appId: "1:631263824504:web:91f5567c53a16766013b8d",
  measurementId: "G-LZ6B6JLX2L"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// DOM
const authPage = document.getElementById('auth-page');
const mainApp = document.getElementById('main-app');
const sidebar = document.getElementById('sidebar');
const menuToggleBtn = document.getElementById('menu-toggle');
const mobileOverlay = document.getElementById('mobile-overlay');

const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const stopBtn = document.getElementById('stop-btn');
const messagesWrapper = document.getElementById('messages-wrapper');
const welcomeScreen = document.getElementById('welcome-screen');
const chatContainer = document.getElementById('chat-container');
const chatHistoryContainer = document.getElementById('chat-history');

const profileAvatar = document.getElementById('user-avatar');
const profileDropdown = document.getElementById('profile-dropdown');
const toolsBtn = document.getElementById('tools-btn');
const toolsDropdown = document.getElementById('tools-dropdown');
const modelsBtn = document.getElementById('models-btn');
const modelsDropdown = document.getElementById('models-dropdown');

let abortController = null;
let typingInterval = null;
let isGuest = localStorage.getItem('abduIsGuest') === 'true'; 

// === УПРАВЛЕНИЕ МЕНЮ И DROPDOWNS ===
function closeAllDropdowns() {
    profileDropdown.classList.remove('show');
    toolsDropdown.classList.remove('show');
    modelsDropdown.classList.remove('show');
}
profileAvatar.addEventListener('click', (e) => { e.stopPropagation(); closeAllDropdowns(); profileDropdown.classList.toggle('show'); });
toolsBtn.addEventListener('click', (e) => { e.stopPropagation(); closeAllDropdowns(); toolsDropdown.classList.toggle('show'); });
modelsBtn.addEventListener('click', (e) => { e.stopPropagation(); closeAllDropdowns(); modelsDropdown.classList.toggle('show'); });
document.addEventListener('click', closeAllDropdowns);
document.getElementById('close-profile-btn').addEventListener('click', closeAllDropdowns);

document.querySelectorAll('.model-option').forEach(item => {
    item.addEventListener('click', (e) => {
        document.querySelectorAll('.model-option').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        document.getElementById('current-model-text').textContent = e.target.textContent;
    });
});

// ИСПРАВЛЕНИЕ: Логика мобильного меню
menuToggleBtn.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
        // На телефоне выдвигаем меню
        sidebar.classList.toggle('mobile-open');
        mobileOverlay.classList.toggle('active');
    } else {
        // На ПК делаем мини-сайдбар
        sidebar.classList.toggle('collapsed');
    }
});

// Закрываем меню при клике на затемненный фон (только телефон)
mobileOverlay.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
    mobileOverlay.classList.remove('active');
});

document.getElementById('chat-search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('.history-item').forEach(item => {
        const title = item.querySelector('.history-item-title').textContent.toLowerCase();
        item.style.display = title.includes(query) ? 'flex' : 'none';
    });
});

// === ЛОГИКА ЧАТОВ ===
let sessions = [];
let currentSessionId = null;

function loadMemory() {
    if(isGuest) return; 
    sessions = JSON.parse(localStorage.getItem('abduAiSessions')) || [];
    if (sessions.length > 0) {
        currentSessionId = localStorage.getItem('abduCurrentSessionId') || sessions[0].id;
        updateSidebar();
        renderCurrentChat();
    } else {
        createNewSession();
    }
}

function saveToMemory() {
    if(isGuest) return; 
    localStorage.setItem('abduAiSessions', JSON.stringify(sessions));
    localStorage.setItem('abduCurrentSessionId', currentSessionId);
}

function createNewSession() {
    if (isGuest && sessions.length > 0) {
        if(confirm("Гостевые чаты не сохраняются. Войти в аккаунт?")) {
            authPage.style.display = 'flex';
            mainApp.style.display = 'none';
            return;
        }
    }

    if (sessions.length > 0 && sessions[0].history.length === 0) {
        currentSessionId = sessions[0].id;
        updateSidebar();
        renderCurrentChat();
        
        // Закрываем мобильное меню, если оно открыто
        sidebar.classList.remove('mobile-open');
        mobileOverlay.classList.remove('active');
        return; 
    }

    if (abortController) abortController.abort();
    if (typingInterval) clearInterval(typingInterval);
    
    const newSession = { id: 'chat_' + Date.now(), title: 'Новый чат', history: [] };
    sessions.unshift(newSession);
    currentSessionId = newSession.id;
    saveToMemory();
    
    messagesWrapper.innerHTML = '';
    messageInput.value = '';
    welcomeScreen.style.display = 'flex';
    updateSidebar();
    
    // Закрываем мобильное меню при создании нового чата
    sidebar.classList.remove('mobile-open');
    mobileOverlay.classList.remove('active');
}
document.getElementById('new-chat-btn').addEventListener('click', createNewSession);

window.deleteSession = function(e, id) {
    e.stopPropagation();
    sessions = sessions.filter(s => s.id !== id);
    if (sessions.length === 0) createNewSession();
    else {
        if (currentSessionId === id) currentSessionId = sessions[0].id;
        saveToMemory();
        updateSidebar();
        renderCurrentChat();
    }
}

function updateSidebar() {
    chatHistoryContainer.innerHTML = '';
    sessions.forEach(session => {
        const item = document.createElement('div');
        item.className = `history-item ${session.id === currentSessionId ? 'active' : ''}`;
        item.innerHTML = `
            <span class="history-item-title">${session.title}</span>
            <button class="delete-chat-btn" onclick="deleteSession(event, '${session.id}')"><i class="fa-solid fa-trash"></i></button>
        `;
        item.onclick = () => {
            currentSessionId = session.id;
            saveToMemory();
            updateSidebar();
            renderCurrentChat();
            
            // ИСПРАВЛЕНИЕ: Прячем меню на телефоне после выбора чата
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('mobile-open');
                mobileOverlay.classList.remove('active');
            }
        };
        chatHistoryContainer.appendChild(item);
    });
}

function renderCurrentChat() {
    messagesWrapper.innerHTML = '';
    const currentSession = sessions.find(s => s.id === currentSessionId);
    
    if (currentSession && currentSession.history.length === 0) welcomeScreen.style.display = 'flex';
    else if (currentSession) {
        welcomeScreen.style.display = 'none';
        currentSession.history.forEach(msg => addStaticMessage(msg.parts[0].text, msg.role === 'user' ? 'user' : 'ai'));
    }
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

if (!isGuest) loadMemory();

// === АВТОРИЗАЦИЯ FIREBASE ===
document.getElementById('guest-login-btn').addEventListener('click', () => {
    isGuest = true;
    localStorage.setItem('abduIsGuest', 'true');
    authPage.style.display = 'none';
    mainApp.style.display = 'flex';
    document.getElementById('dropdown-name').textContent = "Гость";
    document.getElementById('dropdown-email').textContent = "Без сохранения истории";
    createNewSession(); 
});

document.getElementById('google-login-btn').addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(console.error);
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        isGuest = false;
        localStorage.setItem('abduIsGuest', 'false');
        authPage.style.display = 'none';
        mainApp.style.display = 'flex';
        
        profileAvatar.src = user.photoURL;
        document.getElementById('dropdown-avatar').src = user.photoURL;
        document.getElementById('dropdown-name').textContent = user.displayName;
        document.getElementById('dropdown-email').textContent = user.email;
        loadMemory(); 
    } else {
        if (!isGuest) {
            authPage.style.display = 'flex';
            mainApp.style.display = 'none';
        }
    }
});

document.getElementById('logout-all-btn').addEventListener('click', () => {
    signOut(auth).then(() => {
        isGuest = false;
        localStorage.setItem('abduIsGuest', 'false');
        location.reload(); 
    });
});

// === ОТПРАВКА ===
async function handleSendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    if (sessions.length === 0 || !currentSessionId) createNewSession();
    
    const currentSession = sessions.find(s => s.id === currentSessionId);
    if (currentSession.history.length === 0) {
        currentSession.title = text.length > 25 ? text.substring(0, 25) + '...' : text;
        welcomeScreen.style.display = 'none';
        updateSidebar();
    }

    addStaticMessage(text, 'user');
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    const aiRow = createEmptyAIBubble();
    const bubble = aiRow.querySelector('.message-bubble');
    
    abortController = new AbortController();
    toggleButtons(true);

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, history: currentSession.history }),
            signal: abortController.signal
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        typeText(bubble, data.text, () => {
            toggleButtons(false);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        });
        
        currentSession.history.push({ role: 'user', parts: [{ text: text }] });
        currentSession.history.push({ role: 'model', parts: [{ text: data.text }] });
        saveToMemory();

    } catch (err) {
        toggleButtons(false);
        bubble.innerHTML = err.name === 'AbortError' ? "<em>Остановлено</em>" : `Ошибка: ${err.message}`;
    }
}

function addStaticMessage(text, sender) {
    const div = document.createElement('div');
    div.className = `message-row ${sender}`;
    div.innerHTML = `<div class="message-bubble"></div>`;
    messagesWrapper.appendChild(div);
    div.querySelector('.message-bubble').innerHTML = (sender === 'ai' && typeof marked !== 'undefined') ? marked.parse(text) : escapeHTML(text);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function createEmptyAIBubble() {
    const div = document.createElement('div');
    div.className = `message-row ai`;
    div.innerHTML = `<div class="message-bubble typing-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
    messagesWrapper.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return div;
}

function typeText(element, text, callback) {
    let i = 0;
    element.innerHTML = ""; 
    element.classList.remove('typing-bubble'); 
    
    const chunkSize = 3; 
    typingInterval = setInterval(() => {
        if (i < text.length) {
            element.innerHTML = escapeHTML(text.substring(0, i + chunkSize)).replace(/\n/g, '<br>') + 
                '<span style="display:inline-block; width:8px; height:8px; background:var(--accent); border-radius:50%; margin-left:4px;"></span>';
            i += chunkSize;
            chatContainer.scrollTop = chatContainer.scrollHeight;
        } else {
            clearInterval(typingInterval);
            element.innerHTML = marked.parse(text);
            if (callback) callback();
        }
    }, 5); 
}

function toggleButtons(isGen) {
    sendBtn.style.display = isGen ? 'none' : 'flex';
    stopBtn.style.display = isGen ? 'flex' : 'none';
}

function escapeHTML(str) { return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)); }

messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px'; 
});
messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { 
        e.preventDefault(); 
        handleSendMessage(); 
    }
});

sendBtn.addEventListener('click', handleSendMessage);
stopBtn.addEventListener('click', () => {
    if (abortController) abortController.abort();
    if(typingInterval) clearInterval(typingInterval);
    toggleButtons(false);
});

document.getElementById('open-settings').addEventListener('click', () => document.getElementById('settings-modal').style.display = 'flex');
document.getElementById('close-settings').addEventListener('click', () => document.getElementById('settings-modal').style.display = 'none');
document.getElementById('clear-all-data-btn').addEventListener('click', () => {
    if(confirm("Удалить ВСЮ историю?")) {
        sessions = [];
        saveToMemory();
        createNewSession();
        document.getElementById('settings-modal').style.display = 'none';
    }
});