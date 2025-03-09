// 가상의 API 엔드포인트 (백엔드와 연결 필요)
const API_URL = 'http://localhost:8080/api/problems';

// 문제 목록을 가져오는 함수
async function fetchProblems() {

    try {
        const response = await fetch(`${API_URL}`);
        const problems = await response.json();


        displayProblems(problems);
    } catch (error) {
        console.error('문제 목록을 가져오지 못했습니다:', error);
        document.getElementById('problem-list').innerHTML = '<p>데이터를 불러오지 못했습니다.</p>';
    }
}

// 문제 목록을 화면에 표시
function displayProblems(problems) {
    const problemList = document.getElementById('problem-list');
    problemList.innerHTML = ''; // 기존 내용 지우기

    problems.content.forEach(problem => {
        const card = document.createElement('div');
        card.className = 'problem-card';
        card.innerHTML = `
            <a href="http://localhost:8080/problems/${problem.id}" class="problem-link">
                <h3>${problem.title}</h3>
                <p>${problem.content.substring(0, 100)}...</p>
                <p class="difficulty">난이도: ${problem.difficulty}</p>
                <!-- <p class="solved">${problem.solved ? '해결됨' : '미해결'}</p> -->
            </a>
        `;
        problemList.appendChild(card);
    });
}

// 초기 로드
document.addEventListener('DOMContentLoaded', () => {
    fetchProblems(); // 페이지 로드 시 기본 목록 가져오기
});