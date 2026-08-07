// update-combo-db.js — 用容器内 better-sqlite3 热改运行中 OmniRoute combo config（免重启）
// 用法：改脚本里 comboName + newJudgeModel，然后
//   docker cp update-combo-db.js omniroute:/app/update-combo-db.js
//   docker exec omniroute node /app/update-combo-db.js
// 脚本必须放 /app（有 node_modules），不能放 /tmp（找不到 better-sqlite3）
const Database = require('better-sqlite3');

const comboName = 'moa-council';
const newJudgeModel = 'openai-compatible-chat-<uuid>/<model>'; // 用真实 provider UUID，非显示名

const db = new Database('/app/data/storage.sqlite');
db.pragma('journal_mode = WAL');

const row = db.prepare("SELECT data FROM combos WHERE name=?").get(comboName);
if (!row) { console.error(`COMBO NOT FOUND: ${comboName}`); process.exit(1); }

const d = JSON.parse(row.data);
const old = d.config.judgeModel;
d.config.judgeModel = newJudgeModel;
d.version = (d.version || 1) + 1;

db.prepare("UPDATE combos SET data=?, updated_at=datetime('now') WHERE name=?").run(JSON.stringify(d), comboName);

const check = JSON.parse(db.prepare("SELECT data FROM combos WHERE name=?").get(comboName).data);
console.log(`OLD judge: ${old}`);
console.log(`NEW judge: ${check.config.judgeModel}`);
console.log(`version: ${check.version}`);
db.close();
