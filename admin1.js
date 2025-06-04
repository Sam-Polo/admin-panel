// admin1.js:
// инициализация панели управления
function initAdminPanel(user, isAdmin) {
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
            if (!isAdmin && e.target.dataset.page === 'users') {
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
                
                // загружаем данные страницы
                if (page === 'objects') {
                    loadObjects(user, isAdmin);
                } else if (page === 'users' && isAdmin) {
                    loadUsers();
                }
            } else {
                console.error(`Не найдена страница: ${page}-page`);
            }
        });
    });
    
    // загружаем начальные данные
    loadObjects(user, isAdmin);

    // добавляем обработчик кнопки "Добавить объект"
    const addObjectBtn = document.getElementById('add-object-btn');
    if (addObjectBtn) {
        addObjectBtn.addEventListener('click', () => {
            window.location.href = 'add-object.html';
        });
    }
}

// загрузка объектов
async function loadObjects(user, isAdmin, retryCount = 0) {
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
    
    // показываем индикатор загрузки
    tbody.innerHTML = '<tr><td colspan="4" class="loading">Загрузка объектов...</td></tr>';
    
    try {
        let query = db.collection('sportobjects');
        
        // если не админ, показываем только доступные объекты
        if (!isAdmin) {
            const idTokenResult = await user.getIdTokenResult();
            const objectIds = idTokenResult.claims.objectIds || [];
            
            if (objectIds.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="empty">У вас нет доступных объектов</td></tr>';
                return;
            }
            
            query = query.where('__name__', 'in', objectIds);
        }
        
        // добавляем таймаут для запроса
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 5000);
        });
        
        const snapshot = await Promise.race([
            query.get(),
            timeoutPromise
        ]);
        
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
        
        // создаем DocumentFragment для оптимизации производительности
        const fragment = document.createDocumentFragment();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            
            const clone = template.content.cloneNode(true);
            
            // заполняем данные
            clone.querySelector('.object-name').textContent = data.name;
            clone.querySelector('.object-address').textContent = data.address;
            clone.querySelector('.object-tags').textContent = data.tags ? data.tags.length : 0;
            
            // устанавливаем id для кнопок
            const editBtn = clone.querySelector('.btn-edit');
            const tagsBtn = clone.querySelector('.btn-tags');
            const deleteBtn = clone.querySelector('.btn-delete');
            
            editBtn.dataset.id = doc.id;
            tagsBtn.dataset.id = doc.id;
            deleteBtn.dataset.id = doc.id;
            
            // добавляем кнопку управления фото
            const photosBtn = document.createElement('button');
            photosBtn.className = 'btn-photos';
            photosBtn.dataset.id = doc.id;
            photosBtn.textContent = 'Управление фото';
            photosBtn.title = 'Управление фото';
            
            // вставляем кнопку перед кнопкой удаления
            deleteBtn.parentNode.insertBefore(photosBtn, deleteBtn);
            
            // скрываем кнопку удаления для модераторов
            if (!isAdmin) {
                deleteBtn.style.display = 'none';
            }
            
            fragment.appendChild(clone);
        });
        
        // добавляем все строки одним действием
        tbody.appendChild(fragment);
        
        // добавляем обработчики после добавления всех строк
        tbody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.dataset.id;
                window.location.href = `edit-object.html?id=${id}`;
            });
        });
        
        tbody.querySelectorAll('.btn-tags').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                window.location.href = `object-tags.html?id=${id}`;
            });
        });
        
        tbody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const objectName = btn.closest('tr').querySelector('.object-name').textContent;
                if (confirm(`Удалить объект "${objectName}"?`)) {
                    try {
                        await db.collection('sportobjects').doc(id).delete();
                        showSuccess('Объект успешно удален');
                        loadObjects(user, isAdmin); // перезагружаем список
                    } catch (error) {
                        showError('Ошибка удаления: ' + error.message);
                    }
                }
            });
        });
        
        tbody.querySelectorAll('.btn-photos').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                window.location.href = `object-photos.html?id=${id}`;
            });
        });
        
    } catch (error) {
        console.error('Ошибка загрузки объектов:', error);
        
        // если это ошибка таймаута или подключения, пробуем повторить
        if ((error.message === 'Timeout' || error.message.includes('Could not reach Cloud Firestore backend')) && retryCount < 3) {
            tbody.innerHTML = '<tr><td colspan="4" class="loading">Переподключение к серверу...</td></tr>';
            
            // ждем перед повторной попыткой
            await new Promise(resolve => setTimeout(resolve, 2000));
            return loadObjects(user, isAdmin, retryCount + 1);
        }
        
        tbody.innerHTML = `<tr><td colspan="4" class="error">Ошибка загрузки: ${error.message}</td></tr>`;
    }
}

