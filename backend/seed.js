const { getDb } = require('./storage/fileDb');

// Для версии без MongoDB seed фактически просто инициализирует файл db.json.
getDb()
  .then(() => {
    console.log('Mock DB ready');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
