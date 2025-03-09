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
let captureTimeout = null; // 캡처 타임아웃 추가

// 트리거 단어 배열
const TRIGGER_WORDS = ['거북아', '거부가'];

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

    // 음성 캡처 표시기 요소 생성 및 추가
    createCaptureIndicator();
});

// 음성 캡처 표시기 요소 생성
function createCaptureIndicator() {
    const captureIndicator = document.createElement('div');
    captureIndicator.id = 'captureIndicator';
    captureIndicator.className = 'capture-indicator';
    captureIndicator.innerHTML = `
        <div class="indicator-icon">🎤</div>
        <div class="indicator-text">대기 중...</div>
        <div class="live-text" id="liveText"></div>
    `;
    captureIndicator.style.display = 'none';

    document.body.appendChild(captureIndicator);

    // 스타일 적용
    const style = document.createElement('style');
    style.textContent = `
        .capture-indicator {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 15px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            z-index: 1000;
            transition: all 0.3s ease;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
        }
        .indicator-icon {
            margin-right: 8px;
            font-size: 1.2em;
            animation: pulse 1.5s infinite;
        }
        .indicator-text {
            font-weight: bold;
            margin-right: 8px;
        }
        .live-text {
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-style: italic;
            color: #aaf;
        }
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
        }
        .capturing {
            background-color: rgba(0, 128, 0, 0.7);
        }
        
        /* 타이핑 효과 관련 스타일 */
        .typing-effect {
            border-right: 2px solid #333;
            white-space: pre-wrap;
            overflow: hidden;
            width: fit-content;
            animation: typing-cursor 0.7s infinite;
        }
        @keyframes typing-cursor {
            0% { border-right-color: #333; }
            50% { border-right-color: transparent; }
            100% { border-right-color: #333; }
        }
    `;
    document.head.appendChild(style);
}

// 음성 캡처 표시기 업데이트
function updateCaptureIndicator(state, text = '') {
    const indicator = document.getElementById('captureIndicator');
    const liveText = document.getElementById('liveText');
    const indicatorText = indicator.querySelector('.indicator-text');

    if (!indicator || !liveText) return;

    switch (state) {
        case 'waiting':
            indicator.style.display = 'flex';
            indicator.classList.remove('capturing');
            indicatorText.textContent = '대기 중...';
            liveText.textContent = '"거북아"라고 불러보세요';
            break;
        case 'listening':
            indicator.style.display = 'flex';
            indicator.classList.add('capturing');
            indicatorText.textContent = '듣는 중:';
            liveText.textContent = text;
            break;
        case 'processing':
            indicator.style.display = 'flex';
            indicator.classList.add('capturing');
            indicatorText.textContent = '처리 중...';
            liveText.textContent = '';
            break;
        case 'speaking':
            indicator.style.display = 'flex';
            indicator.classList.remove('capturing');
            indicatorText.textContent = '응답 중...';
            liveText.textContent = '';
            break;
        case 'hidden':
            indicator.style.display = 'none';
            break;
        default:
            break;
    }
}

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
            // 초기에는 문제 내용을 로드하지 않고 제목만 설정
            if (title) {
                title.textContent = "바다거북이 스프 게임";
            }
            // 문제 내용은 loadProblemContent 함수에서 도전 버튼 클릭 시 로드됨
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
    const gameInstructions = document.getElementById('gameInstructions');
    const problemContent = document.getElementById('problemContent');

    if (!challengeButton) {
        console.error('challengeButton 요소를 찾을 수 없습니다.');
        return;
    }
    else challengeButton.style.display = 'none'

    // 게임 설명을 숨기고 문제 내용을 표시
    if (gameInstructions) gameInstructions.style.display = 'none';
    if (problemContent) problemContent.style.display = 'block';

    if (dimmed) dimmed.style.display = 'none';
    if (chatBox) chatBox.style.display = 'block';

    // 현재 문제 로드 후 음성 출력
    loadProblemContentAndSpeak();

    // 캡처 표시기 표시
    updateCaptureIndicator('waiting');
}

