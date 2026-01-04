'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthChange } from '@/lib/firebase-client';
import { User } from 'firebase/auth';

export default function CreateBookPage() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthChange((u) => {
            setUser(u);
        });
        return () => unsubscribe();
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim()) return;
        if (!user) {
            alert('로그인이 필요합니다.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    creatorId: user.uid,
                    creatorEmail: user.email,
                    isPrivate,
                }),
            });

            if (res.ok) {
                router.push('/');
            } else {
                alert('문제집 생성에 실패했습니다.');
            }
        } catch (error) {
            console.error('Failed to create book:', error);
            alert('문제집 생성에 실패했습니다.');
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
            <main className="pt-24 pb-16 px-6 max-w-xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-2">
                        📚 새 문제집 만들기
                    </h1>
                    <p className="text-gray-400">문제집을 만들고 퀴즈를 추가하세요!</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-8">
                    <div className="mb-6">
                        <label className="block text-sm text-gray-400 mb-2">문제집 이름</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none text-lg"
                            placeholder="문제집 이름을 입력하세요"
                            required
                        />
                    </div>

                    <div className="mb-6">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={isPrivate}
                                    onChange={(e) => setIsPrivate(e.target.checked)}
                                    className="sr-only"
                                />
                                <div className={`w-12 h-6 rounded-full transition-colors ${isPrivate ? 'bg-purple-500' : 'bg-white/20'}`}>
                                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${isPrivate ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                </div>
                            </div>
                            <div>
                                <span className="text-white font-medium">🔒 비공개</span>
                                <p className="text-sm text-gray-500">링크를 아는 사람만 접근 가능</p>
                            </div>
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !title.trim()}
                        className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold text-lg shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? '생성 중...' : '📚 문제집 만들기'}
                    </button>
                </form>
            </main>
        </div>
    );
}
