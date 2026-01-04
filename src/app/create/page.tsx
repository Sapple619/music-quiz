'use client';

import { useState, useRef, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function CreateQuizContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const bookId = searchParams.get('bookId');
    const bookTitle = searchParams.get('bookTitle');
    const editId = searchParams.get('editId');
    const isEditMode = !!editId;

    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [videoId, setVideoId] = useState<string | null>(null);
    const [answer, setAnswer] = useState('');
    const [hint, setHint] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [recordingTime, setRecordingTime] = useState('00:00');
    const [existingAudioData, setExistingAudioData] = useState<string | null>(null);
    const [originalBookId, setOriginalBookId] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);

    // Load existing quiz data in edit mode
    useEffect(() => {
        if (editId) {
            fetchQuizData();
        }
    }, [editId]);

    async function fetchQuizData() {
        try {
            const res = await fetch(`/api/quizzes/${editId}`);
            if (res.ok) {
                const quiz = await res.json();
                // Populate form with existing data
                setYoutubeUrl(quiz.youtubeUrl || '');
                if (quiz.youtubeUrl) {
                    const id = extractVideoId(quiz.youtubeUrl);
                    if (id) setVideoId(id);
                }
                // Join answers array back to comma-separated string
                const answerStr = quiz.answers ? quiz.answers.join(', ') : quiz.answer;
                setAnswer(answerStr || '');
                setHint(quiz.hint || '');
                setExistingAudioData(quiz.audioData || null);
                setAudioUrl(quiz.audioData || null);
                setOriginalBookId(quiz.bookId || null);
            }
        } catch (error) {
            console.error('Failed to fetch quiz:', error);
        }
    }

    function extractVideoId(url: string) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/shorts\/([^&\n?#]+)/
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    }

    function handleLoadVideo() {
        const id = extractVideoId(youtubeUrl);
        if (id) {
            setVideoId(id);
        } else {
            alert('올바른 YouTube URL이 아닙니다.');
        }
    }

    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(t => t.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            startTimeRef.current = Date.now();

            timerRef.current = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
                const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
                const secs = (elapsed % 60).toString().padStart(2, '0');
                setRecordingTime(`${mins}:${secs}`);
            }, 1000);
        } catch (error) {
            alert('마이크 권한을 허용해주세요.');
        }
    }

    function stopRecording() {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    }

    function blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    async function handleSubmit() {
        // In edit mode, allow using existing audio
        const hasAudio = audioBlob || existingAudioData;
        if (!hasAudio || !answer.trim() || !videoId) {
            alert('YouTube 영상, 녹음, 정답이 모두 필요합니다.');
            return;
        }

        setLoading(true);
        try {
            // Use new audio if recorded, otherwise use existing
            const audioData = audioBlob ? await blobToBase64(audioBlob) : existingAudioData;

            if (isEditMode && editId) {
                // Update existing quiz
                const res = await fetch(`/api/quizzes/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: answer.trim().split(',')[0].trim(),
                        answer: answer.trim(),
                        hint: hint.trim(),
                        youtubeUrl,
                        audioData,
                    }),
                });

                if (res.ok) {
                    const targetBookId = bookId || originalBookId;
                    if (targetBookId) {
                        router.push(`/book/${targetBookId}`);
                    } else {
                        router.push('/');
                    }
                } else {
                    const data = await res.json();
                    alert(data.error || '수정에 실패했습니다.');
                }
            } else {
                // Create new quiz
                const res = await fetch('/api/quizzes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: answer.trim(),
                        answer: answer.trim(),
                        hint: hint.trim(),
                        youtubeUrl,
                        audioData,
                        bookId,
                    }),
                });

                if (res.ok) {
                    if (bookId) {
                        router.push(`/book/${bookId}`);
                    } else {
                        router.push('/');
                    }
                } else {
                    const data = await res.json();
                    alert(data.error || '저장에 실패했습니다.');
                }
            }
        } catch (error) {
            console.error('Failed to save quiz:', error);
            alert(isEditMode ? '수정에 실패했습니다.' : '저장에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen text-white">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <Link href="/" className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                        🎵 뮤직퀴즈
                    </Link>
                </div>
            </header>

            {/* Main */}
            <main className="pt-24 pb-16 px-6 max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-2">
                        🎙️ {isEditMode ? '퀴즈 수정' : (bookTitle ? `${bookTitle}에 퀴즈 추가` : '새 퀴즈 만들기')}
                    </h1>
                    <p className="text-gray-400">
                        {isEditMode ? '퀴즈 내용을 수정하세요.' : 'YouTube 영상을 보면서 따라 부르고, 퀴즈로 만들어보세요!'}
                    </p>
                </div>

                {/* Step 1: YouTube */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="w-8 h-8 flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-bold">1</span>
                        <h3 className="font-bold text-lg">YouTube 노래 선택</h3>
                    </div>
                    <div className="flex gap-3 mb-4">
                        <input
                            type="text"
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            placeholder="YouTube URL을 붙여넣으세요"
                            className="flex-1 px-4 py-3 bg-black/30 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none"
                        />
                        <button onClick={handleLoadVideo} className="px-6 py-3 bg-white/10 border border-white/10 rounded-xl hover:bg-white/20">
                            불러오기
                        </button>
                    </div>
                    {videoId && (
                        <div className="aspect-video rounded-xl overflow-hidden bg-black">
                            <iframe
                                src={`https://www.youtube.com/embed/${videoId}`}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    )}
                </div>

                {/* Step 2: Record */}
                <div className={`bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 ${!videoId ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex items-center gap-3 mb-4">
                        <span className="w-8 h-8 flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-bold">2</span>
                        <h3 className="font-bold text-lg">노래 따라 부르며 녹음</h3>
                    </div>
                    <p className="text-sm text-gray-400 mb-4 p-3 bg-purple-500/10 border-l-2 border-purple-500 rounded">
                        💡 팁: YouTube 영상을 재생하면서 따라 불러보세요. 마이크 권한을 허용해야 합니다.
                    </p>
                    <div className="flex flex-col items-center gap-4">
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`px-8 py-4 rounded-xl font-bold text-lg ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-red-500 to-red-600'}`}
                        >
                            🎙️ {isRecording ? `녹음 중지 (${recordingTime})` : '녹음 시작'}
                        </button>
                        {audioUrl && (
                            <div className="w-full p-4 bg-black/20 rounded-xl text-center">
                                <p className="text-sm text-gray-400 mb-2">🔊 녹음 미리듣기</p>
                                <audio src={audioUrl} controls controlsList="nodownload" className="w-full mb-3" />
                                <button onClick={() => { setAudioBlob(null); setAudioUrl(null); }} className="text-sm text-gray-400 hover:text-white">
                                    다시 녹음
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Step 3: Save */}
                <div className={`bg-white/5 border border-white/10 rounded-2xl p-6 ${!(audioBlob || existingAudioData) ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex items-center gap-3 mb-4">
                        <span className="w-8 h-8 flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-bold">3</span>
                        <h3 className="font-bold text-lg">퀴즈 저장</h3>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">정답 (노래 제목)</label>
                            <input
                                type="text"
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                placeholder="정답 (쉼표로 복수정답 입력 가능)"
                                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none"
                            />
                            <p className="text-xs text-gray-500 mt-1">💡 복수 정답: 쉼표(,)로 구분 (예: 카트,카트라이더,카트 라이더)</p>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">힌트 (선택사항)</label>
                            <input
                                type="text"
                                value={hint}
                                onChange={(e) => setHint(e.target.value)}
                                placeholder="힌트"
                                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none"
                            />
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !answer.trim()}
                            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold text-lg shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all disabled:opacity-50"
                        >
                            {loading ? (isEditMode ? '수정 중...' : '저장 중...') : (isEditMode ? '✏️ 퀴즈 수정하기' : '💾 퀴즈 저장하기')}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function CreatePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">로딩 중...</div>}>
            <CreateQuizContent />
        </Suspense>
    );
}