// 문제 내용 로드 후 음성 출력하는 함수
function loadProblemContentAndSpeak() {
    if (!problemId) return;

    fetch(`${API_BASE_URL}/api/problems/${problemId}`)
        .then(response => {
            if (!response.ok) throw new Error('문제를 찾을 수 없습니다');
            return response.json();
        })
        .then(problem => {
            const content = document.getElementById('content');
            if (content) {
                content.textContent = problem.content;

                // 문제 내용이 업데이트된 후 음성 출력 시작
                // 음성 출력 상태로 설정 (음성 인식 일시 중지)
                isSpeaking = true;
                pauseSpeechRecognition();

                // 음성 출력 중임을 표시
                updateCaptureIndicator('speaking');

                // 업데이트된 문제 내용을 음성으로 출력 (TTS)
                speakText(problem.content)
                    .then(() => {
                        // 음성 출력이 끝난 후 음성 인식 시작
                        isSpeaking = false;
                        startSpeechRecognition();
                        updateCaptureIndicator('waiting');
                    })
                    .catch(error => {
                        console.error('음성 출력 실패:', error);
                        // 음성 출력 실패해도 음성 인식은 시작
                        isSpeaking = false;
                        startSpeechRecognition();
                        updateCaptureIndicator('waiting');
                    });
            }
        })
        .catch(error => {
            console.error('문제 데이터 로드 실패:', error);
            showErrorMessage('문제 데이터를 불러오는 중 오류가 발생했습니다.');
            // 오류 발생 시에도 음성 인식은 시작
            isSpeaking = false;
            startSpeechRecognition();
            updateCaptureIndicator('waiting');
        });
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

                updateCaptureIndicator('waiting');

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
    let interimTranscript = '';

    // 현재 결과 처리 (중복 방지)
    for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
            transcript += result[0].transcript;
        } else {
            interimTranscript += result[0].transcript;
        }
    }

    // 디버깅용 상태 로깅 추가
    console.log('Recognition active:', isRecognitionActive);
    console.log('Is capturing:', isCapturing);
    console.log('Is speaking:', isSpeaking);
    console.log('Current captured text:', capturedText);
    console.log('Last processed text:', lastProcessedText);

    // 실시간 텍스트 표시 (임시 결과 포함)
    if (interimTranscript.trim()) {
        console.log('임시 인식 텍스트:', interimTranscript);

        // 트리거 단어 감지 (임시 텍스트에서)
        const lowerInterim = interimTranscript.toLowerCase();
        let triggered = false;

        // 여러 트리거 단어 확인
        for (const word of TRIGGER_WORDS) {
            if (lowerInterim.includes(word)) {
                triggered = true;
                break;
            }
        }

        if (triggered || isCapturing) {
            // 트리거 단어 감지되면 임시 텍스트를 표시기에 표시
            updateCaptureIndicator('listening', interimTranscript);
        }
    }

    // 빈 결과면 무시
    if (!transcript.trim()) return;

    console.log('인식된 텍스트:', transcript);

    // 중복 방지: 마지막으로 처리된 텍스트와 동일하면 무시
    // 동일한 텍스트가 두 번 연속으로 인식되는 경우에만 중복 처리
    if (transcript === lastProcessedText && !isCapturing) {
        console.log('중복 텍스트 감지, 무시합니다:', transcript);
        return;
    }

    // 트리거 단어 감지
    const lowerTranscript = transcript.toLowerCase();
    let triggered = false;
    let triggerWord = '';

    // 여러 트리거 단어 확인
    for (const word of TRIGGER_WORDS) {
        if (lowerTranscript.includes(word)) {
            triggered = true;
            triggerWord = word;
            break;
        }
    }

    if (triggered && !isCapturing) {
        // 기존 타임아웃 제거
        if (captureTimeout) {
            clearTimeout(captureTimeout);
            captureTimeout = null;
        }

        isCapturing = true;
        const parts = lowerTranscript.split(triggerWord);
        capturedText = parts[parts.length - 1].trim();
        if (status) status.textContent = '상태: 음성 캡처 중...';

        // 캡처 중 표시 업데이트
        updateCaptureIndicator('listening', capturedText);

        // 처리된 텍스트 기록
        lastProcessedText = transcript;

        console.log(`트리거 단어 "${triggerWord}" 감지됨, 캡처 시작:`, capturedText);

        // 캡처 타임아웃 설정 (3초 후 자동 처리)
        captureTimeout = setTimeout(() => {
            if (isCapturing && capturedText.trim().length > 0) {
                console.log('타임아웃: 캡처된 텍스트 처리:', capturedText);
                processCapcapturedText();
            }
        }, 3000);
    } else if (isCapturing) {
        // 기존 타임아웃 갱신
        if (captureTimeout) {
            clearTimeout(captureTimeout);
        }

        capturedText += ' ' + transcript;
        // 처리된 텍스트 기록
        lastProcessedText = transcript;

        // 캡처 중 표시 업데이트
        updateCaptureIndicator('listening', capturedText);

        // 캡처 타임아웃 재설정 (사용자가 말을 멈춘 후 3초 후 자동 처리)
        captureTimeout = setTimeout(() => {
            if (isCapturing && capturedText.trim().length > 0) {
                console.log('타임아웃: 캡처된 텍스트 처리:', capturedText);
                processCapcapturedText();
            }
        }, 3000);
    }

    // 음성 종료 감지 (마지막 결과가 확정된 경우)
    const lastResult = event.results[event.results.length - 1];
    if (lastResult.isFinal && isCapturing) {
        console.log('최종 결과 감지됨, isFinal:', lastResult.isFinal);

        // 타임아웃 취소 (최종 결과가 감지되었으므로)
        if (captureTimeout) {
            clearTimeout(captureTimeout);
            captureTimeout = null;
        }

        if (capturedText.trim().length > 0) {
            processCapcapturedText();
        }
    }
}

