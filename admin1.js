// admin1.js:
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
        
        const template = document.getElementById('object-row-template');
        if (!template) {
            console.error('Не найден шаблон строки объекта');
            return;
        }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log('Обработка объекта:', { id: doc.id, name: data.name });
            
            const clone = template.content.cloneNode(true);
            
            // заполняем данные
            clone.querySelector('.object-name').textContent = data.name;
            clone.querySelector('.object-address').textContent = data.address;
            clone.querySelector('.object-tags').textContent = data.tags ? data.tags.length : 0;
            
            // устанавливаем id для кнопок и добавляем обработчики
            const editBtn = clone.querySelector('.btn-edit');
            const tagsBtn = clone.querySelector('.btn-tags');
            const deleteBtn = clone.querySelector('.btn-delete');
            
            console.log('Найдены кнопки:', {
                edit: editBtn ? 'да' : 'нет',
                tags: tagsBtn ? 'да' : 'нет',
                delete: deleteBtn ? 'да' : 'нет'
            });
            
            if (!editBtn) {
                console.error('Кнопка редактирования не найдена в шаблоне');
                return;
            }
            
            editBtn.dataset.id = doc.id;
            tagsBtn.dataset.id = doc.id;
            deleteBtn.dataset.id = doc.id;
            
            // добавляем обработчики сразу к клонированным кнопкам
            editBtn.addEventListener('click', (e) => {
                console.log('Клик по кнопке редактирования:', {
                    id: doc.id,
                    target: e.target,
                    currentTarget: e.currentTarget
                });
                window.location.href = `edit-object.html?id=${doc.id}`;
            });
            
            tagsBtn.addEventListener('click', () => {
                console.log('Управление тегами объекта:', doc.id);
                // TODO: показать форму управления тегами объекта
            });
            
            deleteBtn.addEventListener('click', async () => {
                if (confirm('Удалить объект?')) {
                    try {
                        await db.collection('sportobjects').doc(doc.id).delete();
                        loadObjects(user, isAdmin); // перезагружаем список
                    } catch (error) {
                        alert('Ошибка удаления: ' + error.message);
                    }
                }
            });
            
            tbody.appendChild(clone);
            
            // проверяем, что кнопка действительно добавлена в DOM
            const addedEditBtn = tbody.querySelector(`.btn-edit[data-id="${doc.id}"]`);
            console.log('Кнопка добавлена в DOM:', addedEditBtn ? 'да' : 'нет');
        });
        
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

// добавление обработчиков для пользователей
function addUserHandlers() {
    // обработчик добавления
    document.getElementById('add-user-btn').addEventListener('click', () => {
        showUserModal();
    });
    
    // обработчики сохранения роли
    document.querySelectorAll('.role-select').forEach(select => {
        select.addEventListener('change', async () => {
            const userId = select.dataset.uid;
            const newRole = select.value;
            
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
    document.querySelectorAll('.delete-user').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('Удалить пользователя?')) {
                try {
                    const response = await fetch(`http://localhost:3001/api/users/${btn.dataset.uid}`, {
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

// обработчик добавления объекта
document.getElementById('add-object-btn').addEventListener('click', () => {
    // TODO: показать форму добавления объекта
    console.log('Добавление нового объекта');
});

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