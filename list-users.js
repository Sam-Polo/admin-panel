const admin = require('firebase-admin');

// инициализация админки
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// получение списка пользователей
async function listUsers() {
  try {
    const listUsersResult = await admin.auth().listUsers();
    console.log('Список пользователей:');
    listUsersResult.users.forEach((userRecord) => {
      console.log('UID:', userRecord.uid);
      console.log('Email:', userRecord.email);
      console.log('Custom Claims:', userRecord.customClaims);
      console.log('-------------------');
    });
  } catch (error) {
    console.error('Ошибка получения списка пользователей:', error);
  }
}

listUsers().then(() => process.exit(0)); 