// инициализация страницы
document.addEventListener('DOMContentLoaded', async () => {
    // проверяем авторизацию
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        // отображаем email пользователя
        document.getElementById('user-email').textContent = user.email;

        // получаем id объекта из URL
        const objectId = new URLSearchParams(window.location.search).get('id');
        if (!objectId) {
            showError('Не указан ID объекта');
            return;
        }

        // загружаем данные объекта
        try {
            const objectDoc = await db.collection('sportobjects').doc(objectId).get();
            if (!objectDoc.exists) {
                showError('Объект не найден');
                return;
            }

            const objectData = objectDoc.data();
            document.getElementById('object-name').textContent = `Управление фотографиями объекта "${objectData.name}"`;

            // загружаем фотографии
            loadPhotos(objectData['photo-urls'] || []);

        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            showError('Ошибка загрузки данных: ' + error.message);
        }
    });

    // обработчик кнопки "Назад"
    const backBtn = document.getElementById('back-btn');
    backBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // обработчик кнопки "Выйти"
    document.getElementById('logout-btn').addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = 'index.html';
        }).catch((error) => {
            showError('Ошибка выхода: ' + error.message);
        });
    });

    // добавляем обработчик кнопки загрузки
    const uploadBtn = document.getElementById('upload-btn');
    uploadBtn.addEventListener('click', showUploadModal);

    // добавляем обработчик кнопки удаления
    const deleteBtn = document.getElementById('delete-btn');
    deleteBtn.addEventListener('click', () => {
        const checkedBoxes = document.querySelectorAll('.photo-checkbox:checked');
        const urls = Array.from(checkedBoxes).map(box => box.dataset.url);
        
        if (urls.length > 0) {
            if (confirm(`Вы уверены, что хотите удалить ${urls.length} фото?`)) {
                deletePhotos(urls);
            }
        }
    });

    // модальное окно для просмотра полноразмерного изображения
    const fullsizeModal = document.getElementById('fullsize-modal');
    const closeButtons = document.querySelectorAll('.close-btn');
    
    // закрытие модальных окон по клику на крестик
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) {
                modal.classList.remove('show');
            }
        });
    });
    
    // закрытие модальных окон по клику на затемнённый фон
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.classList.remove('show');
        }
    });

    // загрузка данных объекта и фотографий
    loadObjectData();
});

// функция загрузки фотографий
function loadPhotos(photoUrls = []) {
    const photosGrid = document.getElementById('photos-grid');
    const deleteButton = document.getElementById('delete-btn');
    photosGrid.innerHTML = '';
    
    if (!photoUrls || photoUrls.length === 0) {
        photosGrid.innerHTML = '<div class="empty-photos">Нет загруженных фотографий</div>';
        deleteButton.disabled = true;
        deleteButton.classList.add('disabled');
        return;
    }
    
    photoUrls.forEach(url => {
        const photoContainer = document.createElement('div');
        photoContainer.className = 'photo-container';
        
        const photo = document.createElement('img');
        photo.src = url;
        photo.alt = 'Фото объекта';
        photo.className = 'photo-thumbnail';
        photo.dataset.fullUrl = url;
        
        // Добавляем обработчик клика для открытия полноразмерного изображения
        photo.addEventListener('click', (event) => {
            if (!event.target.closest('.photo-checkbox')) {
                showFullsizeImage(url);
            }
        });
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'photo-checkbox';
        checkbox.dataset.url = url;
        checkbox.addEventListener('change', updateSelectedCount);
        
        photoContainer.appendChild(photo);
        photoContainer.appendChild(checkbox);
        photosGrid.appendChild(photoContainer);
    });
}

// функция открытия полноразмерного изображения
function showFullsizeImage(imageUrl) {
    const modal = document.getElementById('fullsize-modal');
    const fullsizeImage = document.getElementById('fullsize-image');
    
    if (!modal || !fullsizeImage) {
        console.error('Не найдены элементы модального окна');
        return;
    }
    
    fullsizeImage.src = imageUrl;
    modal.style.display = 'flex';
    
    // закрытие модального окна при клике на крестик
    const closeBtn = modal.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        };
    }
    
    // закрытие модального окна при клике вне изображения
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}

// обновление счетчика выбранных фотографий
function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('.photo-checkbox:checked');
    const deleteBtn = document.getElementById('delete-btn');
    
    if (checkboxes.length > 0) {
        deleteBtn.disabled = false;
        deleteBtn.classList.remove('disabled');
    } else {
        deleteBtn.disabled = true;
        deleteBtn.classList.add('disabled');
    }
}

