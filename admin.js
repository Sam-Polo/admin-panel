// инициализация панели управления
function initAdminPanel(user, isSuperuser) {
    const content = document.getElementById('content');
    
    // создаем навигацию
    const nav = document.createElement('nav');
    nav.innerHTML = `
        <button class="nav-btn active" data-section="objects">Объекты</button>
        ${isSuperuser ? '<button class="nav-btn" data-section="tags">Теги</button>' : ''}
    `;
    content.appendChild(nav);
    
    // создаем секции
    const sections = document.createElement('div');
    sections.className = 'sections';
    sections.innerHTML = `
        <div id="objects-section" class="section active">
            <div class="section-header">
                <h2>Спортивные объекты</h2>
                <button id="add-object-btn">Добавить объект</button>
            </div>
            <div id="objects-list"></div>
        </div>
        ${isSuperuser ? `
        <div id="tags-section" class="section">
            <div class="section-header">
                <h2>Теги</h2>
                <button id="add-tag-btn">Добавить тег</button>
            </div>
            <div id="tags-list"></div>
        </div>
        ` : ''}
    `;
    content.appendChild(sections);
    
    // обработчики навигации
    nav.addEventListener('click', (e) => {
        if (e.target.classList.contains('nav-btn')) {
            // обновляем активную кнопку
            nav.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            
            // показываем нужную секцию
            const section = e.target.dataset.section;
            sections.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById(`${section}-section`).classList.add('active');
        }
    });
    
    // загружаем данные
    loadObjects(user, isSuperuser);
    if (isSuperuser) {
        loadTags();
    }
}

// загрузка объектов
async function loadObjects(user, isSuperuser) {
    const objectsList = document.getElementById('objects-list');
    objectsList.innerHTML = '<div class="loading">Загрузка...</div>';
    
    try {
        let query = db.collection('sportobjects');
        
        // если не суперпользователь, показываем только доступные объекты
        if (!isSuperuser) {
            // получаем список доступных объектов из claims
            const idTokenResult = await user.getIdTokenResult();
            const objectIds = idTokenResult.claims.objectIds || [];
            
            if (objectIds.length === 0) {
                objectsList.innerHTML = '<div class="empty">У вас нет доступных объектов</div>';
                return;
            }
            
            // фильтруем по ID объектов
            query = query.where('__name__', 'in', objectIds);
        }
        
        const snapshot = await query.get();
        
        if (snapshot.empty) {
            objectsList.innerHTML = '<div class="empty">Нет объектов</div>';
            return;
        }
        
        // создаем таблицу
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Название</th>
                    <th>Адрес</th>
                    <th>Теги</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        // заполняем таблицу
        const tbody = table.querySelector('tbody');
        snapshot.forEach(doc => {
            const data = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${data.name}</td>
                <td>${data.address}</td>
                <td>${data.tags ? data.tags.length : 0}</td>
                <td>
                    <button class="edit-btn" data-id="${doc.id}">✏️</button>
                    <button class="delete-btn" data-id="${doc.id}">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        objectsList.innerHTML = '';
        objectsList.appendChild(table);
        
        // добавляем обработчики
        addObjectHandlers(user);
        
    } catch (error) {
        objectsList.innerHTML = `<div class="error">Ошибка загрузки: ${error.message}</div>`;
    }
}

// загрузка тегов
async function loadTags() {
    const tagsList = document.getElementById('tags-list');
    tagsList.innerHTML = '<div class="loading">Загрузка...</div>';
    
    try {
        const snapshot = await db.collection('tags').get();
        
        if (snapshot.empty) {
            tagsList.innerHTML = '<div class="empty">Нет тегов</div>';
            return;
        }
        
        // создаем дерево тегов
        const tree = document.createElement('div');
        tree.className = 'tags-tree';
        
        // TODO: реализовать отображение иерархии тегов
        
        tagsList.innerHTML = '';
        tagsList.appendChild(tree);
        
    } catch (error) {
        tagsList.innerHTML = `<div class="error">Ошибка загрузки: ${error.message}</div>`;
    }
}

// добавление обработчиков для объектов
function addObjectHandlers(user) {
    // обработчик добавления
    document.getElementById('add-object-btn').addEventListener('click', () => {
        // TODO: показать форму добавления объекта
    });
    
    // обработчики редактирования и удаления
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            // TODO: показать форму редактирования объекта
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
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