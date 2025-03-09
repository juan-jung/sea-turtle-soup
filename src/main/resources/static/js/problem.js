// API 엔드포인트
const API_BASE_URL = 'http://localhost:8080';

// URL에서 problemId 추출 (경로 변수 방식)
const pathSegments = window.location.pathname.split('/');
const problemId = pathSegments[pathSegments.length - 1];

// 상태 요소 참조
const status = document.getElementById('status') || { textContent: '' };

// 음성 인식 설정
let recognition = null;
let isRecognitionActive = false;
let isCapturing = false;
let capturedText = '';
let isSpeaking = false;
let lastProcessedText = ''; // 마지막으로, 처리된 텍스트를 저장

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    loadInitialData();

    if (window.location.pathname.includes('problem.html')) {
        loadDetailPage();
    }

    const challengeButton = document.getElementById('challengeButton');
    if (challengeButton) {
        // 먼저 버튼을 비활성화
        challengeButton.disabled = true;
        challengeButton.style.opacity = '0.5';
        challengeButton.style.cursor = 'not-allowed';

        // 마이크 권한 확인
        checkMicrophonePermission().then(hasPermission => {
            if (hasPermission) {
                // 권한이 있으면 버튼 활성화
                challengeButton.disabled = false;
                challengeButton.style.opacity = '1';
                challengeButton.style.cursor = 'pointer';

                // 클릭 이벤트 리스너 추가
                challengeButton.addEventListener('click', startChallenge);
            } else {
                // 권한이 없으면 안내 메시지 표시
                showErrorMessage('마이크 사용 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
            }
        }).catch(error => {
            console.error('마이크 권한 확인 실패:', error);
            showErrorMessage('마이크 접근 권한을 확인할 수 없습니다.');
        });
    }

    // 음성 목록 로드 대기
    if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
            console.log('음성 목록 로드 완료:', window.speechSynthesis.getVoices());
        };
    }

    // 음성 인식 초기화
    setupSpeechRecognition();
});

// 마이크 권한 확인 함수
async function checkMicrophonePermission() {
    try {
        // 마이크 접근 요청
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // 사용이 끝나면 스트림 해제
        stream.getTracks().forEach(track => track.stop());

        return true;
    } catch (error) {
        console.error('마이크 권한 획득 실패:', error);
        return false;
    }
}

// 초기 화면 로드
function loadInitialData() {
    if (!problemId) return;

    fetch(`${API_BASE_URL}/api/problems/${problemId}`)
        .then(response => {
            if (!response.ok) throw new Error('문제를 찾을 수 없습니다');
            return response.json();
        })
        .then(problem => {
            const title = document.getElementById('title');
            const content = document.getElementById('content');
            if (title && content) {
                title.textContent = problem.title;
                content.textContent = problem.content;
            }
        })
        .catch(error => {
            console.error('데이터 로드 실패:', error);
            showErrorMessage('문제 데이터를 불러오는 중 오류가 발생했습니다.');
        });
}

