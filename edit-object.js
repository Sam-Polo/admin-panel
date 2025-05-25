// получаем id объекта из URL
const urlParams = new URLSearchParams(window.location.search);
const objectId = urlParams.get('id');

// инициализация элементов формы
let editForm, errorMessage, cancelBtn;
let originalData = {}; // храним оригинальные данные для сравнения

// маппинг названий полей на русский
const fieldNames = {
    name: 'Название',
    description: 'Описание',
    address: 'Адрес',
    phone: 'Телефон',
    location: 'Координаты'
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Страница редактирования загружена, id объекта:', objectId);
    
    // инициализация элементов
    editForm = document.getElementById('edit-form');
    errorMessage = document.getElementById('error-message');
    cancelBtn = document.getElementById('cancel-btn');
    
    if (!objectId) {
        showError('ID объекта не указан');
        return;
    }
    
    try {
        // загружаем данные объекта
        const docRef = db.collection('sportobjects').doc(objectId);
        const doc = await docRef.get();
        
        if (!doc.exists) {
            showError('Объект не найден');
            return;
        }
        
        const data = doc.data();
        originalData = { ...data }; // сохраняем оригинальные данные
        
        // обновляем заголовок
        document.querySelector('h1').textContent = `Редактирование объекта "${data.name}"`;
        
        // заполняем форму данными
        editForm.name.value = data.name || '';
        editForm.description.value = data.description || '';
        editForm.address.value = data.address || '';
        editForm.phone.value = data.phone || '';
        
        // заполняем координаты
        if (data.location) {
            editForm.latitude.value = data.location.latitude || '';
            editForm.longitude.value = data.location.longitude || '';
        }
        
        console.log('Данные объекта загружены:', data);
        
        // добавляем обработчики событий после загрузки данных
        editForm.addEventListener('submit', handleSubmit);
        cancelBtn.addEventListener('click', () => {
            history.back();
        });
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showError('Ошибка загрузки данных: ' + error.message);
    }
});

// обработчик отправки формы
async function handleSubmit(e) {
    e.preventDefault();
    console.log('Отправка формы редактирования');
    
    try {
        // собираем данные формы
        const formData = {
            name: editForm.name.value.trim(),
            description: editForm.description.value.trim(),
            address: editForm.address.value.trim(),
            phone: editForm.phone.value.trim()
        };
        
        // проверяем обязательные поля
        if (!formData.name || !formData.address) {
            showError('Название и адрес обязательны для заполнения');
            return;
        }
        
        // проверяем координаты
        const latitude = parseFloat(editForm.latitude.value);
        const longitude = parseFloat(editForm.longitude.value);
        
        if (isNaN(latitude) || isNaN(longitude)) {
            showError('Координаты должны быть числами');
            return;
        }
        
        // добавляем координаты в данные
        formData.location = new firebase.firestore.GeoPoint(latitude, longitude);
        
        // проверяем, что данные изменились и не пустые
        const changedData = {};
        const changedFields = [];
        
        for (const [key, value] of Object.entries(formData)) {
            if (key === 'location') {
                if (originalData.location?.latitude !== latitude || 
                    originalData.location?.longitude !== longitude) {
                    changedData[key] = value;
                    changedFields.push(fieldNames[key]);
                }
            } else if (value !== '' && originalData[key] !== value) {
                changedData[key] = value;
                changedFields.push(fieldNames[key]);
            }
        }
        
        if (changedFields.length === 0) {
            showError('Нет изменений для сохранения');
            return;
        }
        
        // обновляем данные в БД
        await db.collection('sportobjects').doc(objectId).update(changedData);
        console.log('Данные обновлены:', changedData);
        
        // сохраняем информацию об измененных полях в sessionStorage
        sessionStorage.setItem('editedFields', JSON.stringify(changedFields));
        
        // переходим на главную страницу
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showError('Ошибка сохранения: ' + error.message);
    }
}

// функция отображения ошибок
function showError(message) {
    console.error(message);
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
} 