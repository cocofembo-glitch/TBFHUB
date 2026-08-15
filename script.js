// Конфігурація Firebase Realtime Database
const firebaseConfig = {
  apiKey: "AIzaSyBVS6FfvN9JZokF2Jdma551wU3kmYGf1Do",
  authDomain: "tbfhub-773f7.firebaseapp.com",
  projectId: "tbfhub-773f7",
  storageBucket: "tbfhub-773f7.firebasestorage.app",
  messagingSenderId: "87707596444",
  appId: "1:87707596444:web:c7addcce66eb9c6b635f59",
  measurementId: "G-C6YPJXM5MJ",
  databaseURL: "https://tbfhub-773f7-default-rtdb.firebaseio.com"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Елементи UI
const loginTriggerBtn = document.getElementById('login-trigger-btn');
const loginModal = document.getElementById('login-modal');
const saveUserBtn = document.getElementById('save-user-btn');
const logoutBtn = document.getElementById('logout-btn');

const userProfile = document.getElementById('user-profile');
const userDisplayName = document.getElementById('user-display-name');
const userHandle = document.getElementById('user-handle');

const adminPanel = document.getElementById('admin-panel');
const addProjectForm = document.getElementById('add-project-form');
const projectsContainer = document.getElementById('projects-container');
const termPrompt = document.getElementById('term-prompt');

// Поточний користувач
let currentUser = null;

// --- 1. Логіка користувачів (LocalStorage) ---
function loadSession() {
    const savedData = localStorage.getItem('tbf_user');
    if (savedData) {
        currentUser = JSON.parse(savedData);
        applyUserSession();
    } else {
        resetUserSession();
    }
}

function applyUserSession() {
    if (!currentUser) return;

    loginTriggerBtn.style.display = 'none';
    userProfile.style.display = 'flex';
    userDisplayName.textContent = currentUser.name;
    userHandle.textContent = currentUser.username;

    // Зміна промпту в терміналі
    const cleanUsername = currentUser.username.replace('@', '').toLowerCase();
    termPrompt.textContent = `${cleanUsername}@tbfhub:~$`;

    // Перевірка на Адміна
    if (currentUser.username.toLowerCase() === '@cocofembo') {
        adminPanel.style.display = 'block';
    } else {
        adminPanel.style.display = 'none';
    }
}

function resetUserSession() {
    currentUser = null;
    localStorage.removeItem('tbf_user');
    loginTriggerBtn.style.display = 'inline-block';
    userProfile.style.display = 'none';
    adminPanel.style.display = 'none';
    termPrompt.textContent = 'guest@tbfhub:~$';
}

// Модалка входу
loginTriggerBtn.addEventListener('click', () => loginModal.style.display = 'flex');

saveUserBtn.addEventListener('click', () => {
    let username = document.getElementById('input-username').value.trim();
    let name = document.getElementById('input-displayname').value.trim();

    if (!username) return alert('Вкажи юзернейм!');
    if (!username.startsWith('@')) username = '@' + username;
    if (!name) name = username;

    // Спеціальний дефолт для адміна
    if (username.toLowerCase() === '@cocofembo' && name === '@cocofembo') {
        name = 'ADMIN.TBF';
    }

    currentUser = { username, name };
    localStorage.setItem('tbf_user', JSON.stringify(currentUser));
    
    loginModal.style.display = 'none';
    applyUserSession();
});

logoutBtn.addEventListener('click', resetUserSession);

// --- 2. Публікація проєктів у БД ---
if (addProjectForm) {
    addProjectForm.addEventListener('submit', (e) => {
        e.preventDefault();

        if (!currentUser || currentUser.username.toLowerCase() !== '@cocofembo') {
            alert('Тільки @cocofembo може публікувати проєкти!');
            return;
        }

        const title = document.getElementById('proj-title').value.trim();
        const tag = document.getElementById('proj-tag').value.trim();
        const desc = document.getElementById('proj-desc').value.trim();
        const code = document.getElementById('proj-code').value.trim();

        db.ref('projects').push({
            title, tag, desc, code,
            author: currentUser.name,
            timestamp: Date.now()
        }).then(() => {
            alert("🚀 Проєкт успішно опубліковано!");
            addProjectForm.reset();
        }).catch(err => alert("Помилка: " + err.message));
    });
}

// --- 3. Відображення проєктів ---
if (projectsContainer) {
    db.ref('projects').on('value', (snapshot) => {
        projectsContainer.innerHTML = "";
        const data = snapshot.val();

        if (!data) {
            projectsContainer.innerHTML = "<p style='color:#777; grid-column: 1/-1;'>Проєктів поки немає.</p>";
            return;
        }

        const projectsArray = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        projectsArray.sort((a, b) => b.timestamp - a.timestamp);

        projectsArray.forEach(proj => {
            const card = document.createElement('div');
            card.className = 'project-card';
            card.innerHTML = `
                <div class="project-header">
                    <h3>${escapeHtml(proj.title)}</h3>
                    <span class="project-tag">${escapeHtml(proj.tag)}</span>
                </div>
                <p class="project-desc">${escapeHtml(proj.desc)}</p>
                ${proj.code ? `<div class="project-code"><code>${escapeHtml(proj.code)}</code></div>` : ''}
            `;
            projectsContainer.appendChild(card);
        });
    });
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// --- 4. Інтерактивний Термінал ---
const cmdInput = document.getElementById('cmd-input');
const terminalOutput = document.getElementById('terminal-output');

if (cmdInput) {
    cmdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const cmd = cmdInput.value.trim().toLowerCase();
            cmdInput.value = '';

            const promptText = termPrompt.textContent;
            const line = document.createElement('p');
            line.innerHTML = `<span class="prompt">${promptText}</span> ${escapeHtml(cmd)}`;
            terminalOutput.appendChild(line);

            let response = '';

            switch (cmd) {
                case 'help':
                    response = 'Available commands: <span class="highlight">help, projects, clear, whoami, info</span>';
                    break;
                case 'projects':
                    db.ref('projects').once('value').then(snapshot => {
                        const data = snapshot.val();
                        if (!data) {
                            printTermMsg("No projects found.");
                        } else {
                            let list = "⚡ Ecosystem Projects:<br>";
                            Object.values(data).forEach(p => {
                                list += `• <span style="color:#00f0ff">${escapeHtml(p.title)}</span> [${escapeHtml(p.tag)}] - ${escapeHtml(p.desc)}<br>`;
                            });
                            printTermMsg(list);
                        }
                    });
                    return;
                case 'whoami':
                    response = currentUser 
                        ? `Logged in as: <span class="highlight">${escapeHtml(currentUser.name)}</span> (${escapeHtml(currentUser.username)})`
                        : 'Not logged in. Click "Увійти" above.';
                    break;
                case 'info':
                    response = '🔥 TBFHUB v1.0 — Web-Portfolio & Termux Ecosystem Showcase.';
                    break;
                case 'clear':
                    terminalOutput.innerHTML = '';
                    return;
                case '':
                    return;
                default:
                    response = `Command not found: <span style="color: #ff5f56;">${escapeHtml(cmd)}</span>. Type 'help' for options.`;
            }

            printTermMsg(response);
        }
    });
}

function printTermMsg(msg) {
    const resLine = document.createElement('p');
    resLine.className = 'system-msg';
    resLine.innerHTML = msg;
    terminalOutput.appendChild(resLine);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

// Ініціалізація при завантаженні
loadSession();
              
