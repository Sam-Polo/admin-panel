// инициализация панели управления
function initAdminPanel(user, isAdmin) {
    console.log('initAdminPanel вызван:', { user: user.email, isAdmin });
    
    // проверяем существование элементов
    const adminPanel = document.getElementById('admin-panel');
    const authContainer = document.getElementById('auth-container');
    
    if (!adminPanel || !authContainer) {
        console.error('Не найдены необходимые элементы DOM');
        return;
    }
    
    // скрываем контейнер авторизации и показываем панель
    authContainer.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    
    // скрываем элементы, доступные только админу
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = isAdmin ? '' : 'none';
    });
    
    // отображаем email пользователя
    const userEmail = document.getElementById('user-email');
    if (userEmail) {
        userEmail.textContent = user.email;
    } else {
        console.error('Не найден элемент для отображения email');
    }
    
    // обработчики навигации
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            console.log('Нажата кнопка навигации:', e.target.dataset.page);
            
            if (!isAdmin && e.target.dataset.page === 'users') {
                console.log('Доступ запрещен: пользователь не админ');
                return;
            }
            
            // обновляем активную кнопку
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // показываем нужную страницу
            const page = e.target.dataset.page;
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            const targetPage = document.getElementById(`${page}-page`);
            if (targetPage) {
                targetPage.classList.add('active');
                console.log(`Страница ${page} активирована`);
                
                // загружаем данные страницы
                if (page === 'objects') {
                    console.log('Загрузка объектов...');
                    loadObjects(user, isAdmin);
                } else if (page === 'users' && isAdmin) {
                    console.log('Загрузка пользователей...');
                    loadUsers();
                }
            } else {
                console.error(`Не найдена страница: ${page}-page`);
            }
        });
    });
    
    // загружаем начальные данные
    console.log('Загрузка начальных данных...');
    loadObjects(user, isAdmin);
}

// загрузка объектов
async function loadObjects(user, isAdmin) {
    console.log('loadObjects вызван:', { user: user.email, isAdmin });
    
    const objectsList = document.getElementById('objects-list');
    if (!objectsList) {
        console.error('Не найден элемент objects-list');
        return;
    }
    
    const tbody = objectsList.querySelector('tbody');
    if (!tbody) {
        console.error('Не найден элемент tbody в таблице объектов');
        return;
    }
    
    tbody.innerHTML = '<tr><td colspan="4" class="loading">Загрузка...</td></tr>';
    
    try {
        let query = db.collection('sportobjects');
        console.log('Начальный запрос к Firestore');
        
        // если не админ, показываем только доступные объекты
        if (!isAdmin) {
            console.log('Пользователь не админ, получаем доступные объекты');
            const idTokenResult = await user.getIdTokenResult();
            const objectIds = idTokenResult.claims.objectIds || [];
            console.log('Доступные объекты:', objectIds);
            
            if (objectIds.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="empty">У вас нет доступных объектов</td></tr>';
                return;
            }
            
            query = query.where('__name__', 'in', objectIds);
        }
        
        const snapshot = await query.get();
        console.log('Получено объектов:', snapshot.size);
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty">Нет объектов</td></tr>';
            return;
        }
        
        // заполняем таблицу
        tbody.innerHTML = ''; // очищаем таблицу
        
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log('Обработка объекта:', { id: doc.id, name: data.name });
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${data.name}</td>
                <td>${data.address}</td>
                <td>${data.tags ? data.tags.length : 0}</td>
                <td class="actions">
                    <button class="btn-edit" data-id="${doc.id}">Редактировать</button>
                    <button class="btn-tags" data-id="${doc.id}">Теги объекта</button>
                    <button class="btn-delete" data-id="${doc.id}">Удалить</button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // добавляем обработчики
        addObjectHandlers(user);
        
    } catch (error) {
        console.error('Ошибка загрузки объектов:', error);
        tbody.innerHTML = `<tr><td colspan="4" class="error">Ошибка загрузки: ${error.message}</td></tr>`;
    }
}

