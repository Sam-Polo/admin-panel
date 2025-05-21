// получение id объекта из URL
const urlParams = new URLSearchParams(window.location.search);
const objectId = urlParams.get('id');

// элементы формы
let editForm;
let errorMessage;
let cancelBtn;

// инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('Инициализация страницы редактирования объекта');
    
    editForm = document.getElementById('edit-object-form');
    errorMessage = document.getElementById('error-message');
    cancelBtn = document.getElementById('cancel-btn');
    
    if (!objectId) {
        showError('ID объекта не указан');
        return;
    }
    
    // загружаем данные объекта
    loadObjectData();
    
    // обработчики событий
    editForm.addEventListener('submit', handleSubmit);
    cancelBtn.addEventListener('click', handleCancel);
});

// загрузка данных объекта
async function loadObjectData() {
    console.log('Загрузка данных объекта:', objectId);
    
    try {
        const doc = await db.collection('sportobjects').doc(objectId).get();
        
        if (!doc.exists) {
            showError('Объект не найден');
            return;
        }
        
        const data = doc.data();
        console.log('Получены данные объекта:', data);
        
        // заполняем форму
        document.getElementById('object-name').value = data.name || '';
        document.getElementById('object-description').value = data.description || '';
        document.getElementById('object-address').value = data.address || '';
        document.getElementById('object-phone').value = data.phone || '';
        
        // координаты
        if (data.location) {
            document.getElementById('object-lat').value = data.location.latitude || '';
            document.getElementById('object-lng').value = data.location.longitude || '';
        }
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showError('Ошибка загрузки данных: ' + error.message);
    }
}

// обработка отправки формы
async function handleSubmit(e) {
    e.preventDefault();
    console.log('Отправка формы редактирования');
    
    try {
        // собираем данные формы
        const formData = {
            name: document.getElementById('object-name').value,
            description: document.getElementById('object-description').value,
            address: document.getElementById('object-address').value,
            phone: document.getElementById('object-phone').value,
            location: new firebase.firestore.GeoPoint(
                parseFloat(document.getElementById('object-lat').value),
                parseFloat(document.getElementById('object-lng').value)
            )
        };
        
        console.log('Подготовленные данные:', formData);
        
        // обновляем объект
        await db.collection('sportobjects').doc(objectId).update(formData);
        console.log('Объект успешно обновлен');
        
        // возвращаемся на главную
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showError('Ошибка сохранения: ' + error.message);
    }
}

// обработка отмены
function handleCancel() {
    console.log('Отмена редактирования');
    window.location.href = 'index.html';
}

// показ ошибок
function showError(message) {
    console.error('Ошибка:', message);
    errorMessage.textContent = message;
    setTimeout(() => {
        errorMessage.textContent = '';
    }, 5000);
} 