// 캡처된 텍스트 처리 함수 (코드 중복 방지)
function processCapcapturedText() {
    const finalText = capturedText.trim();
    console.log('캡처된 최종 텍스트 처리:', finalText);

    // 처리중 상태로 표시 업데이트
    updateCaptureIndicator('processing');

    // 메시지 추가 및 서버로 전송
    addMessage('user', 'You: ' + finalText);

    // 음성 인식 일시 중지 (AI 응답 기다리는 동안)
    pauseSpeechRecognition();

    // 서버로 전송
    sendMessageToAI(finalText);

    // 캡처 상태 초기화
    isCapturing = false;
    capturedText = '';
    if (status) status.textContent = '상태: 대기 중... ("거북아" 또는 "거부가"를 말하세요)';
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
        if (status) status.textContent = '상태: 음성 인식 중... ("거북아" 또는 "거부가"를 말하세요)';

        // 대기 상태로 표시 업데이트
        updateCaptureIndicator('waiting');
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
                        if (status) status.textContent = '상태: 음성 인식 중... ("거북아" 또는 "거부가"를 말하세요)';

                        // 대기 상태로 표시 업데이트
                        updateCaptureIndicator('waiting');
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

// 타이핑 효과 함수
function typeText(element, text, speed = 30) {
    return new Promise((resolve) => {
        let index = 0;
        element.classList.add('typing-effect');
        element.textContent = '';

        function type() {
            if (index < text.length) {
                element.textContent += text.charAt(index);
                index++;
                setTimeout(type, speed);
            } else {
                element.classList.remove('typing-effect');
                resolve();
            }
        }

        type();
    });
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

        // 응답 중임을 표시
        updateCaptureIndicator('speaking');

        // 빈 메시지 요소 생성 (타이핑 효과를 위해)
        const messageElement = addMessage('ai', '', true);

        // 타이핑 효과로 메시지 표시
        await typeText(messageElement, `AI: ${aiMessage}`, 30);

        // 음성 출력 상태로 설정 (말하는 동안 음성 인식 중지)
        isSpeaking = true;

        // AI 응답을 음성으로 출력
        await speakText(aiMessage);

        // 음성 출력 후 다시 음성 인식 시작
        isSpeaking = false;
        startSpeechRecognition();

        // 대기 상태로 업데이트
        updateCaptureIndicator('waiting');
    } catch (error) {
        console.error('AI 대화 실패:', error);

        // 빈 메시지 요소 생성
        const messageElement = addMessage('ai', '', true);

        // 타이핑 효과로 오류 메시지 표시
        await typeText(messageElement, 'AI: 오류가 발생했습니다. 다시 시도해주세요.', 30);

        // 오류 메시지도 음성으로 출력
        isSpeaking = true;
        await speakText('오류가 발생했습니다. 다시 시도해주세요.');

        // 음성 출력 후 다시 음성 인식 시작
        isSpeaking = false;
        startSpeechRecognition();

        // 대기 상태로 업데이트
        updateCaptureIndicator('waiting');
    }
}

// 메시지 추가 (타이핑 효과를 위해 수정)
function addMessage(type, text, emptyForTyping = false) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;

    if (!emptyForTyping) {
        messageDiv.textContent = text;
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return messageDiv;
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
            updateCaptureIndicator('speaking');
        };

        utterance.onend = () => {
            console.log('음성 출력 완료');
            isSpeaking = false; // 음성 출력 완료 플래그 해제
            if (status) status.textContent = '상태: 대기 중... ("거북아" 또는 "거부가"를 말하세요)';
            updateCaptureIndicator('waiting');
            resolve();
        };

        utterance.onerror = (event) => {
            console.error('음성 출력 오류:', event.error);
            isSpeaking = false; // 오류 발생해도 플래그 해제
            if (status) status.textContent = `상태: 출력 오류 - ${event.error}`;
            updateCaptureIndicator('waiting');
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