// загрузка пользователей
async function loadUsers() {
    console.log('loadUsers вызван');
    try {
        console.log('Получение токена...');
        // получаем текущий токен
        const idToken = await auth.currentUser.getIdToken();
        console.log('Токен получен:', idToken ? 'да' : 'нет');
        
        console.log('Отправка запроса к API...');
        const response = await fetch('http://localhost:3001/api/users', {
            headers: {
                'Authorization': `Bearer ${idToken}`
            }
        });
        console.log('Ответ получен, статус:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ошибка ответа:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, text: ${errorText}`);
        }
        
        const users = await response.json();
        console.log('Получено пользователей:', users.length);
        
        // обновляем таблицу
        const tbody = document.querySelector('#users-list tbody');
        if (!tbody) {
            console.error('Не найден элемент tbody в таблице пользователей');
            return;
        }
        
        tbody.innerHTML = '';
        
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.email}</td>
                <td>
                    <select class="role-select" data-uid="${user.uid}">
                        <option value="user" ${!user.isAdmin && !user.isModerator ? 'selected' : ''}>Пользователь</option>
                        <option value="moderator" ${user.isModerator ? 'selected' : ''}>Модератор</option>
                        <option value="admin" ${user.isAdmin ? 'selected' : ''}>Админ</option>
                    </select>
                </td>
                <td>
                    <button class="delete-user" data-uid="${user.uid}">Удалить</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        // добавляем обработчики
        addUserHandlers();
        
    } catch (error) {
        console.error('Ошибка при загрузке пользователей:', error);
        showError('Ошибка при загрузке пользователей: ' + error.message);
    }
}

// добавление обработчиков для объектов
function addObjectHandlers(user) {
    // обработчик добавления
    document.getElementById('add-object-btn').addEventListener('click', () => {
        // TODO: показать форму добавления объекта
    });
    
    // обработчики редактирования, тегов и удаления
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            // TODO: показать форму редактирования объекта
        });
    });
    
    document.querySelectorAll('.btn-tags').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            // TODO: показать форму управления тегами объекта
        });
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('Удалить объект?')) {
                try {
                    await db.collection('sportobjects').doc(btn.dataset.id).delete();
                    loadObjects(user, true); // перезагружаем список
                } catch (error) {
                    alert('Ошибка удаления: ' + error.message);
                }
            }
        });
    });
}

// добавление обработчиков для пользователей
function addUserHandlers() {
    // обработчик добавления
    document.getElementById('add-user-btn').addEventListener('click', () => {
        showUserModal();
    });
    
    // обработчики сохранения роли
    document.querySelectorAll('.btn-save').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.dataset.id;
            const roleSelect = document.querySelector(`.role-select[data-id="${userId}"]`);
            const newRole = roleSelect.value;
            
            try {
                // обновляем роль через API
                const response = await fetch(`http://localhost:3001/api/users/${userId}/role`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        role: newRole
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Ошибка обновления роли');
                }
                
                alert('Роль успешно обновлена');
                loadUsers(); // перезагружаем список
                
            } catch (error) {
                alert('Ошибка обновления роли: ' + error.message);
            }
        });
    });
    
    // обработчики удаления
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('Удалить пользователя?')) {
                try {
                    const response = await fetch(`http://localhost:3001/api/users/${btn.dataset.id}`, {
                        method: 'DELETE'
                    });
                    
                    if (!response.ok) {
                        throw new Error('Ошибка удаления пользователя');
                    }
                    
                    loadUsers(); // перезагружаем список
                } catch (error) {
                    alert('Ошибка удаления: ' + error.message);
                }
            }
        });
    });
}

// модальное окно для пользователей
let currentUserId = null;

function showUserModal(userId = null) {
    currentUserId = userId;
    const modal = document.getElementById('user-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('user-form');
    const objectIdsContainer = document.getElementById('object-ids-container');
    
    // очищаем форму
    form.reset();
    
    if (userId) {
        // режим редактирования
        title.textContent = 'Редактировать пользователя';
        // TODO: загрузить данные пользователя
    } else {
        // режим добавления
        title.textContent = 'Добавить пользователя';
        objectIdsContainer.classList.add('hidden');
    }
    
    modal.classList.remove('hidden');
}

function closeUserModal() {
    const modal = document.getElementById('user-modal');
    modal.classList.add('hidden');
    currentUserId = null;
}

// обработчик формы пользователя
document.getElementById('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('user-email').value;
    const role = document.getElementById('user-role').value;
    
    try {
        if (currentUserId) {
            // обновление существующего пользователя
            const response = await fetch(`http://localhost:3001/api/users/${currentUserId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    role,
                    objectIds: role === 'moderator' ? 
                        Array.from(document.querySelectorAll('#object-ids-list input:checked'))
                            .map(input => input.value) : 
                        undefined
                })
            });
            
            if (!response.ok) {
                throw new Error('Ошибка обновления пользователя');
            }
            
        } else {
            // создание нового пользователя
            const password = Math.random().toString(36).slice(-8); // генерируем случайный пароль
            
            const response = await fetch('http://localhost:3001/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password,
                    role,
                    objectIds: role === 'moderator' ? 
                        Array.from(document.querySelectorAll('#object-ids-list input:checked'))
                            .map(input => input.value) : 
                        undefined
                })
            });
            
            if (!response.ok) {
                throw new Error('Ошибка создания пользователя');
            }
            
            alert(`Пользователь создан. Пароль: ${password}`);
        }
        
        closeUserModal();
        loadUsers(); // перезагружаем список
        
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}); 