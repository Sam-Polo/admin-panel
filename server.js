const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// инициализация админки
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(cors());
app.use(express.json());

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
app.post('/api/users', async (req, res) => {
  try {
    const { email, password, role, objectIds } = req.body;
    
    const userRecord = await admin.auth().createUser({
      email,
      password
    });
    
    const claims = {
      admin: role === 'admin',
      moderator: role === 'moderator'
    };
    
    if (role === 'moderator' && objectIds) {
      claims.objectIds = objectIds;
    }
    
    await admin.auth().setCustomUserClaims(userRecord.uid, claims);
    
    res.json({ 
      uid: userRecord.uid,
      email: userRecord.email,
      customClaims: claims
    });
  } catch (error) {
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
}); 