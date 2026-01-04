'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Quiz {
    docId: string;
    title: string;
    answer: string;
    answers?: string[]; // Multiple valid answers
    hint?: string;
    audioData: string;
    youtubeUrl: string;
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

function extractStartTime(url: string) {
    const match = url.match(/[?&]t=(\d+)/);
    return match ? parseInt(match[1]) : 0;
}

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export default function PlayPage({ params }: { params: Promise<{ bookId: string }> }) {
    const { bookId } = use(params);
    const router = useRouter();

    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState('');
    const [showResult, setShowResult] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState<{ title: string; answer: string; userAnswer: string; isCorrect: boolean }[]>([]);
    const [gameComplete, setGameComplete] = useState(false);

    useEffect(() => {
        fetchQuizzes();
    }, [bookId]);

    async function fetchQuizzes() {
        try {
            const res = await fetch(`/api/quizzes?bookId=${bookId}`);
            const data = await res.json();
            if (data.length === 0) {
                alert('문제집에 퀴즈가 없습니다.');
                router.push('/');
                return;
            }
            setQuizzes(shuffleArray(data));
        } catch (error) {
            console.error('Failed to fetch quizzes:', error);
        } finally {
            setLoading(false);
        }
    }

    function checkAnswer(userAns: string, quiz: Quiz) {
        const normalize = (str: string) => str.toLowerCase().trim().replace(/\s+/g, ' ');
        const normalizedUserAns = normalize(userAns);

        // Check against all valid answers
        const validAnswers = quiz.answers || [quiz.answer];
        return validAnswers.some(ans => normalize(ans) === normalizedUserAns);
    }

    function handleSubmit() {
        if (!userAnswer.trim()) return;
        const quiz = quizzes[currentIndex];
        const correct = checkAnswer(userAnswer, quiz);
        setIsCorrect(correct);
        setShowResult(true);
        setResults([...results, { title: quiz.title, answer: quiz.answer, userAnswer, isCorrect: correct }]);
    }

    function handleNext() {
        if (currentIndex < quizzes.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setUserAnswer('');
            setShowResult(false);
            setShowHint(false);
        } else {
            setGameComplete(true);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p>퀴즈를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    if (gameComplete) {
        const correctCount = results.filter(r => r.isCorrect).length;
        const percentage = Math.round((correctCount / results.length) * 100);

        return (
            <div className="min-h-screen text-white py-24 px-6">
                <div className="max-w-lg mx-auto text-center">
                    <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-4">
                        📊 결과
                    </h1>
                    <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                        <div className="text-center">
                            <span className="text-4xl font-black">{correctCount}</span>
                            <span className="text-xl text-white/70">/{results.length}</span>
                        </div>
                    </div>
                    <p className="text-xl mb-8">
                        {percentage >= 80 ? '🎉 대단해요! 음악 마스터!' :
                            percentage >= 60 ? '👍 잘했어요!' :
                                percentage >= 40 ? '💪 조금만 더 노력해요!' : '🎧 더 많은 음악을 들어보세요!'}
                    </p>
                    <div className="space-y-2 mb-8 text-left">
                        {results.map((r, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                                <span className="text-xl">{r.isCorrect ? '✅' : '❌'}</span>
                                <div>
                                    <p className="font-semibold">{i + 1}. {r.title}</p>
                                    <p className="text-sm text-gray-400">정답: {r.answer}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Link href="/" className="inline-block px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold">
                        홈으로
                    </Link>
                </div>
            </div>
        );
    }

    const currentQuiz = quizzes[currentIndex];
    const videoId = extractVideoId(currentQuiz.youtubeUrl);
    const startTime = extractStartTime(currentQuiz.youtubeUrl);

    return (
        <div className="min-h-screen text-white py-24 px-6">
            <div className="max-w-lg mx-auto">
                {/* Progress */}
                <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                        <span>{currentIndex + 1} / {quizzes.length}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                            style={{ width: `${((currentIndex + 1) / quizzes.length) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-center">
                        <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm mb-2">🎵 퀴즈</span>
                        <h2 className="text-xl font-bold">이 노래는 무엇일까요?</h2>
                    </div>

                    <div className="p-6">
                        {/* Audio Player */}
                        <div className="text-center mb-6">
                            <p className="text-gray-400 mb-3">🎧 녹음된 노래를 들어보세요</p>
                            <audio src={currentQuiz.audioData} controls className="w-full" />
                        </div>

                        {/* Hint */}
                        {currentQuiz.hint && !showResult && (
                            <div className="text-center mb-6">
                                <button
                                    onClick={() => setShowHint(!showHint)}
                                    className="px-4 py-2 text-sm bg-yellow-500/20 text-yellow-400 rounded-lg"
                                >
                                    💡 {showHint ? '힌트 숨기기' : '힌트 보기'}
                                </button>
                                {showHint && (
                                    <p className="mt-2 p-3 bg-yellow-500/10 rounded-lg text-yellow-400">{currentQuiz.hint}</p>
                                )}
                            </div>
                        )}

                        {/* Answer Input */}
                        {!showResult && (
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={userAnswer}
                                    onChange={(e) => setUserAnswer(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                    placeholder="정답을 입력하세요"
                                    className="flex-1 px-4 py-3 bg-black/30 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none"
                                />
                                <button onClick={handleSubmit} className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold">
                                    확인
                                </button>
                            </div>
                        )}

                        {/* Result */}
                        {showResult && (
                            <div className="text-center">
                                <div className={`p-6 rounded-xl mb-4 ${isCorrect ? 'bg-green-500/20 border border-green-500' : 'bg-red-500/20 border border-red-500'}`}>
                                    <div className="text-5xl mb-2">{isCorrect ? '🎉' : '😢'}</div>
                                    <h3 className="text-xl font-bold mb-1">{isCorrect ? '정답입니다!' : '아쉽네요!'}</h3>
                                    <p className="text-gray-400">정답: <strong className="text-white">{currentQuiz.answer}</strong></p>
                                </div>
                                {videoId && (
                                    <div className="aspect-video rounded-xl overflow-hidden bg-black mb-4">
                                        <iframe
                                            src={`https://www.youtube.com/embed/${videoId}?start=${startTime}&autoplay=1`}
                                            className="w-full h-full"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>
                                )}
                                <button onClick={handleNext} className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold">
                                    {currentIndex < quizzes.length - 1 ? '다음 문제 →' : '결과 보기 →'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