// 상세 페이지 로드
function loadDetailPage() {
    if (!problemId) return;

    fetch(`${API_BASE_URL}/api/problems/${problemId}`)
        .then(response => {
            if (!response.ok) throw new Error('문제를 찾을 수 없습니다');
            return response.json();
        })
        .then(problem => {
            const rightSection = document.querySelector('.right-section');
            if (rightSection) {
                rightSection.style.display = 'block';
                rightSection.innerHTML = `
                    <div class="problem-detail">
                        <h2>${problem.title}</h2>
                        <p>${problem.content}</p>
                        <p><strong>난이도:</strong> ${problem.difficulty}</p>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('상세 페이지 로드 실패:', error);
            showErrorMessage('문제 상세 정보를 불러오는 중 오류가 발생했습니다.');
        });
}

// 도전 시작
function startChallenge() {
    const challengeButton = document.getElementById('challengeButton');
    const dimmed = document.querySelector('.dimmed');
    const chatBox = document.getElementById('chatBox');

    if (!challengeButton) {
        console.error('challengeButton 요소를 찾을 수 없습니다.');
        return;
    }

    if (challengeButton) challengeButton.style.display = 'none';
    if (dimmed) dimmed.style.display = 'none';
    if (chatBox) chatBox.style.display = 'block';

    const content = document.getElementById('content');
    if (content && content.textContent) {
        // 음성 출력 상태로 설정 (음성 인식 일시 중지)
        isSpeaking = true;
        pauseSpeechRecognition();

        // 먼저 문제 내용을 음성으로 출력 (TTS)
        speakText(content.textContent)
            .then(() => {
                // 음성 출력이 끝난 후 음성 인식 시작
                isSpeaking = false;
                startSpeechRecognition();
            })
            .catch(error => {
                console.error('음성 출력 실패:', error);
                // 음성 출력 실패해도 음성 인식은 시작
                isSpeaking = false;
                startSpeechRecognition();
            });
    } else {
        // 콘텐츠가 없으면 바로 음성 인식 시작
        startSpeechRecognition();
    }
}

// 음성 인식 설정
function setupSpeechRecognition() {
    // 인스턴스 생성
    if (!recognition) {
        try {
            recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'ko-KR';

            recognition.onresult = handleSpeechResult;

            recognition.onerror = (event) => {
                console.error('음성 인식 오류:', event.error);
                isCapturing = false;
                capturedText = '';

                if (event.error === 'not-allowed') {
                    showErrorMessage('마이크 사용 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');

                    // 도전 버튼 비활성화
                    const challengeButton = document.getElementById('challengeButton');
                    if (challengeButton) {
                        challengeButton.disabled = true;
                        challengeButton.style.opacity = '0.5';
                        challengeButton.style.cursor = 'not-allowed';
                    }
                } else {
                    if (status) status.textContent = `상태: 음성 인식 오류 - ${event.error}`;
                }

                isRecognitionActive = false;
            };

            recognition.onend = () => {
                console.log('음성 인식 종료됨');
                isRecognitionActive = false;

                // 말하는 중이 아니고 캡처 중이었다면 다시 시작
                if (!isSpeaking && isCapturing) {
                    setTimeout(() => {
                        startSpeechRecognition();
                    }, 500);
                } else if (!isSpeaking) {
                    // 말하는 중이 아니면 인식 재시작
                    setTimeout(() => {
                        startSpeechRecognition();
                    }, 500);
                }
            };
        } catch (e) {
            console.error('음성 인식 초기화 실패:', e);
            showErrorMessage('이 브라우저는 음성 인식을 지원하지 않습니다.');
        }
    }
}

// 음성 인식 결과 처리
function handleSpeechResult(event) {
    // 말하는 중이면 무시
    if (isSpeaking) return;

    let transcript = '';
    // 현재 결과만 처리 (중복 방지)
    for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
        }
    }

    // 빈 결과면 무시
    if (!transcript.trim()) return;

    console.log('인식된 텍스트:', transcript);

    // 중복 방지: 마지막으로 처리된 텍스트와 동일하면 무시
    if (transcript === lastProcessedText) {
        console.log('중복 텍스트 감지, 무시합니다:', transcript);
        return;
    }

    // "거북아" 키워드 감지
    if (transcript.toLowerCase().includes('거부가') && !isCapturing) {
        isCapturing = true;
        const parts = transcript.toLowerCase().split('거부가');
        capturedText = parts[parts.length - 1].trim();
        if (status) status.textContent = '상태: 음성 캡처 중...';

        // 처리된 텍스트 기록
        lastProcessedText = transcript;
    } else if (isCapturing) {
        capturedText += ' ' + transcript;
        // 처리된 텍스트 기록
        lastProcessedText = transcript;
    }

    // 음성 종료 감지 (마지막 결과가 확정된 경우)
    const lastResult = event.results[event.results.length - 1];
    if (lastResult.isFinal && isCapturing) {
        if (capturedText.trim().length > 0) {
            const finalText = capturedText.trim();
            console.log('캡처된 최종 텍스트:', finalText);

            // 메시지 추가 및 서버로 전송
            addMessage('user', 'You: ' + finalText);

            // 음성 인식 일시 중지 (AI 응답 기다리는 동안)
            pauseSpeechRecognition();

            // 서버로 전송
            sendMessageToAI(finalText);
        }

        // 캡처 상태 초기화
        isCapturing = false;
        capturedText = '';
        if (status) status.textContent = '상태: 대기 중... ("거북아"를 말하세요)';
    }
}

// 음성 인식 시작 함수
function startSpeechRecognition() {
    // 말하는 중이면 시작하지 않음
    if (isSpeaking) {
        console.log('음성 출력 중이므로 음성 인식을 시작하지 않습니다.');
        return;
    }

    if (!recognition) {
        setupSpeechRecognition();
    }

    if (!recognition) {
        console.error('음성 인식을 초기화할 수 없습니다.');
        return;
    }

    // 이미 실행 중이면 중단
    if (isRecognitionActive) {
        console.log('음성 인식이 이미 실행 중입니다.');
        return;
    }

    try {
        recognition.start();
        isRecognitionActive = true;
        console.log('음성 인식 시작...');
        if (status) status.textContent = '상태: 음성 인식 중... ("거북아"를 말하세요)';
    } catch (e) {
        console.error('음성 인식 시작 실패:', e);

        // 이미 시작되었으면 중지 후 재시작 시도
        if (e.name === 'InvalidStateError') {
            try {
                recognition.stop();
                setTimeout(() => {
                    if (!isSpeaking) {  // 말하는 중이 아닐 때만 재시작
                        recognition.start();
                        isRecognitionActive = true;
                        console.log('음성 인식 재시작...');
                        if (status) status.textContent = '상태: 음성 인식 중... ("거북아"를 말하세요)';
                    }
                }, 500);
            } catch (err) {
                console.error('음성 인식 재시작 실패:', err);
                if (status) status.textContent = '상태: 음성 인식 시작 실패';
            }
        } else {
            if (status) status.textContent = '상태: 음성 인식 시작 실패';
        }
    }
}

// 음성 인식 일시 중지
function pauseSpeechRecognition() {
    if (!recognition || !isRecognitionActive) return;

    try {
        recognition.stop();
        isRecognitionActive = false;
        console.log('음성 인식 일시 중지...');
        if (status) status.textContent = '상태: 음성 인식 일시 중지';
    } catch (e) {
        console.error('음성 인식 중지 실패:', e);
    }
}

// AI에 메시지 전송
async function sendMessageToAI(message) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages || !message.trim()) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/problems/${problemId}/ask`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question: message }),
        });

        if (!response.ok) throw new Error(`API 요청 실패: ${response.status}`);
        const data = await response.json();

        const aiMessage = data.isAnswer ? data.answer : data.queryResult;
        addMessage('ai', `AI: ${aiMessage}`);

        // 음성 출력 상태로 설정 (말하는 동안 음성 인식 중지)
        isSpeaking = true;

        // AI 응답을 음성으로 출력
        await speakText(aiMessage);

        // 음성 출력 후 다시 음성 인식 시작
        isSpeaking = false;
        startSpeechRecognition();
    } catch (error) {
        console.error('AI 대화 실패:', error);
        const errorMessage = 'AI: 오류가 발생했습니다. 다시 시도해주세요.';
        addMessage('ai', errorMessage);

        // 오류 메시지도 음성으로 출력
        isSpeaking = true;
        await speakText('오류가 발생했습니다. 다시 시도해주세요.');

        // 음성 출력 후 다시 음성 인식 시작
        isSpeaking = false;
        startSpeechRecognition();
    }
}

