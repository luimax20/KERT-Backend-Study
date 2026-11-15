const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('board.db');

const username = process.argv[2]; // 터미널에서 두 번째로 입력한 아이디

if (!username) {
  console.log('사용할 아이디를 입력해주세요. 예: node make-admin.js mickey');
  process.exit(1);
}

const result = db.prepare("UPDATE users SET role = 'admin' WHERE username = ?").run(username);

if (result.changes === 1) {
  console.log(`${username} 을(를) 관리자로 바꿨습니다.`);
} else {
  console.log(`${username} 사용자가 없습니다. 먼저 회원가입을 진행해주세요.`);
}
