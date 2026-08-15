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
const closeModalBtn = document.getElementById('close-modal-btn');
const logoutBtn = document.getElementById('logout-btn');

const userProfile = document.getElementById('user-profile');
const userDisplayName = document.getElementById('user-display-name');
const userHandle = document.getElementById('user-handle');

const adminPanel = document.getElementById('admin-panel');
const projectsContainer = document.getElementById('projects-container');
const termPrompt = document.getElementById('term-prompt');

let currentUser = null;

// Перевірка чи є користувач адміном
function isAdmin() {
    return currentUser && currentUser.username && currentUser.username.toLowerCase() === '@cocofembo';
}

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

    if (loginTriggerBtn) loginTriggerBtn.style.display = 'none';
    if (userProfile) userProfile.style.display = 'flex';
    if (userDisplayName) userDisplayName.textContent = currentUser.name;
    if (userHandle) userHandle.textContent = currentUser.username;

    const cleanUsername = currentUser.username.replace('@', '').toLowerCase();
    if (termPrompt) termPrompt.textContent = `${cleanUsername}@tbfhub:~$`;

    if (isAdmin()) {
        if (adminPanel) adminPanel.style.display = 'block';
    } else {
        if (adminPanel) adminPanel.style.display = 'none';
    }

    loadProjects();
}

function resetUserSession() {
    currentUser = null;
    localStorage.removeItem('tbf_user');
    if (loginTriggerBtn) loginTriggerBtn.style.display = 'inline-block';
    if (userProfile) userProfile.style.display = 'none';
    if (adminPanel) adminPanel.style.display = 'none';
    if (termPrompt) termPrompt.textContent = 'guest@tbfhub:~$';
    
    loadProjects();
}

if (loginTriggerBtn) loginTriggerBtn.addEventListener('click', () => loginModal.style.display = 'flex');
if (closeModalBtn) closeModalBtn.addEventListener('click', () => loginModal.style.display = 'none');

if (saveUserBtn) {
    saveUserBtn.addEventListener('click', () => {
        let username = document.getElementById('input-username').value.trim();
        let name = document.getElementById('input-displayname').value.trim();

        if (!username) return alert('Заповни юзернейм!');
        if (!username.startsWith('@')) username = '@' + username;
        if (!name) name = username;

        if (username.toLowerCase() === '@cocofembo') {
            name = 'ADMIN.TBF';
        }

        currentUser = { username: username.toLowerCase(), name: name };
        localStorage.setItem('tbf_user', JSON.stringify(currentUser));
        
        loginModal.style.display = 'none';
        applyUserSession();
    });
}

if (logoutBtn) logoutBtn.addEventListener('click', resetUserSession);

// --- 2. Публікація проєктів у БД ---
const publishBtn = document.getElementById('publish-btn');

if (publishBtn) {
    publishBtn.addEventListener('click', () => {
        if (!isAdmin()) {
            alert('Тільки @cocofembo може публікувати проєкти!');
            return;
        }

        const title = document.getElementById('proj-title').value.trim();
        const tag = document.getElementById('proj-tag').value.trim();
        const desc = document.getElementById('proj-desc').value.trim();
        const code = document.getElementById('proj-code').value.trim();

        if (!title || !desc) {
            alert('Заповни назву та опис!');
            return;
        }

        publishBtn.innerText = "Публікація...";

        db.ref('projects').push({
            title: title,
            tag: tag || 'General',
            desc: desc,
            code: code || '',
            author: currentUser.name,
            timestamp: Date.now()
        }).then(() => {
            document.getElementById('proj-title').value = '';
            document.getElementById('proj-tag').value = '';
            document.getElementById('proj-desc').value = '';
            document.getElementById('proj-code').value = '';
            publishBtn.innerText = "🚀 Опублікувати проєкт";
            alert("Опубліковано!");
        }).catch(err => {
            alert("Помилка БД: " + err.message);
            publishBtn.innerText = "🚀 Опублікувати проєкт";
        });
    });
}

// --- 3. Відображення та видалення проєктів ---
function loadProjects() {
    if (!projectsContainer) return;

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
                ${isAdmin() ? `<button class="delete-btn" onclick="deleteProject('${proj.id}')">🗑 Видалити</button>` : ''}
            `;
            projectsContainer.appendChild(card);
        });
    });
}

// Функція видалення
window.deleteProject = function(id) {
    if (!isAdmin()) return;
    if (confirm("Точно видалити цей проєкт?")) {
        db.ref('projects/' + id).remove()
            .then(() => alert("Проєкт видалено!"))
            .catch(err => alert("Помилка: " + err.message));
    }
};

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

            const promptText = termPrompt ? termPrompt.textContent : 'guest@tbfhub:~$';
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

loadSession();

