const admin = require('firebase-admin');
const crypto = require('crypto');

// инициализация админки
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// генерация случайного пароля
function generatePassword(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    password += chars[randomIndex];
  }
  
  return password;
}

// функция установки claims
async function setCustomClaims(uid, claims) {
  try {
    await admin.auth().setCustomUserClaims(uid, claims);
    console.log(`Успешно установлены claims для пользователя ${uid}:`, claims);
  } catch (error) {
    console.error('Ошибка установки claims:', error);
  }
}

// создание администратора
async function createAdmin(email, password) {
  try {
    // проверяем, существует ли пользователь
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      console.log(`Пользователь ${email} уже существует с UID: ${userRecord.uid}`);
      
      // устанавливаем права администратора
      await setCustomClaims(userRecord.uid, { admin: true });
      return userRecord;
    } catch (error) {
      // пользователь не существует, создаем нового
      if (error.code === 'auth/user-not-found') {
        const userRecord = await admin.auth().createUser({
          email: email,
          password: password,
          emailVerified: true
        });
        
        console.log(`Создан новый пользователь: ${email} с UID: ${userRecord.uid}`);
        console.log(`Пароль: ${password} (сохраните его)`);
        
        // устанавливаем права администратора
        await setCustomClaims(userRecord.uid, { admin: true });
        return userRecord;
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Ошибка создания администратора:', error);
    throw error;
  }
}

// основная функция
async function main() {
  const adminEmail = 'admin@admin.ru';
  const password = generatePassword(12);
  
  console.log('Создание администратора...');
  await createAdmin(adminEmail, password);
  console.log('Операция завершена.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Произошла ошибка:', error);
    process.exit(1);
  }); 