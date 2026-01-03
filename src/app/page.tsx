'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loginWithGoogle, logout, onAuthChange } from '@/lib/firebase-client';
import { User } from 'firebase/auth';

interface Book {
  docId: string;
  title: string;
  createdAt: string;
  creatorId?: string;
}

interface Quiz {
  docId: string;
  bookId: string;
}

const ADMIN_EMAIL = 'ardor6192@gmail.com';

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [quizCounts, setQuizCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Auth state
  useEffect(() => {
    const unsubscribe = onAuthChange((u) => {
      setUser(u);
      setIsAdmin(u?.email === ADMIN_EMAIL);
    });
    return () => unsubscribe();
  }, []);

  // Fetch books
  useEffect(() => {
    fetchBooks();
  }, []);

  async function fetchBooks() {
    try {
      const [booksRes, quizzesRes] = await Promise.all([
        fetch('/api/books'),
        fetch('/api/quizzes'),
      ]);
      const booksData = await booksRes.json();
      const quizzesData: Quiz[] = await quizzesRes.json();

      // Count quizzes per book
      const counts: Record<string, number> = {};
      quizzesData.forEach((q) => {
        if (q.bookId) {
          counts[q.bookId] = (counts[q.bookId] || 0) + 1;
        }
      });

      setBooks(booksData);
      setQuizCounts(counts);
    } catch (error) {
      console.error('Failed to fetch books:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteBook(docId: string) {
    if (!confirm('이 문제집을 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/books/${docId}`, { method: 'DELETE' });
      setBooks(books.filter((b) => b.docId !== docId));
    } catch (error) {
      console.error('Failed to delete book:', error);
    }
  }

  async function handleLogin() {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  function formatDate(isoString: string) {
    const date = new Date(isoString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  }

  return (
    <div className="min-h-screen text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            🎵 뮤직퀴즈
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full" />
                <span className="text-sm hidden sm:inline">{user.displayName}</span>
                <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white">
                  로그아웃
                </button>
              </>
            ) : (
              <button
                onClick={handleLogin}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-semibold hover:opacity-90"
              >
                🔑 로그인
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-16 px-6 max-w-6xl mx-auto">
        {/* Hero */}
        <div className="text-center py-12">
          <h1 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-4">
            🎤 노래 맞추기 퀴즈
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            친구가 부른 노래를 듣고 원곡을 맞춰보세요!
          </p>
          {user && (
            <Link
              href="/create-book"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold text-lg shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all hover:-translate-y-1"
            >
              📚 새 문제집 만들기
            </Link>
          )}
        </div>

        {/* Books List */}
        <section>
          <h2 className="text-2xl font-bold mb-6">📚 문제집</h2>
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">문제집을 불러오는 중...</p>
            </div>
          ) : books.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">📚</div>
              <p>아직 문제집이 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.map((book) => {
                const canDelete = user && (book.creatorId === user.uid || isAdmin);
                const canAddQuiz = user && (book.creatorId === user.uid || isAdmin);
                return (
                  <div
                    key={book.docId}
                    className="group relative bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-purple-500/50 hover:-translate-y-1 transition-all cursor-pointer"
                  >
                    <Link href={`/book/${book.docId}`} className="block">
                      <h3 className="text-lg font-bold mb-2 group-hover:text-purple-400 transition-colors">
                        {book.title}
                      </h3>
                      <p className="text-sm text-gray-500 mb-1">📅 {formatDate(book.createdAt)}</p>
                      <p className="text-purple-400 font-semibold">🎵 {quizCounts[book.docId] || 0}문제</p>
                      <span className="inline-block mt-4 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-xs font-semibold">
                        ▶️ 플레이
                      </span>
                    </Link>
                    {(canDelete || canAddQuiz) && (
                      <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                        {canAddQuiz && (
                          <Link
                            href={`/create?bookId=${book.docId}&bookTitle=${encodeURIComponent(book.title)}`}
                            className="flex-1 text-center py-2 text-sm bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30"
                            onClick={(e) => e.stopPropagation()}
                          >
                            ➕ 퀴즈 추가
                          </Link>
                        )}
                        {canDelete && (
                          <button
                            onClick={(e) => { e.preventDefault(); handleDeleteBook(book.docId); }}
                            className="flex-1 py-2 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                          >
                            🗑️ 삭제
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
