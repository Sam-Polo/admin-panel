const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

// инициализация админки
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(cors());
app.use(express.json());

// путь к файлу с информацией о пользователях
const USERS_INFO_FILE = path.join(__dirname, 'users_info.json');

// функция для чтения информации о пользователях
async function readUsersInfo() {
    try {
        const data = await fs.readFile(USERS_INFO_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// функция для сохранения информации о пользователях
async function saveUsersInfo(users) {
    await fs.writeFile(USERS_INFO_FILE, JSON.stringify(users, null, 2), 'utf8');
}

// middleware для проверки токена
async function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Ошибка верификации токена:', error);
        res.status(401).json({ error: 'Неверный токен' });
    }
}

// получение списка пользователей
app.get('/api/users', verifyToken, async (req, res) => {
  try {
    console.log('Запрос на получение списка пользователей');
    const listUsersResult = await admin.auth().listUsers();
    console.log('Получено пользователей:', listUsersResult.users.length);
    console.log('Первый пользователь:', listUsersResult.users[0]?.email);
    
    const users = listUsersResult.users.map(user => ({
      uid: user.uid,
      email: user.email,
      isAdmin: user.customClaims?.admin === true,
      isModerator: user.customClaims?.moderator === true,
      objectIds: user.customClaims?.objectIds || []
    }));
    
    res.json(users);
  } catch (error) {
    console.error('Ошибка при получении пользователей:', error);
    res.status(500).json({ error: error.message });
  }
});

// создание пользователя
app.post('/api/users', verifyToken, async (req, res) => {
    try {
        const { email, role, objectIds } = req.body;
        
        if (!email || !role) {
            return res.status(400).json({ error: 'Необходимо указать email и роль' });
        }

        // генерируем случайный пароль
        const password = Math.random().toString(36).slice(-8);
        
        // создаем пользователя
        const userRecord = await admin.auth().createUser({
            email,
            password,
            emailVerified: false
        });

        // устанавливаем claims
        const claims = role === 'admin' ? 
            { admin: true } : 
            { 
                moderator: true,
                objectIds: objectIds || []
            };
            
        await admin.auth().setCustomUserClaims(userRecord.uid, claims);
        
        // обновляем метаданные для обновления токена
        await admin.auth().updateUser(userRecord.uid, {
            customClaims: claims
        });

        res.json({ uid: userRecord.uid, password });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: error.message });
    }
});

// обновление роли пользователя
app.put('/api/users/:uid/role', async (req, res) => {
  try {
    const { uid } = req.params;
    const { role, objectIds } = req.body;
    
    const claims = {
      admin: role === 'admin',
      moderator: role === 'moderator'
    };
    
    if (role === 'moderator' && objectIds) {
      claims.objectIds = objectIds;
    }
    
    await admin.auth().setCustomUserClaims(uid, claims);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// удаление пользователя
app.delete('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    await admin.auth().deleteUser(uid);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// проверка claims пользователя
app.get('/api/users/:uid/claims', async (req, res) => {
  try {
    const { uid } = req.params;
    const userRecord = await admin.auth().getUser(uid);
    res.json({ 
      uid: userRecord.uid,
      email: userRecord.email,
      customClaims: userRecord.customClaims
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// проверка пользователя по email
app.get('/api/users/email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const userRecord = await admin.auth().getUserByEmail(email);
    res.json({ 
      uid: userRecord.uid,
      email: userRecord.email,
      customClaims: userRecord.customClaims
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// middleware для проверки авторизации
const checkAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена авторизации' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // проверяем, что пользователь админ
    if (!decodedToken.admin) {
      return res.status(403).json({ error: 'Нет прав доступа' });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Ошибка проверки токена:', error);
    res.status(401).json({ error: 'Неверный токен' });
  }
};

// обновление custom claims
app.post('/api/users/claims', async (req, res) => {
    try {
        const { uid, claims } = req.body;
        
        if (!uid || !claims) {
            return res.status(400).json({ error: 'Необходимо указать uid и claims' });
        }
        
        await admin.auth().setCustomUserClaims(uid, claims);
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка установки claims:', error);
        res.status(500).json({ error: error.message });
    }
});

// сохранение информации о пользователе
app.post('/api/users/save-info', async (req, res) => {
    try {
        const userInfo = req.body;
        const users = await readUsersInfo();
        
        // проверяем, существует ли уже пользователь с таким email
        const existingUserIndex = users.findIndex(u => u.email === userInfo.email);
        if (existingUserIndex !== -1) {
            users[existingUserIndex] = userInfo;
        } else {
            users.push(userInfo);
        }
        
        await saveUsersInfo(users);
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка при сохранении информации о пользователе:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
}); 