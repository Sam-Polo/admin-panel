// элементы интерфейса
let authContainer;
let adminPanel;
let loginForm;
let errorMessage;
let logoutBtn;

// инициализация элементов после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    authContainer = document.getElementById('auth-container');
    adminPanel = document.getElementById('admin-panel');
    loginForm = document.getElementById('login-form');
    errorMessage = document.getElementById('error-message');
    logoutBtn = document.getElementById('logout-btn');

    // обработка входа
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        console.log('Попытка входа:', email);
        
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            console.log('Успешный вход:', userCredential.user.email);
        } catch (error) {
            console.error('Ошибка входа:', error);
            showError('Ошибка входа: ' + error.message);
        }
    });

    // обработка выхода
    logoutBtn.addEventListener('click', async () => {
        try {
            await auth.signOut();
            window.location.href = 'index.html'; // редирект на главную страницу
        } catch (error) {
            console.error('Ошибка выхода:', error);
            showError('Ошибка выхода: ' + error.message);
        }
    });
});

// проверка состояния авторизации
auth.onAuthStateChanged(async (user) => {
    console.log('onAuthStateChanged вызван, user:', user ? user.email : 'null');
    
    if (user) {
        try {
            console.log('Получение токена...');
            // получение custom claims
            const idTokenResult = await user.getIdTokenResult(true); // force refresh
            console.log('Claims пользователя:', idTokenResult.claims);
            console.log('Полный токен:', idTokenResult.token);
            
            const isAdmin = idTokenResult.claims.admin === true;
            const isModerator = idTokenResult.claims.moderator === true;
            
            console.log('isAdmin:', isAdmin, 'isModerator:', isModerator);
            
            if (isAdmin || isModerator) {
                console.log('Доступ разрешен');
                // показываем панель управления
                authContainer.classList.add('hidden');
                adminPanel.classList.remove('hidden');
                
                // инициализируем панель управления
                initAdminPanel(user, isAdmin);
            } else {
                console.log('Доступ запрещен: нет прав');
                // если нет нужных прав - разлогиниваем
                await auth.signOut();
                showError('У вас нет доступа к панели управления');
            }
        } catch (error) {
            console.error('Ошибка при получении claims:', error);
            showError('Ошибка при проверке прав доступа: ' + error.message);
        }
    } else {
        console.log('Пользователь не авторизован');
        // показываем форму входа
        authContainer.classList.remove('hidden');
        adminPanel.classList.add('hidden');
    }
});

// показ ошибок
function showError(message) {
    errorMessage.textContent = message;
    setTimeout(() => {
        errorMessage.textContent = '';
    }, 5000);
} 