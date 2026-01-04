'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthChange } from '@/lib/firebase-client';
import { User } from 'firebase/auth';

interface Quiz {
    docId: string;
    title: string;
    answer: string;
    hint?: string;
    audioData: string;
    youtubeUrl: string;
    creatorId?: string;
}

const ADMIN_EMAIL = 'ardor6192@gmail.com';

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: bookId } = use(params);
    const router = useRouter();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [bookTitle, setBookTitle] = useState('문제집');
    const [bookCreatorId, setBookCreatorId] = useState<string | null>(null);
    const [isPrivate, setIsPrivate] = useState(false);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
    const [editAnswer, setEditAnswer] = useState('');
    const [editHint, setEditHint] = useState('');

    useEffect(() => {
        const unsubscribe = onAuthChange((u) => {
            setUser(u);
            setIsAdmin(u?.email === ADMIN_EMAIL);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        fetchQuizzes();
        fetchBookTitle();
    }, [bookId]);

    async function fetchBookTitle() {
        try {
            const res = await fetch('/api/books');
            const books = await res.json();
            const book = books.find((b: any) => b.docId === bookId);
            if (book) {
                setBookTitle(book.title);
                setBookCreatorId(book.creatorId || null);
                setIsPrivate(book.isPrivate || false);
            }
        } catch (error) {
            console.error('Failed to fetch book:', error);
        }
    }

    async function fetchQuizzes() {
        try {
            const res = await fetch(`/api/quizzes?bookId=${bookId}`);
            const data = await res.json();
            setQuizzes(data);
        } catch (error) {
            console.error('Failed to fetch quizzes:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleDeleteQuiz(docId: string) {
        if (!confirm('이 퀴즈를 삭제하시겠습니까?')) return;
        try {
            await fetch(`/api/quizzes/${docId}`, { method: 'DELETE' });
            setQuizzes(quizzes.filter((q) => q.docId !== docId));
        } catch (error) {
            console.error('Failed to delete quiz:', error);
        }
    }

    function openEditModal(quiz: Quiz) {
        setEditingQuiz(quiz);
        setEditAnswer(quiz.answer);
        setEditHint(quiz.hint || '');
    }

    async function handleSaveEdit() {
        if (!editingQuiz) return;
        try {
            await fetch(`/api/quizzes/${editingQuiz.docId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: editAnswer,
                    answer: editAnswer,
                    hint: editHint,
                }),
            });
            setQuizzes(quizzes.map((q) =>
                q.docId === editingQuiz.docId
                    ? { ...q, title: editAnswer, answer: editAnswer, hint: editHint }
                    : q
            ));
            setEditingQuiz(null);
        } catch (error) {
            console.error('Failed to update quiz:', error);
        }
    }

    // Check if current user can view quiz list (admin or book creator)
    const canViewQuizzes = isAdmin || (user && bookCreatorId && user.uid === bookCreatorId);

    return (
        <div className="min-h-screen text-white">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
                    <Link href="/" className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                        🎵 뮤직퀴즈
                    </Link>
                </div>
            </header>

            {/* Main */}
            <main className="pt-24 pb-16 px-6 max-w-4xl mx-auto">
                <button onClick={() => router.push('/')} className="mb-6 text-gray-400 hover:text-white">
                    ← 뒤로
                </button>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-2">
                        📚 {bookTitle}
                    </h1>
                    <p className="text-gray-400">
                        {canViewQuizzes ? '퀴즈를 확인하고 수정할 수 있습니다.' : '플레이 버튼을 눌러 퀴즈를 시작하세요!'}
                    </p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                    {quizzes.length > 0 && (
                        <Link
                            href={`/play/${bookId}`}
                            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold text-lg shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all hover:-translate-y-1"
                        >
                            ▶️ 플레이 시작
                        </Link>
                    )}
                    {(isAdmin || (user && bookCreatorId && user.uid === bookCreatorId)) && (
                        <>
                            <Link
                                href={`/create?bookId=${bookId}&bookTitle=${encodeURIComponent(bookTitle)}`}
                                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-bold text-lg shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all hover:-translate-y-1"
                            >
                                ➕ 퀴즈 추가
                            </Link>
                            <button
                                onClick={async () => {
                                    const newPrivate = !isPrivate;
                                    try {
                                        await fetch(`/api/books/${bookId}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ isPrivate: newPrivate }),
                                        });
                                        setIsPrivate(newPrivate);
                                    } catch (error) {
                                        console.error('Failed to update privacy:', error);
                                    }
                                }}
                                className={`inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all hover:-translate-y-1 ${isPrivate
                                        ? 'bg-gradient-to-r from-gray-600 to-gray-700 shadow-gray-500/30 hover:shadow-gray-500/50'
                                        : 'bg-gradient-to-r from-yellow-500 to-orange-500 shadow-yellow-500/30 hover:shadow-yellow-500/50'
                                    }`}
                            >
                                {isPrivate ? '🔓 공개로 전환' : '🔒 비공개로 전환'}
                            </button>
                        </>
                    )}
                </div>

                {/* Quiz count info for non-authorized users */}
                {!canViewQuizzes && !loading && quizzes.length > 0 && (
                    <div className="text-center py-8 bg-white/5 border border-white/10 rounded-2xl">
                        <div className="text-5xl mb-3">🎵</div>
                        <p className="text-xl font-semibold text-purple-400 mb-2">{quizzes.length}개의 퀴즈</p>
                        <p className="text-gray-500">플레이 버튼을 눌러 도전해보세요!</p>
                    </div>
                )}

                {/* Quiz list - only visible to admin and book creator */}
                {canViewQuizzes && (
                    <>
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-gray-400">퀴즈를 불러오는 중...</p>
                            </div>
                        ) : quizzes.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <div className="text-6xl mb-4">🎵</div>
                                <p>아직 퀴즈가 없습니다. 퀴즈를 추가해주세요!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {quizzes.map((quiz, index) => {
                                    const canEdit = user && (quiz.creatorId === user.uid || isAdmin);
                                    return (
                                        <div
                                            key={quiz.docId}
                                            className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-purple-500/50 transition-colors"
                                        >
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className="w-7 h-7 flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-sm font-bold">
                                                            {index + 1}
                                                        </span>
                                                        <span className="font-semibold">{quiz.answer}</span>
                                                    </div>
                                                    {quiz.hint && (
                                                        <p className="text-sm text-gray-500 ml-10">💡 {quiz.hint}</p>
                                                    )}
                                                </div>
                                                {canEdit && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => openEditModal(quiz)}
                                                            className="px-3 py-1.5 text-sm bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30"
                                                        >
                                                            ✏️ 수정
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteQuiz(quiz.docId)}
                                                            className="px-3 py-1.5 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                                                        >
                                                            🗑️ 삭제
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Edit Modal */}
            {editingQuiz && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingQuiz(null)} />
                    <div className="relative w-full max-w-md bg-[#12121a] border border-white/10 rounded-2xl overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold">✏️ 퀴즈 수정</h2>
                            <button onClick={() => setEditingQuiz(null)} className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/30">
                                ✕
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">정답 (노래 제목)</label>
                                <input
                                    type="text"
                                    value={editAnswer}
                                    onChange={(e) => setEditAnswer(e.target.value)}
                                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none"
                                    placeholder="정답"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">힌트 (선택사항)</label>
                                <input
                                    type="text"
                                    value={editHint}
                                    onChange={(e) => setEditHint(e.target.value)}
                                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none"
                                    placeholder="힌트"
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-black/20 flex justify-end gap-3">
                            <button onClick={() => setEditingQuiz(null)} className="px-4 py-2 text-gray-400 hover:text-white">
                                취소
                            </button>
                            <button onClick={handleSaveEdit} className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold hover:opacity-90">
                                저장
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
