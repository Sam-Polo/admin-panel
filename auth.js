// элементы интерфейса
let authContainer;
let adminPanel;
let loginForm;
let errorMessage;
let logoutBtn;

// инициализация элементов после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен');
    
    // проверяем текущую страницу
    const isTagsPage = window.location.pathname.includes('object-tags.html');
    
    if (!isTagsPage) {
        // проверяем существование элементов только на главной странице
        authContainer = document.getElementById('auth-container');
        adminPanel = document.getElementById('admin-panel');
        loginForm = document.getElementById('login-form');
        errorMessage = document.getElementById('error-message');
        
        if (!authContainer || !adminPanel || !loginForm || !errorMessage) {
            console.error('Не найдены необходимые элементы DOM');
            return;
        }

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
        logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await auth.signOut();
                    window.location.href = 'index.html'; // редирект на главную страницу
                } catch (error) {
                    console.error('Ошибка выхода:', error);
                    showError('Ошибка выхода: ' + error.message);
                }
            });
        }
    }
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
            
            const isAdmin = idTokenResult.claims.admin === true;
            const isModerator = idTokenResult.claims.moderator === true;
            
            console.log('isAdmin:', isAdmin, 'isModerator:', isModerator);
            
            // проверяем текущую страницу
            const isTagsPage = window.location.pathname.includes('object-tags.html');
            
            if (!isTagsPage) {
                // проверяем существование элементов только на главной странице
                const authContainer = document.getElementById('auth-container');
                const adminPanel = document.getElementById('admin-panel');
                
                if (!authContainer || !adminPanel) {
                    console.error('Не найдены необходимые элементы DOM');
                    return;
                }
                
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
            }
        } catch (error) {
            console.error('Ошибка при получении claims:', error);
            showError('Ошибка при проверке прав доступа: ' + error.message);
        }
    } else {
        console.log('Пользователь не авторизован');
        // показываем форму входа только на главной странице
        if (!window.location.pathname.includes('object-tags.html')) {
            authContainer.classList.remove('hidden');
            adminPanel.classList.add('hidden');
        }
    }
});

// показ ошибок
function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.textContent = '';
        }, 5000);
    }
} 