// функция показа фото в полном размере
function showFullPhoto(url) {
    const modal = document.createElement('div');
    modal.className = 'photo-modal';
    
    const img = document.createElement('img');
    img.src = url;
    
    // получаем все URL фотографий
    const allPhotos = Array.from(document.querySelectorAll('.photo-item img')).map(img => img.src);
    const currentIndex = allPhotos.indexOf(url);
    
    // создаем кнопки навигации
    const prevBtn = document.createElement('button');
    prevBtn.className = 'nav-btn prev-btn';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.onclick = (e) => {
        e.stopPropagation();
        const prevIndex = (currentIndex - 1 + allPhotos.length) % allPhotos.length;
        img.src = allPhotos[prevIndex];
    };
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'nav-btn next-btn';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.onclick = (e) => {
        e.stopPropagation();
        const nextIndex = (currentIndex + 1) % allPhotos.length;
        img.src = allPhotos[nextIndex];
    };
    
    // добавляем счетчик фотографий
    const counter = document.createElement('div');
    counter.className = 'photo-counter';
    counter.textContent = `${currentIndex + 1} / ${allPhotos.length}`;
    
    modal.appendChild(prevBtn);
    modal.appendChild(img);
    modal.appendChild(nextBtn);
    modal.appendChild(counter);
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

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

// функция показа модального окна загрузки
function showUploadModal() {
    const modal = document.createElement('div');
    modal.className = 'upload-modal';
    
    const content = document.createElement('div');
    content.className = 'upload-modal-content';
    
    const title = document.createElement('h3');
    title.textContent = 'Загрузка фотографий';
    
    const uploadArea = document.createElement('div');
    uploadArea.className = 'upload-area';
    uploadArea.innerHTML = `
        <i class="fas fa-cloud-upload-alt"></i>
        <p>Перетащите фотографии сюда или</p>
        <label class="upload-btn">
            Выберите файлы
            <input type="file" multiple accept="image/*" style="display: none;">
        </label>
    `;
    
    const previewContainer = document.createElement('div');
    previewContainer.className = 'preview-container';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.onclick = () => modal.remove();
    
    content.appendChild(closeBtn);
    content.appendChild(title);
    content.appendChild(uploadArea);
    content.appendChild(previewContainer);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // обработчик клика вне модального окна
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // обработчик выбора файлов
    const fileInput = uploadArea.querySelector('input[type="file"]');
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files, previewContainer));
    
    // обработчик drag & drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleFiles(e.dataTransfer.files, previewContainer);
    });
}

