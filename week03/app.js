const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();
const PORT = 3000;

// EJS 템플릿 엔진 설정
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));

// 세션 설정 (로그인 상태 유지)
app.use(session({
  secret: 'kert-week03-secret',
  resave: false,
  saveUninitialized: false
}));

// 모든 템플릿에서 user 변수를 사용할 수 있도록 설정
app.use((req, res, next) => {
  res.locals.user = req.session.user ?? null; // 로그인 안 했으면 null
  next();
});

// 데이터베이스 연결 및 테이블 생성
const db = new DatabaseSync('board.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    user_id INTEGER NOT NULL
  );
`);

// 첫 화면 접속 시 /posts 로 이동
app.get('/', (req, res) => {
  res.redirect('/posts');
});

// 1. 글 목록 보기 (JOIN을 사용해 작성자 이름까지 함께 조회)
app.get('/posts', (req, res) => {
  const posts = db.prepare(`
    SELECT posts.id, posts.title, users.username 
    FROM posts JOIN users ON posts.user_id = users.id 
    ORDER BY posts.id
  `).all();
  
  res.render('list', { posts });
});

// 2. 글쓰기 폼 화면 (로그인한 사람만 접속 가능)
app.get('/posts/new', requireLogin, (req, res) => {
  res.render('new');
});

// 3. 새 글 저장 (로그인한 사람만 작성 가능, 세션의 user.id 사용)
app.post('/posts', requireLogin, (req, res) => {
  const { title, content } = req.body;
  
  db.prepare('INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?)')
    .run(title, content, req.session.user.id);

  res.redirect('/posts');
});

// 4. 글 상세 보기
app.get('/posts/:id', (req, res) => {
  const id = Number(req.params.id);
  const post = db.prepare(`
    SELECT posts.*, users.username 
    FROM posts JOIN users ON posts.user_id = users.id 
    WHERE posts.id = ?
  `).get(id);

  if (!post) {
    return res.status(404).send('글이 없습니다');
  }

  res.render('detail', { post });
});

// 5. 글 삭제 (로그인 필수 + 작성자 본인 또는 관리자만 가능)
app.post('/posts/:id/delete', requireLogin, (req, res) => {
  const id = Number(req.params.id);
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);

  if (!post) {
    return res.status(404).send('글이 없습니다');
  }

  const me = req.session.user;
  // 작성자도 아니고 관리자도 아니면 차단
  if (post.user_id !== me.id && me.role !== 'admin') {
    return res.status(403).send('내 글만 삭제할 수 있습니다');
  }

  db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  res.redirect('/posts');
});

// 1. 회원가입 화면
app.get('/signup', (req, res) => {
  res.render('signup', { error: null });
});

// 2. 회원가입 처리
app.post('/signup', (req, res) => {
  const { username, password } = req.body;
  
  // 이미 있는 아이디인지 확인
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) {
    return res.render('signup', { error: '이미 있는 아이디입니다' });
  }

  // 비밀번호 해시화 (암호화)
  const hash = bcrypt.hashSync(password, 10);
  
  // DB에 회원 저장
  db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hash);
  
  res.redirect('/login');
});

// 1. 로그인 화면
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// 2. 로그인 처리
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // DB에서 사용자 찾기
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  
  // 사용자가 없거나 비밀번호가 틀린 경우
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.render('login', { error: '아이디 또는 비밀번호가 틀렸습니다' });
  }

  // 로그인 성공: 세션에 사용자 정보 저장
  req.session.user = { id: user.id, username: user.username, role: user.role };
  res.redirect('/posts');
});

// 3. 로그아웃 처리
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/posts');
  });
});

// 로그인 여부를 확인하는 미들웨어
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next(); // 로그인되어 있다면 다음 코드로 진행
} 

// 관리자 권한 확인 미들웨어
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).send('관리자만 볼 수 있습니다');
  }
  next();
}

// 관리자 페이지 (회원 목록 조회)
app.get('/admin', requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, role FROM users ORDER BY id').all();
  res.render('admin', { users });
});

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});