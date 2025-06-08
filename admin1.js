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
                } else if (page === 'logs' && isAdmin) {
                    loadAuditLogs();
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
                        // Логируем удаление объекта
                        await createAuditLog('Удаление объекта', {
                            objectId: id,
                            objectName: objectName
                        });
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
                    
                    // Логируем удаление пользователя
                    await createAuditLog('Удаление пользователя', {
                        targetEmail: email,
                        uid: btn.dataset.uid
                    });
                    
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

            // Логируем изменение пользователя
            await createAuditLog('Изменение пользователя', {
                targetEmail: email,
                role: role,
                objectIds: claims.objectIds ? claims.objectIds.length : 'все'
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

            // Собираем названия объектов для лога
            let objectNames = [];
            if (objectIds.length > 0) {
                try {
                    const objectsSnapshot = await db.collection('sportobjects')
                        .where('__name__', 'in', objectIds)
                        .get();
                    
                    objectsSnapshot.forEach(doc => {
                        objectNames.push(doc.data().name || doc.id);
                    });
                } catch (error) {
                    console.error('Ошибка при получении названий объектов:', error);
                }
            }

            // Логируем добавление пользователя
            await createAuditLog('Добавление пользователя', {
                targetEmail: email,
                role: role,
                objectIds: role === 'admin' ? 'все' : objectIds,
                objectNames: objectNames.length > 0 ? objectNames : undefined
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
    const editedFields = sessionStorage.getItem('editedFields');
    
    if (editedFields) {
        showSuccessModal(JSON.parse(editedFields));
    }
}

// функция отображения информационного окна
function showSuccessModal(changedFields) {
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
    checkSessionStorage();
});

// проверяем при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
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

// функция для создания записей в аудит-логах
async function createAuditLog(action, details = {}) {
    try {
        if (!auth.currentUser) {
            console.error('Невозможно создать запись лога: пользователь не авторизован');
            return;
        }
        
        const logEntry = {
            user_id: auth.currentUser.uid,
            user_email: auth.currentUser.email,
            action: action,
            details: details,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('audit_logs').add(logEntry);
    } catch (error) {
        console.error('Ошибка создания записи лога:', error);
    }
}

// переменные для пагинации логов
let lastLogDoc = null;
let hasMoreLogs = false;

// загрузка аудит-логов
async function loadAuditLogs(limit = 30, loadMore = false) {
    const logsTableBody = document.getElementById('logs-list-body');
    const loadMoreBtn = document.getElementById('load-more-logs');
    const deleteLogsBtn = document.getElementById('delete-logs-btn');
    
    if (!logsTableBody) {
        console.error('Не найден элемент logs-list-body');
        return;
    }
    
    // изначально кнопка удаления неактивна
    if (deleteLogsBtn) {
        deleteLogsBtn.disabled = true;
        deleteLogsBtn.classList.add('disabled');
    }
    
    // если это не подгрузка, очищаем таблицу и показываем индикатор загрузки
    if (!loadMore) {
        logsTableBody.innerHTML = '<tr><td colspan="5" class="loading">Загрузка логов...</td></tr>';
        lastLogDoc = null;
    }
    
    try {
        // Получаем значения фильтров по дате
        const dateFromInput = document.getElementById('logs-date-from');
        const dateToInput = document.getElementById('logs-date-to');
        
        let dateFrom = null;
        let dateTo = null;
        
        if (dateFromInput && dateFromInput.value) {
            dateFrom = new Date(dateFromInput.value);
            dateFrom.setHours(0, 0, 0, 0);
        }
        
        if (dateToInput && dateToInput.value) {
            dateTo = new Date(dateToInput.value);
            dateTo.setHours(23, 59, 59, 999);
        }
        
        // Создаем запрос к коллекции логов
        let query = db.collection('audit_logs')
            .orderBy('timestamp', 'desc');
            
        // Если есть фильтр по дате, применяем его
        if (dateFrom) {
            query = query.where('timestamp', '>=', dateFrom);
        }
        
        if (dateTo) {
            query = query.where('timestamp', '<=', dateTo);
        }
        
        // Ограничиваем количество результатов
        query = query.limit(limit);
            
        // Если это подгрузка и у нас есть последний документ, 
        // начинаем с него для пагинации
        if (loadMore && lastLogDoc) {
            query = query.startAfter(lastLogDoc);
        }
            
        const logsSnapshot = await query.get();
        
        // Если это не подгрузка и коллекция пуста
        if (!loadMore && logsSnapshot.empty) {
            logsTableBody.innerHTML = '<tr><td colspan="5" class="empty">Нет записей в журнале</td></tr>';
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }
        
        // Если это не подгрузка, очищаем таблицу
        if (!loadMore) {
            logsTableBody.innerHTML = '';
        }
        
        // Заполняем таблицу данными
        logsSnapshot.forEach(doc => {
            const log = doc.data();
            const tr = document.createElement('tr');
            
            // Форматируем дату
            const timestamp = log.timestamp ? log.timestamp.toDate() : new Date();
            const formattedDate = timestamp.toLocaleString('ru-RU', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            // Определяем класс для действия
            let actionClass = '';
            if (log.action.includes('Удаление')) {
                actionClass = 'action-delete';
            } else if (log.action.includes('Добавление') || log.action.includes('Загрузка')) {
                actionClass = 'action-add';
            } else if (log.action.includes('Изменение') || log.action.includes('Редактирование')) {
                actionClass = 'action-edit';
            }
            
            // Форматируем детали для отображения
            const details = formatLogDetails(log.details, true);
            const fullDetails = formatLogDetails(log.details, false);
            
            // Создаем содержимое строки
            tr.innerHTML = `
                <td>${formattedDate}</td>
                <td>${log.user_email || 'Н/Д'}</td>
                <td class="${actionClass}">${log.action || 'Н/Д'}</td>
                <td>
                    <div class="log-details-truncated">${details}</div>
                    <button class="btn-view-details" data-details='${JSON.stringify(fullDetails).replace(/'/g, "&#39;")}'>
                        Подробнее
                    </button>
                </td>
                <td>
                    <input type="checkbox" class="log-checkbox" data-id="${doc.id}">
                </td>
            `;
            
            logsTableBody.appendChild(tr);
        });
        
        // Сохраняем последний документ для пагинации
        const lastVisible = logsSnapshot.docs[logsSnapshot.docs.length - 1];
        if (lastVisible) {
            lastLogDoc = lastVisible;
            
            // Проверяем, есть ли еще логи
            const nextQuery = db.collection('audit_logs')
                .orderBy('timestamp', 'desc')
                .startAfter(lastVisible)
                .limit(1);
                
            const nextSnapshot = await nextQuery.get();
            hasMoreLogs = !nextSnapshot.empty;
            
            // Показываем или скрываем кнопку "Загрузить еще"
            if (loadMoreBtn) {
                loadMoreBtn.style.display = hasMoreLogs ? 'block' : 'none';
            }
        } else {
            hasMoreLogs = false;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        }
        
        // Добавляем обработчики для кнопок просмотра деталей
        document.querySelectorAll('.btn-view-details').forEach(btn => {
            btn.addEventListener('click', () => {
                const details = JSON.parse(btn.dataset.details);
                showLogDetailsModal(details);
            });
        });
        
        // Добавляем обработчики для чекбоксов
        document.querySelectorAll('.log-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', updateDeleteButtonState);
        });
        
    } catch (error) {
        console.error('Ошибка загрузки логов:', error);
        logsTableBody.innerHTML = `<tr><td colspan="5" class="error">Ошибка загрузки: ${error.message}</td></tr>`;
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    }
}

// Функция обновления состояния кнопки удаления логов
function updateDeleteButtonState() {
    const selectedLogs = document.querySelectorAll('.log-checkbox:checked');
    const deleteLogsBtn = document.getElementById('delete-logs-btn');
    
    if (deleteLogsBtn) {
        if (selectedLogs.length > 0) {
            deleteLogsBtn.disabled = false;
            deleteLogsBtn.classList.remove('disabled');
            deleteLogsBtn.style.opacity = '1';
            deleteLogsBtn.style.cursor = 'pointer';
        } else {
            deleteLogsBtn.disabled = true;
            deleteLogsBtn.classList.add('disabled');
            deleteLogsBtn.style.opacity = '0.6';
            deleteLogsBtn.style.cursor = 'not-allowed';
        }
    }
}

// Форматирование деталей лога
function formatLogDetails(details, truncate = false) {
    if (!details) return '';
    
    try {
        // Если объект или массив, преобразуем в текстовое представление
        if (typeof details === 'object') {
            let result = '';
            
            // Форматируем разные типы деталей
            if (details.objectId) {
                result += `ID объекта: ${details.objectId}\n`;
            }
            
            if (details.objectName) {
                result += `Объект: "${details.objectName}"\n`;
            }
            
            if (details.changedFields && Array.isArray(details.changedFields)) {
                const fields = details.changedFields.join(', ');
                result += `Изменены поля: ${truncate && fields.length > 100 ? fields.substring(0, 100) + '...' : fields}\n`;
            }
            
            if (details.addedTags && Array.isArray(details.addedTags) && details.addedTags.length > 0) {
                const tags = details.addedTags.join(', ');
                result += `Добавлены теги: ${truncate && tags.length > 100 ? tags.substring(0, 100) + '...' : tags}\n`;
            }
            
            if (details.removedTags && Array.isArray(details.removedTags) && details.removedTags.length > 0) {
                const tags = details.removedTags.join(', ');
                result += `Удалены теги: ${truncate && tags.length > 100 ? tags.substring(0, 100) + '...' : tags}\n`;
            }
            
            if (details.targetEmail) {
                result += `Целевой пользователь: ${details.targetEmail}\n`;
            }
            
            if (details.role) {
                result += `Роль: ${details.role}\n`;
            }
            
            if (details.objectIds) {
                if (typeof details.objectIds === 'string') {
                    result += `Объекты: ${details.objectIds}\n`;
                } else if (Array.isArray(details.objectIds)) {
                    result += `Объекты: ${details.objectIds.length}\n`;
                }
            }
            
            if (details.objectNames && Array.isArray(details.objectNames)) {
                const names = details.objectNames.join(', ');
                result += `Названия объектов: ${truncate && names.length > 100 ? names.substring(0, 100) + '...' : names}\n`;
            }
            
            if (details.photoCount) {
                result += `Количество фото: ${details.photoCount}\n`;
            }
            
            if (details.fileName) {
                result += `Файл: ${details.fileName}\n`;
            }
            
            if (details.fileSize) {
                result += `Размер: ${details.fileSize}\n`;
            }
            
            // Если ничего из вышеперечисленного не подошло, выводим весь объект
            if (!result) {
                result = JSON.stringify(details, null, 2)
                    .replace(/[{}"]/g, '')  // Удаляем фигурные скобки и кавычки
                    .replace(/,\n/g, '\n') // Заменяем запятую и перенос строки
                    .replace(/:/g, ': ')     // Добавляем пробел после двоеточия
                    .replace(/^\s+/gm, '');  // Удаляем начальные пробелы в строках
            }
            
            return truncate && result.length > 150 ? result.substring(0, 150) + '...' : result;
        }
        
        // Если строка, возвращаем как есть
        return truncate && String(details).length > 150 ? String(details).substring(0, 150) + '...' : String(details);
    } catch (e) {
        console.error('Ошибка форматирования деталей лога:', e);
        return String(details);
    }
}

// Показ модального окна с деталями лога
function showLogDetailsModal(details) {
    // Проверяем, существует ли уже модальное окно
    let modal = document.querySelector('.log-details-modal');
    
    // Если нет, создаем его
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'log-details-modal';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'log-details-modal-content';
        
        modalContent.innerHTML = `
            <div class="log-details-modal-header">
                <h3>Детали операции</h3>
                <button class="log-details-modal-close">&times;</button>
            </div>
            <div class="log-details-modal-body">
                <div id="log-details-content" class="log-details-content"></div>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Добавляем обработчик для закрытия модального окна
        const closeBtn = modal.querySelector('.log-details-modal-close');
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
        
        // Закрытие по клику вне содержимого
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // Заполняем модальное окно данными
    const detailsContent = modal.querySelector('#log-details-content');
    if (detailsContent) {
        // Если детали это объект, форматируем его
        if (typeof details === 'object' && details !== null) {
            let formattedContent = '';
            for (const key in details) {
                if (details.hasOwnProperty(key)) {
                    let value = details[key];
                    // Форматируем массивы
                    if (Array.isArray(value)) {
                        if (value.length > 0) {
                            value = value.join(', ');
                        } else {
                            value = '[]';
                        }
                    }
                    formattedContent += `<div class="detail-item"><strong>${key}:</strong> ${value}</div>`;
                }
            }
            detailsContent.innerHTML = formattedContent;
        } else if (typeof details === 'string') {
            // Преобразуем текст с переносами строк в HTML
            const htmlContent = details.split('\n').map(line => {
                if (line.trim()) {
                    const [label, ...valueParts] = line.split(':');
                    const value = valueParts.join(':').trim();
                    if (label && value) {
                        return `<div class="detail-item"><strong>${label}:</strong> ${value}</div>`;
                    }
                    return `<div class="detail-item">${line}</div>`;
                }
                return '';
            }).join('');
            
            detailsContent.innerHTML = htmlContent || details;
        } else {
            detailsContent.textContent = details;
        }
    }
    
    // Показываем модальное окно
    modal.style.display = 'flex';
}

// Функция для удаления выбранных логов
async function deleteSelectedLogs() {
    const checkboxes = document.querySelectorAll('.log-checkbox:checked');
    
    if (checkboxes.length === 0) {
        alert('Выберите хотя бы один лог для удаления');
        return;
    }
    
    const confirmation = confirm(`Вы уверены, что хотите удалить ${checkboxes.length} записей журнала?`);
    if (!confirmation) return;
    
    try {
        const batch = db.batch();
        checkboxes.forEach(checkbox => {
            const logId = checkbox.dataset.id;
            const logRef = db.collection('audit_logs').doc(logId);
            batch.delete(logRef);
        });
        
        await batch.commit();
        
        // Перезагружаем логи после удаления
        loadAuditLogs();
        
        // Получаем данные текущего пользователя
        const user = firebase.auth().currentUser;
        const idTokenResult = await user.getIdTokenResult();
        const isAdmin = idTokenResult.claims.admin === true;
        
        // Логируем действие удаления логов
        await createAuditLog('Удаление записей журнала', {
            count: checkboxes.length
        }, isAdmin);
        
    } catch (error) {
        console.error('Ошибка при удалении логов:', error);
        alert(`Ошибка при удалении: ${error.message}`);
    }
}

// Добавим обработчик для кнопки удаления логов
document.addEventListener('DOMContentLoaded', () => {
    const deleteLogsBtn = document.getElementById('delete-logs-btn');
    if (deleteLogsBtn) {
        deleteLogsBtn.addEventListener('click', deleteSelectedLogs);
    }
    
    // Добавим обработчик для кнопки "Загрузить еще"
    const loadMoreBtn = document.getElementById('load-more-logs');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            loadAuditLogs(30, true);
        });
    }
    
    // Добавим обработчик для чекбокса "Выбрать все"
    const selectAllCheckbox = document.getElementById('select-all-logs');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.log-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
        });
    }
});

// обработчики для фильтрации логов
document.addEventListener('DOMContentLoaded', () => {
    const logsSearch = document.getElementById('logs-search');
    const logsActionFilter = document.getElementById('logs-action-filter');
    const dateFromInput = document.getElementById('logs-date-from');
    const dateToInput = document.getElementById('logs-date-to');
    const applyDateFilterBtn = document.getElementById('apply-date-filter');
    const resetDateFilterBtn = document.getElementById('reset-date-filter');
    const loadMoreLogsBtn = document.getElementById('load-more-logs');
    const deleteLogsBtn = document.getElementById('delete-logs-btn');

    if (logsSearch) {
        logsSearch.addEventListener('input', filterLogs);
    }

    if (logsActionFilter) {
        logsActionFilter.addEventListener('change', filterLogs);
    }

    if (applyDateFilterBtn) {
        applyDateFilterBtn.addEventListener('click', function() {
            loadAuditLogs();
        });
    }

    if (resetDateFilterBtn) {
        resetDateFilterBtn.addEventListener('click', function() {
            if (dateFromInput) dateFromInput.value = '';
            if (dateToInput) dateToInput.value = '';
            loadAuditLogs();
        });
    }

    if (loadMoreLogsBtn) {
        loadMoreLogsBtn.addEventListener('click', function() {
            loadAuditLogs(30, true);
        });
    }

    if (deleteLogsBtn) {
        deleteLogsBtn.addEventListener('click', deleteSelectedLogs);
    }
});

// функция фильтрации логов
function filterLogs() {
    const logsSearch = document.getElementById('logs-search');
    const logsActionFilter = document.getElementById('logs-action-filter');
    
    const searchTerm = logsSearch ? logsSearch.value.toLowerCase() : '';
    const actionFilter = logsActionFilter ? logsActionFilter.value.toLowerCase() : '';
    
    const rows = document.querySelectorAll('#logs-list-body tr');
    let visibleCount = 0;
    
    rows.forEach(row => {
        // Пропускаем строки с сообщениями о загрузке, ошибках и т.д.
        if (row.querySelector('.loading, .empty, .error')) {
            return;
        }
        
        const dateCell = row.cells[0].textContent.toLowerCase();
        const emailCell = row.cells[1].textContent.toLowerCase();
        const actionCell = row.cells[2].textContent.toLowerCase();
        const detailsCell = row.querySelector('.log-details-truncated') ? 
                            row.querySelector('.log-details-truncated').textContent.toLowerCase() : '';
        
        const searchMatch = !searchTerm || 
            dateCell.includes(searchTerm) || 
            emailCell.includes(searchTerm) || 
            actionCell.includes(searchTerm) || 
            detailsCell.includes(searchTerm);
            
        const actionMatch = !actionFilter || actionCell.includes(actionFilter);
        
        row.style.display = searchMatch && actionMatch ? '' : 'none';
        
        if (searchMatch && actionMatch) {
            visibleCount++;
        }
    });
    
    // Если нет видимых строк, показываем сообщение
    const logsTableBody = document.getElementById('logs-list-body');
    if (visibleCount === 0 && logsTableBody) {
        // Удаляем существующее сообщение, если оно есть
        const noResultsRow = logsTableBody.querySelector('.no-results');
        if (noResultsRow) {
            noResultsRow.remove();
        }
        
        // Добавляем новое сообщение
        const tr = document.createElement('tr');
        tr.className = 'no-results';
        tr.innerHTML = '<td colspan="5" class="empty">Нет записей, соответствующих фильтрам</td>';
        logsTableBody.appendChild(tr);
    } else {
        // Удаляем сообщение, если оно есть и есть видимые строки
        const noResultsRow = logsTableBody.querySelector('.no-results');
        if (noResultsRow) {
            noResultsRow.remove();
        }
    }
} 