// функция загрузки фото на ImgBB
async function uploadToImgBB(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=0ec70583f0620c5df226881bd95a14e2`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки на ImgBB');
        }
        
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error?.message || 'Ошибка загрузки на ImgBB');
        }
        
        // возвращаем и URL изображения, и delete_url
        return {
            url: data.data.url,
            delete_url: data.data.delete_url
        };
    } catch (error) {
        console.error('Ошибка загрузки на ImgBB:', error);
        throw error;
    }
}

// функция удаления фото с ImgBB
async function deleteFromImgBB(deleteUrl) {
    try {
        const response = await fetch(deleteUrl, {
            method: 'GET'
        });
        
        if (!response.ok) {
            throw new Error('Ошибка удаления с ImgBB');
        }
        
        return true;
    } catch (error) {
        console.error('Ошибка удаления с ImgBB:', error);
        throw error;
    }
}

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
        console.log('Запись аудит-лога создана:', { action, details });
    } catch (error) {
        console.error('Ошибка создания записи лога:', error);
    }
}

// обработка выбранных файлов
async function handleFiles(files, previewContainer) {
    previewContainer.innerHTML = '';
    
    for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
            showError(`Файл ${file.name} не является изображением`);
            continue;
        }
        
        // создаем элементы превью
        const preview = document.createElement('div');
        preview.className = 'preview-item';
        
        // создаем информационный блок
        const previewInfo = document.createElement('div');
        previewInfo.className = 'preview-info';
        
        const previewName = document.createElement('span');
        previewName.className = 'preview-name';
        previewName.textContent = file.name;
        
        const previewProgress = document.createElement('div');
        previewProgress.className = 'preview-progress';
        
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        
        const progressFill = document.createElement('div');
        progressFill.className = 'progress-fill';
        
        const progressText = document.createElement('span');
        progressText.className = 'progress-text';
        progressText.textContent = '0%';
        
        // собираем структуру
        progressBar.appendChild(progressFill);
        previewProgress.appendChild(progressBar);
        previewProgress.appendChild(progressText);
        previewInfo.appendChild(previewName);
        previewInfo.appendChild(previewProgress);
        
        // создаем превью изображения
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = file.name;
            preview.appendChild(img);
            preview.appendChild(previewInfo);
        };
        
        reader.readAsDataURL(file);
        previewContainer.appendChild(preview);
        
        // ждем создания элементов
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
            // загружаем на ImgBB
            const progressText = preview.querySelector('.progress-text');
            const progressFill = preview.querySelector('.progress-fill');
            
            if (!progressText || !progressFill) {
                throw new Error('Не удалось найти элементы прогресса');
            }
            
            progressText.textContent = 'Загрузка...';
            const { url: imageUrl } = await uploadToImgBB(file);
            
            // сохраняем URL в БД
            const objectId = new URLSearchParams(window.location.search).get('id');
            const objectRef = db.collection('sportobjects').doc(objectId);
            
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(objectRef);
                if (!doc.exists) {
                    throw new Error('Объект не найден');
                }
                
                const data = doc.data();
                const photoUrls = data['photo-urls'] || [];
                
                photoUrls.push(imageUrl);
                
                transaction.update(objectRef, { 
                    'photo-urls': photoUrls
                });
            });
            
            // Логируем загрузку фотографии
            await createAuditLog('Загрузка фото', {
                objectId: objectId,
                objectName: document.getElementById('object-name').textContent.replace('Управление фотографиями объекта "', '').replace('"', ''),
                fileName: file.name,
                fileSize: Math.round(file.size / 1024) + ' КБ'
            });
            
            // обновляем UI
            progressFill.style.width = '100%';
            progressText.textContent = 'Загружено';
            preview.classList.add('uploaded');
            
            // обновляем галерею
            loadPhotos((await objectRef.get()).data()['photo-urls']);
            
            // показываем сообщение об успехе
            showSuccess('Фотография успешно загружена');
            
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            const progressText = preview.querySelector('.progress-text');
            if (progressText) {
                progressText.textContent = 'Ошибка';
            }
            preview.classList.add('error');
            showError(`Ошибка загрузки ${file.name}: ${error.message}`);
        }
    }
}

// функция удаления фото
async function deletePhotos(photoUrls) {
    const objectId = new URLSearchParams(window.location.search).get('id');
    const objectRef = db.collection('sportobjects').doc(objectId);
    
    try {
        // начинаем транзакцию
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(objectRef);
            if (!doc.exists) {
                throw new Error('Объект не найден');
            }
            
            const data = doc.data();
            const currentUrls = data['photo-urls'] || [];
            
            // удаляем выбранные URL из массива
            const newUrls = currentUrls.filter(url => !photoUrls.includes(url));
            
            // обновляем массив URL в БД
            transaction.update(objectRef, { 'photo-urls': newUrls });
        });
        
        // Логируем удаление фотографий
        await createAuditLog('Удаление фото', {
            objectId: objectId,
            objectName: document.getElementById('object-name').textContent.replace('Управление фотографиями объекта "', '').replace('"', ''),
            photoCount: photoUrls.length
        });
        
        // обновляем галерею
        const doc = await objectRef.get();
        loadPhotos(doc.data()['photo-urls']);
        
        showSuccess('Фотографии успешно удалены');
    } catch (error) {
        console.error('Ошибка удаления:', error);
        showError(`Ошибка удаления: ${error.message}`);
    }
}

// добавляем стили
const style = document.createElement('style');
style.textContent = `
    .photos-container {
        padding: 20px;
    }

    .photos-actions {
        margin-bottom: 20px;
        display: flex;
        gap: 10px;
    }

    .photos-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 20px;
        padding: 20px;
    }

    .photo-item {
        position: relative;
        aspect-ratio: 1;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .photo-item.error {
        background-color: #ffebee;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #c62828;
        font-size: 0.9em;
        text-align: center;
        padding: 10px;
    }

    .photo-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        cursor: pointer;
        transition: transform 0.2s;
    }

    .photo-item img:hover {
        transform: scale(1.05);
    }

    .photo-checkbox {
        position: absolute;
        top: 10px;
        left: 10px;
        z-index: 1;
        width: 20px;
        height: 20px;
        cursor: pointer;
    }

    .photo-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        cursor: pointer;
    }

    .photo-modal img {
        max-width: 90%;
        max-height: 90vh;
        object-fit: contain;
    }

    .empty-message {
        grid-column: 1 / -1;
        text-align: center;
        padding: 40px;
        color: #666;
        font-size: 1.2em;
    }

    .btn-danger {
        background-color: #dc3545;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .btn-danger:disabled {
        background-color: #dc354580;
        cursor: not-allowed;
    }

    .btn-danger i {
        font-size: 1.1em;
    }

    .nav-btn {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 24px;
        border-radius: 50%;
        transition: background-color 0.3s;
        z-index: 1001;
        padding: 0;
    }

    .nav-btn:hover {
        background: rgba(255, 255, 255, 0.3);
    }

    .prev-btn {
        left: 20px;
    }

    .next-btn {
        right: 20px;
    }

    .photo-counter {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 14px;
    }

    .upload-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .upload-modal-content {
        background: white;
        padding: 30px;
        border-radius: 8px;
        width: 90%;
        max-width: 500px;
        position: relative;
    }

    .upload-modal h3 {
        margin: 0 0 20px 0;
        color: #333;
        text-align: center;
    }

    .upload-area {
        border: 2px dashed #ccc;
        border-radius: 8px;
        padding: 40px;
        text-align: center;
        cursor: pointer;
        transition: border-color 0.3s;
    }

    .upload-area:hover {
        border-color: #666;
    }

    .upload-area i {
        font-size: 48px;
        color: #666;
        margin-bottom: 15px;
    }

    .upload-area p {
        margin: 10px 0;
        color: #666;
    }

    .upload-btn {
        display: inline-block;
        background: #1a73e8;
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.3s;
    }

    .upload-btn:hover {
        background: #1557b0;
    }

    .close-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        font-size: 20px;
        color: #666;
        cursor: pointer;
        padding: 5px;
    }

    .close-btn:hover {
        color: #333;
    }

    .upload-area.dragover {
        border-color: #1a73e8;
        background-color: rgba(26, 115, 232, 0.1);
    }

    .preview-container {
        margin-top: 20px;
        max-height: 300px;
        overflow-y: auto;
    }

    .preview-item {
        display: flex;
        align-items: center;
        padding: 10px;
        border: 1px solid #eee;
        border-radius: 4px;
        margin-bottom: 10px;
    }

    .preview-item img {
        width: 60px;
        height: 60px;
        object-fit: cover;
        border-radius: 4px;
        margin-right: 10px;
    }

    .preview-info {
        flex: 1;
    }

    .preview-name {
        display: block;
        margin-bottom: 5px;
        font-size: 14px;
        color: #333;
    }

    .preview-progress {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .progress-bar {
        flex: 1;
        height: 4px;
        background-color: #eee;
        border-radius: 2px;
        overflow: hidden;
    }

    .progress-fill {
        width: 0;
        height: 100%;
        background-color: #1a73e8;
        transition: width 0.3s ease;
    }

    .progress-text {
        font-size: 12px;
        color: #666;
        min-width: 45px;
    }

    .preview-item.uploaded .progress-fill {
        background-color: #34a853;
    }

    .preview-item.uploaded .progress-text {
        color: #34a853;
    }

    .error-message,
    .success-message {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 4px;
        color: white;
        font-size: 14px;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease-out;
    }
    
    .error-message {
        background-color: #ff4d4f;
    }
    
    .success-message {
        background-color: #52c41a;
    }
    
    .error-close,
    .success-close {
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        margin-left: 10px;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// загрузка данных объекта и фотографий
async function loadObjectData() {
    try {
        const objectId = new URLSearchParams(window.location.search).get('id');
        if (!objectId) {
            showError('Не указан ID объекта');
            return;
        }
        
        const objectRef = db.collection('sportobjects').doc(objectId);
        const doc = await objectRef.get();
        
        if (!doc.exists) {
            showError('Объект не найден');
            return;
        }
        
        const data = doc.data();
        
        // устанавливаем название объекта в заголовок
        const objectName = document.getElementById('object-name');
        objectName.textContent = `Управление фотографиями объекта "${data.name}"`;
        
        // загружаем фотографии
        const photoUrls = data['photo-urls'] || [];
        loadPhotos(photoUrls);
    } catch (error) {
        console.error('Ошибка загрузки данных объекта:', error);
        showError(`Ошибка загрузки данных: ${error.message}`);
    }
} 