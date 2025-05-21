const admin = require('firebase-admin');

// инициализация админки
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// функция установки claims
async function setCustomClaims(uid, claims) {
  try {
    await admin.auth().setCustomUserClaims(uid, claims);
    console.log(`Успешно установлены claims для пользователя ${uid}:`, claims);
  } catch (error) {
    console.error('Ошибка установки claims:', error);
  }
}

// примеры установки claims
async function main() {
  // для суперпользователя
  await setCustomClaims('IiRrhPqApfT1ytsfoU7DCU9hLav1', {
    superuser: true
  });

  // для модератора
  await setCustomClaims('Sdo8TofFDGOMn8jlxRTGZ5pGPgc2', {
    moderator: true,
    objectIds: ['Byyt5SFx1Eis6OlHi7vS', 's7B90cbvS2zkGGgGUzEe'] // массив ID объектов, к которым есть доступ
  });
}

main().then(() => process.exit(0)); 