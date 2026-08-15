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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

let currentUser = null;

function isAdmin() {
    return currentUser && currentUser.username && currentUser.username.toLowerCase() === '@cocofembo';
}

// --- 1. Логіка сесії користувача ---
function loadSession() {
    const savedData = localStorage.getItem('tbf_user');
    
    // Якщо сесії немає взагалі і це перший запуск — ставимо за замовчуванням адміна
    if (savedData === null) {
        currentUser = { username: '@cocofembo', name: 'ADMIN.TBF' };
        localStorage.setItem('tbf_user', JSON.stringify(currentUser));
    } else if (savedData === 'guest') {
        currentUser = null;
    } else {
        try {
            currentUser = JSON.parse(savedData);
        } catch(e) {
            currentUser = null;
        }
    }
    applyUserSession();
}

function applyUserSession() {
    const loginTriggerBtn = document.getElementById('login-trigger-btn');
    const userProfile = document.getElementById('user-profile') || document.querySelector('.user-profile');
    const userDisplayName = document.getElementById('user-display-name');
    const userHandle = document.getElementById('user-handle');
    const adminPanel = document.getElementById('admin-panel') || document.querySelector('.admin-section');
    const termPrompt = document.getElementById('term-prompt');

    if (currentUser) {
        if (loginTriggerBtn) loginTriggerBtn.style.display = 'none';
        if (userProfile) userProfile.style.display = 'flex';
        if (userDisplayName) userDisplayName.textContent = currentUser.name;
        if (userHandle) userHandle.textContent = currentUser.username;

        const cleanUsername = currentUser.username.replace('@', '').toLowerCase();
        if (termPrompt) termPrompt.textContent = `${cleanUsername}@tbfhub:~$`;
    } else {
        if (loginTriggerBtn) loginTriggerBtn.style.display = 'inline-block';
        if (userProfile) userProfile.style.display = 'none';
        if (termPrompt) termPrompt.textContent = 'guest@tbfhub:~$';
    }

    if (adminPanel) {
        adminPanel.style.display = isAdmin() ? 'block' : 'none';
    }

    loadProjects();
}

function resetUserSession() {
    currentUser = null;
    localStorage.setItem('tbf_user', 'guest'); // Позначаємо, що користувач свідомо вийшов
    applyUserSession();
}

// Події модалки та кнопок
const loginTriggerBtn = document.getElementById('login-trigger-btn');
const loginModal = document.getElementById('login-modal');
const saveUserBtn = document.getElementById('save-user-btn');
const closeModalBtn = document.getElementById('close-modal-btn');

if (loginTriggerBtn) loginTriggerBtn.addEventListener('click', () => loginModal.style.display = 'flex');
if (closeModalBtn) closeModalBtn.addEventListener('click', () => loginModal.style.display = 'none');

// Обробка кліку на хрестик (вихід) у юзер-блоці
document.addEventListener('click', function(e) {
    if (e.target.id === 'logout-btn' || e.target.classList.contains('logout-btn') || e.target.textContent === '✕' || e.target.textContent === 'X') {
        if (e.target.closest('.user-profile') || e.target.closest('#user-profile')) {
            e.preventDefault();
            resetUserSession();
        }
    }
});

if (saveUserBtn) {
    saveUserBtn.addEventListener('click', () => {
        let username = document.getElementById('input-username')?.value.trim() || '';
        let name = document.getElementById('input-displayname')?.value.trim() || '';

        if (!username) return alert('Заповни юзернейм!');
        if (!username.startsWith('@')) username = '@' + username;
        if (!name) name = username;

        if (username.toLowerCase() === '@cocofembo') {
            name = 'ADMIN.TBF';
        }

        currentUser = { username: username.toLowerCase(), name: name };
        localStorage.setItem('tbf_user', JSON.stringify(currentUser));
        
        if (loginModal) loginModal.style.display = 'none';
        applyUserSession();
    });
}

// --- 2. Публікація проєктів ---
document.addEventListener('click', function(e) {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.id === 'publish-btn' || btn.classList.contains('admin-submit-btn') || btn.innerText.includes('Опублікувати')) {
        e.preventDefault();

        if (!isAdmin()) {
            alert('Тільки @cocofembo може публікувати проєкти!');
            return;
        }

        const adminContainer = btn.closest('.admin-section') || btn.closest('#admin-panel') || btn.parentElement;
        const fields = Array.from(adminContainer.querySelectorAll('input, textarea'));

        let title = '', tag = '', desc = '', code = '';

        fields.forEach(f => {
            const id = (f.id || '').toLowerCase();
            const ph = (f.placeholder || '').toLowerCase();

            if (id.includes('title') || ph.includes('назва')) title = f.value.trim();
            else if (id.includes('tag') || ph.includes('тег') || ph.includes('стек')) tag = f.value.trim();
            else if (id.includes('desc') || ph.includes('опис') || f.tagName === 'TEXTAREA') desc = f.value.trim();
            else if (id.includes('code') || ph.includes('команда') || ph.includes('посилання')) code = f.value.trim();
        });

        if (!title && fields[0]) title = fields[0].value.trim();
        if (!tag && fields[1]) tag = fields[1].value.trim();
        if (!desc && fields[2]) desc = fields[2].value.trim();
        if (!code && fields[3]) code = fields[3].value.trim();

        if (!title || !desc) {
            alert('Заповни Назву та Опис проєкту!');
            return;
        }

        const originalText = btn.innerText;
        btn.innerText = "Публікація...";

        db.ref('projects').push({
            title: title,
            tag: tag || 'General',
            desc: desc,
            code: code || '',
            author: currentUser.name,
            timestamp: Date.now()
        }).then(() => {
            fields.forEach(f => f.value = '');
            btn.innerText = originalText;
            alert("Опубліковано успішно!");
        }).catch(err => {
            alert("Помилка БД: " + err.message);
            btn.innerText = originalText;
        });
    }
});

// --- 3. Відображення та видалення проєктів ---
function loadProjects() {
    const projectsContainer = document.getElementById('projects-container') || document.querySelector('.projects-grid');
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
const terminalOutput = document.getElementById('terminal-output') || document.querySelector('.terminal-body');

if (cmdInput) {
    cmdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const cmd = cmdInput.value.trim().toLowerCase();
            cmdInput.value = '';

            const termPrompt = document.getElementById('term-prompt');
            const promptText = termPrompt ? termPrompt.textContent : 'guest@tbfhub:~$';
            
            const line = document.createElement('p');
            line.innerHTML = `<span class="prompt">${promptText}</span> ${escapeHtml(cmd)}`;
            if (terminalOutput) terminalOutput.appendChild(line);

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
                        : 'Not logged in.';
                    break;
                case 'info':
                    response = '🔥 TBFHUB v1.0 — Web-Portfolio & Termux Ecosystem Showcase.';
                    break;
                case 'clear':
                    if (terminalOutput) terminalOutput.innerHTML = '';
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
    if (!terminalOutput) return;
    const resLine = document.createElement('p');
    resLine.className = 'system-msg';
    resLine.innerHTML = msg;
    terminalOutput.appendChild(resLine);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

loadSession();
              