// загрузка пользователей
async function loadUsers() {
    console.log('loadUsers вызван');
    try {
        if (!auth.currentUser) {
            throw new Error('Пользователь не авторизован');
        }
        
        // получаем токен для авторизации
        const token = await auth.currentUser.getIdToken();
        
        // получаем список пользователей через API
        const response = await fetch('http://localhost:3001/api/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка получения списка пользователей');
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
                <td>${user.isAdmin ? 'Админ' : 'Модератор'}</td>
                <td>${user.isAdmin ? 'ВСЕ' : (user.objectIds ? user.objectIds.length : 0) + ' об.'}</td>
                <td>
                    <button class="edit-user" data-uid="${user.uid}">Изменить</button>
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
    
    // обработчики редактирования
    document.querySelectorAll('.edit-user').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.dataset.uid;
            showUserModal(userId);
        });
    });
    
    // обработчики удаления
    document.querySelectorAll('.delete-user').forEach(btn => {
        btn.addEventListener('click', async () => {
            const email = btn.closest('tr').querySelector('td:first-child').textContent;
            if (confirm(`Удалить пользователя ${email}?`)) {
                try {
                    const token = await auth.currentUser.getIdToken();
                    const response = await fetch(`http://localhost:3001/api/users/${btn.dataset.uid}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
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

// загрузка объектов для выбора
async function loadObjectsForSelection() {
    const form = document.getElementById('user-form');
    if (!form) {
        console.error('Форма не найдена');
        return;
    }

    // проверяем существование контейнера
    let objectIdsContainer = document.getElementById('object-ids-container');
    if (!objectIdsContainer) {
        // создаем контейнер, если его нет
        objectIdsContainer = document.createElement('div');
        objectIdsContainer.id = 'object-ids-container';
        objectIdsContainer.innerHTML = `
            <label>Доступные объекты:</label>
            <div class="search-container">
                <input type="text" id="object-search" placeholder="Поиск объектов...">
            </div>
            <div id="object-ids-list" class="objects-list"></div>
        `;
        form.insertBefore(objectIdsContainer, form.querySelector('.modal-buttons'));
    }
    
    try {
        const objects = await db.collection('sportobjects').get();
        
        // создаем список объектов
        const objectsList = document.createElement('div');
        objectsList.id = 'object-ids-list';
        objectsList.className = 'objects-list';
        
        objects.forEach(doc => {
            const data = doc.data();
            const div = document.createElement('div');
            div.className = 'object-item';
            div.innerHTML = `
                <input type="checkbox" id="obj-${doc.id}" value="${doc.id}">
                <label for="obj-${doc.id}">${data.name}</label>
            `;
            objectsList.appendChild(div);
        });

        // очищаем контейнер и добавляем новый список
        const existingList = objectIdsContainer.querySelector('#object-ids-list');
        if (existingList) {
            existingList.replaceWith(objectsList);
        } else {
            objectIdsContainer.appendChild(objectsList);
        }

        // добавляем поиск
        const searchInput = objectIdsContainer.querySelector('#object-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchText = e.target.value.toLowerCase();
                document.querySelectorAll('.object-item').forEach(item => {
                    const label = item.querySelector('label').textContent.toLowerCase();
                    item.style.display = label.includes(searchText) ? '' : 'none';
                });
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки объектов:', error);
    }
}

// модальное окно для пользователей
let currentUserId = null;
let currentUserObjects = []; // сохраняем текущие объекты пользователя

async function showUserModal(userId = null) {
    currentUserId = userId;
    currentUserObjects = []; // сбрасываем список объектов
    
    const modal = document.getElementById('user-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('user-form');
    
    // проверяем существование элементов
    if (!modal || !title || !form) {
        console.error('Не найдены необходимые элементы модального окна');
        return;
    }
    
    // очищаем форму
    form.reset();
    
    // восстанавливаем структуру формы
    form.innerHTML = `
        <div class="form-group">
            <label>Email:</label>
            <input type="email" id="user-email" placeholder="Email" required>
        </div>
        <div class="form-group">
            <label>Роль:</label>
            <select id="user-role" required>
                <option value="moderator">Модератор</option>
                <option value="admin">Админ</option>
            </select>
        </div>
        <div id="object-ids-container">
            <label>Доступные объекты:</label>
            <div class="search-container">
                <input type="text" id="object-search" placeholder="Поиск объектов...">
            </div>
            <div id="object-ids-list" class="objects-list"></div>
        </div>
        <div class="modal-buttons">
            <button type="submit" class="btn-primary">Сохранить</button>
            <button type="button" class="btn-cancel" onclick="closeUserModal()">Отмена</button>
        </div>
    `;
    
    // добавляем обработчик изменения роли
    const roleSelect = form.querySelector('#user-role');
    roleSelect.addEventListener('change', async (e) => {
        const objectIdsContainer = form.querySelector('#object-ids-container');
        
        if (e.target.value === 'admin') {
            objectIdsContainer.innerHTML = '<div class="all-objects">ВСЕ</div>';
        } else {
            // восстанавливаем структуру контейнера объектов
            objectIdsContainer.innerHTML = `
                <label>Доступные объекты:</label>
                <div class="search-container">
                    <input type="text" id="object-search" placeholder="Поиск объектов...">
                </div>
                <div id="object-ids-list" class="objects-list"></div>
            `;
            
            // загружаем объекты и отмечаем только те, что были у пользователя
            const objects = await db.collection('sportobjects').get();
            const objectsList = objectIdsContainer.querySelector('#object-ids-list');
            
            objects.forEach(doc => {
                const data = doc.data();
                const div = document.createElement('div');
                div.className = 'object-item';
                div.innerHTML = `
                    <input type="checkbox" id="obj-${doc.id}" value="${doc.id}" 
                        ${currentUserObjects.includes(doc.id) ? 'checked' : ''}>
                    <label for="obj-${doc.id}">${data.name}</label>
                `;
                objectsList.appendChild(div);
            });
            
            // добавляем поиск
            const searchInput = objectIdsContainer.querySelector('#object-search');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const searchText = e.target.value.toLowerCase();
                    document.querySelectorAll('.object-item').forEach(item => {
                        const label = item.querySelector('label').textContent.toLowerCase();
                        item.style.display = label.includes(searchText) ? '' : 'none';
                    });
                });
            }
        }
    });
    
    if (userId) {
        // режим редактирования
        title.textContent = 'Редактировать пользователя';
        
        // получаем данные пользователя через API
        const token = await auth.currentUser.getIdToken();
        const response = await fetch(`http://localhost:3001/api/users/${userId}/claims`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка получения данных пользователя');
        }
        
        const userData = await response.json();
        
        // сохраняем текущие объекты пользователя
        currentUserObjects = userData.customClaims?.objectIds || [];
        
        // отображаем email как текст
        const emailContainer = form.querySelector('.form-group');
        emailContainer.innerHTML = `
            <label>Email:</label>
            <div class="user-email-display">${userData.email}</div>
            <input type="hidden" id="user-email" value="${userData.email}">
        `;
        
        // устанавливаем роль
        roleSelect.value = userData.customClaims?.admin ? 'admin' : 'moderator';
        
        // загружаем объекты
        if (userData.customClaims?.admin) {
            const objectIdsContainer = form.querySelector('#object-ids-container');
            objectIdsContainer.innerHTML = '<div class="all-objects">ВСЕ</div>';
        } else {
            await loadObjectsForSelection();
            // отмечаем выбранные объекты
            currentUserObjects.forEach(id => {
                const checkbox = form.querySelector(`#obj-${id}`);
                if (checkbox) checkbox.checked = true;
            });
        }
    } else {
        // режим добавления
        title.textContent = 'Добавить пользователя';
        await loadObjectsForSelection();
    }
    
    modal.classList.remove('hidden');
}

function closeUserModal() {
    const modal = document.getElementById('user-modal');
    modal.classList.add('hidden');
    currentUserId = null;
}

// флаг для включения/отключения сохранения информации о пользователях
const SAVE_USERS_TO_FILE = true;

// функция для сохранения информации о пользователе в файл
async function saveUserInfoToFile(userData) {
    if (!SAVE_USERS_TO_FILE) return;
    
    try {
        // проверяем обязательные поля
        if (!userData.email || !userData.uid || !userData.role) {
            throw new Error('Отсутствуют обязательные поля');
        }
        
        const userInfo = {
            email: userData.email,
            uid: userData.uid,
            role: userData.role,
            objectIds: userData.objectIds || [],
            createdAt: new Date().toISOString()
        };
        
        // если это новый пользователь, добавляем пароль
        if (userData.password) {
            userInfo.password = userData.password;
        }
        
        const response = await fetch('http://localhost:3001/api/users/save-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userInfo)
        });
        
        if (!response.ok) {
            console.error('Ошибка сохранения информации о пользователе:', await response.text());
        }
    } catch (error) {
        console.error('Ошибка при сохранении информации о пользователе:', error);
    }
}

// обработчик формы пользователя
document.getElementById('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const emailInput = form.querySelector('#user-email');
    const roleSelect = form.querySelector('#user-role');
    
    if (!emailInput || !roleSelect) {
        alert('Не найдены необходимые элементы формы');
        return;
    }
    
    const email = emailInput.value;
    const role = roleSelect.value;
    
    if (!email || !role) {
        alert('Необходимо указать email и роль');
        return;
    }
    
    try {
        // получаем токен для авторизации
        const token = await auth.currentUser.getIdToken();
        
        if (currentUserId) {
            // обновление существующего пользователя
            const claims = role === 'admin' ? 
                { admin: true } : 
                { 
                    moderator: true,
                    objectIds: Array.from(form.querySelectorAll('#object-ids-list input:checked'))
                        .map(input => input.value)
                };
            
            // обновляем custom claims через API
            const response = await fetch('http://localhost:3001/api/users/claims', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    uid: currentUserId,
                    claims
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Ошибка обновления прав доступа');
            }
            
            // сохраняем информацию о пользователе
            await saveUserInfoToFile({
                uid: currentUserId,
                email: email,
                role: role,
                objectIds: claims.objectIds || []
            });

            // обновляем данные в таблице
            loadUsers(); // перезагружаем список
            
        } else {
            // создание нового пользователя
            const objectIds = role === 'admin' ? [] : 
                Array.from(form.querySelectorAll('#object-ids-list input:checked'))
                    .map(input => input.value);

            const response = await fetch('http://localhost:3001/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email,
                    role,
                    objectIds
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Ошибка создания пользователя');
            }

            const data = await response.json();
            alert(`Пользователь создан. Пароль: ${data.password}`);
            
            // сохраняем информацию о пользователе
            await saveUserInfoToFile({
                ...data,
                email: email,
                role,
                objectIds
            });
        }
        
        closeUserModal();
        loadUsers(); // перезагружаем список
        
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
});

// функция проверки sessionStorage
function checkSessionStorage() {
    console.log('Проверка sessionStorage...');
    const editedFields = sessionStorage.getItem('editedFields');
    
    console.log('Состояние:', { editedFields });
    
    if (editedFields) {
        console.log('Найдены измененные поля:', editedFields);
        showSuccessModal(JSON.parse(editedFields));
    }
}

// функция отображения информационного окна
function showSuccessModal(changedFields) {
    console.log('Показ информационного окна:', changedFields);
    
    // удаляем существующее окно, если оно есть
    const existingModal = document.querySelector('.info-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'info-modal';
    
    const content = document.createElement('div');
    content.className = 'info-modal-content';
    
    const title = document.createElement('h3');
    title.textContent = 'Объект успешно изменён!';
    
    const message = document.createElement('p');
    message.textContent = `Отредактированы поля: ${changedFields.join(', ')}`;
    
    const okButton = document.createElement('button');
    okButton.className = 'btn-ok';
    okButton.textContent = 'OK';
    okButton.onclick = () => {
        modal.remove();
        sessionStorage.removeItem('editedFields');
    };
    
    content.appendChild(title);
    content.appendChild(message);
    content.appendChild(okButton);
    modal.appendChild(content);
    
    document.body.appendChild(modal);
}

// проверяем при загрузке страницы
window.addEventListener('load', () => {
    console.log('Страница полностью загружена');
    checkSessionStorage();
});

// проверяем при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен');
    localStorage.setItem('pageReady', 'false');
});

// функция для отображения ошибок
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    // добавляем кнопку закрытия
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.className = 'error-close';
    closeBtn.onclick = () => errorDiv.remove();
    
    errorDiv.appendChild(closeBtn);
    document.body.appendChild(errorDiv);
    
    // автоматически скрываем через 5 секунд
    setTimeout(() => errorDiv.remove(), 5000);
}

// функция для отображения успешного сообщения
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    
    // добавляем кнопку закрытия
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.className = 'success-close';
    closeBtn.onclick = () => successDiv.remove();
    
    successDiv.appendChild(closeBtn);
    document.body.appendChild(successDiv);
    
    // автоматически скрываем через 5 секунд
    setTimeout(() => successDiv.remove(), 5000);
}

// добавляем стили
const style = document.createElement('style');
style.textContent = `
    .btn-photos {
        background-color: #6c757d;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        margin-right: 5px;
    }

    .btn-photos:hover {
        background-color: #5a6268;
    }
`;
document.head.appendChild(style); 