// 메시지 추가
function addMessage(type, text) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    messageDiv.textContent = text;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 음성 출력 함수 (Promise 반환)
function speakText(text) {
    return new Promise((resolve, reject) => {
        if (!text || !window.speechSynthesis) {
            reject(new Error('음성 합성을 사용할 수 없습니다.'));
            return;
        }

        window.speechSynthesis.cancel(); // 이전 음성 중단

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.volume = 1.0;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // 한국어 음성 찾기
        const voices = window.speechSynthesis.getVoices();
        const koreanVoice = voices.find(voice => voice.lang === 'ko-KR');
        if (koreanVoice) {
            utterance.voice = koreanVoice;
            console.log('선택된 한국어 음성:', koreanVoice.name);
        }

        if (status) status.textContent = '상태: 출력 중입니다...';

        utterance.onstart = () => {
            console.log('음성 출력 시작됨');
            isSpeaking = true; // 음성 출력 중 플래그 설정
        };

        utterance.onend = () => {
            console.log('음성 출력 완료');
            isSpeaking = false; // 음성 출력 완료 플래그 해제
            if (status) status.textContent = '상태: 대기 중... ("거북아"를 말하세요)';
            resolve();
        };

        utterance.onerror = (event) => {
            console.error('음성 출력 오류:', event.error);
            isSpeaking = false; // 오류 발생해도 플래그 해제
            if (status) status.textContent = `상태: 출력 오류 - ${event.error}`;
            reject(new Error(`음성 출력 오류: ${event.error}`));
        };

        window.speechSynthesis.speak(utterance);
    });
}

// 오류 메시지 표시
function showErrorMessage(message) {
    console.error(message);

    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    errorElement.style.backgroundColor = '#f8d7da';
    errorElement.style.color = '#721c24';
    errorElement.style.padding = '10px';
    errorElement.style.margin = '10px 0';
    errorElement.style.borderRadius = '4px';
    errorElement.style.textAlign = 'center';

    const container = document.querySelector('.container') || document.body;
    container.prepend(errorElement);

    // 5초 후 자동 제거
    setTimeout(() => {
        errorElement.remove();
    }, 5000);

    // 오류가 있을 경우 상태 업데이트
    if (status) status.textContent = `상태: ${message}`;
}

// 모든 음성 기능 중지 함수
function stopAllSpeechFeatures() {
    // 음성 인식 중지
    if (recognition) {
        try {
            recognition.stop();
            console.log('음성 인식 중지됨');
        } catch (e) {
            console.error('음성 인식 중지 중 오류:', e);
        }
    }

    // 음성 합성 중지
    if (speechSynthesis) {
        speechSynthesis.cancel(); // 모든 발화 큐 취소
        console.log('음성 합성 중지됨');
    }
}

// 페이지 변경 감지 및 음성 기능 중지
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopAllSpeechFeatures();
    }
});

// 페이지 이동 전 음성 기능 중지
window.addEventListener('beforeunload', () => {
    stopAllSpeechFeatures();
});