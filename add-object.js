// проверка авторизации и прав доступа
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // проверяем, является ли пользователь админом
    const idTokenResult = await user.getIdTokenResult();
    if (!idTokenResult.claims.admin) {
        window.location.href = 'index.html';
        return;
    }

    // отображаем email пользователя
    document.getElementById('user-email').textContent = user.email;
});

// обработчик формы
document.getElementById('object-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        name: document.getElementById('name').value,
        description: document.getElementById('description').value,
        address: document.getElementById('address').value,
        phone: document.getElementById('phone').value,
        latitude: parseFloat(document.getElementById('latitude').value),
        longitude: parseFloat(document.getElementById('longitude').value),
        tags: [] // пустой массив тегов для нового объекта
    };

    try {
        // добавляем объект в коллекцию sportobjects
        const docRef = await db.collection('sportobjects').add(formData);
        
        // показываем сообщение об успехе
        alert(`Добавлен объект "${formData.name}"`);
        
        // возвращаемся на главную страницу
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Ошибка при добавлении объекта:', error);
        alert('Ошибка при добавлении объекта: ' + error.message);
    }
});

// обработчик кнопки выхода
document.getElementById('logout-btn').addEventListener('click', () => {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}); 