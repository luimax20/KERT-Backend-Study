const express = require('express');
const path = require('path');
const { renderPostList, makePosts } = require('./practice'); // practice.js에서 함수 가져오기

const app = express();
const PORT = 3000;

// 정적 파일 (public 폴더)
app.use(express.static('public'));

// 1. 메인 라우트
app.get('/', (req, res) => {
  res.send('<h1>Hello Express!</h1>');
});

// 2. /photo 라우트
app.get('/photo', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'KERT.jpg'));
});

// 3. /about 라우트 (도전: 자기소개)
app.get('/about', (req, res) => {
  res.send(`
    <h1>자기소개</h1>
    <p>안녕하세요! KERT 웹 백엔드 스터디 1기 양부겸입니다.</p>
    <p>컴퓨터학부 첨단컴퓨팅연구전공 26학번입니다.</p>
  `);
});

// 4. /time 라우트
app.get('/time', (req, res) => {
  const now = new Date().toLocaleString('ko-KR');
  res.send(`<h1>현재 접속 시각</h1><p>${now}</p>`);
});

// 5. /posts 라우트 (도전: 게시판 리스트 출력)
app.get('/posts', (req, res) => {
  const posts = makePosts(); // 연습용 게시글 데이터
  const htmlList = renderPostList(posts);
  res.send(`<h1>게시글 목록</h1>${htmlList}`);
});

// 6. 404 에러 핸들러 (도전: 없는 경로 접속 시)
app.use((req, res) => {
  res.status(404).send('<h1>404 Not Found</h1><p>존재하지 않는 페이지입니다.</p>');
});

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});