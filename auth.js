// элементы интерфейса
const authContainer = document.getElementById('auth-container');
const adminPanel = document.getElementById('admin-panel');
const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');
const logoutBtn = document.getElementById('logout-btn');

// проверка состояния авторизации
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // получение custom claims
        const idTokenResult = await user.getIdTokenResult();
        const isSuperuser = idTokenResult.claims.superuser === true;
        const isModerator = idTokenResult.claims.moderator === true;
        
        if (isSuperuser || isModerator) {
            // показываем панель управления
            authContainer.classList.add('hidden');
            adminPanel.classList.remove('hidden');
            
            // инициализируем панель управления
            initAdminPanel(user, isSuperuser);
        } else {
            // если нет нужных прав - разлогиниваем
            await auth.signOut();
            showError('У вас нет доступа к панели управления');
        }
    } else {
        // показываем форму входа
        authContainer.classList.remove('hidden');
        adminPanel.classList.add('hidden');
    }
});

// обработка входа
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        showError('Ошибка входа: ' + error.message);
    }
});

// обработка выхода
logoutBtn.addEventListener('click', async () => {
    try {
        await auth.signOut();
    } catch (error) {
        showError('Ошибка выхода: ' + error.message);
    }
});

// показ ошибок
function showError(message) {
    errorMessage.textContent = message;
    setTimeout(() => {
        errorMessage.textContent = '';
    }, 5000);
} 