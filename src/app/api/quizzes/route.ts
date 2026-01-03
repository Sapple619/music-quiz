// Quizzes API - GET (by bookId) and POST (create)
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const QUIZ_COLLECTION = 'quizzes';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const bookId = searchParams.get('bookId');

        let query = adminDb.collection(QUIZ_COLLECTION).orderBy('createdAt', 'desc');

        const snapshot = await query.get();
        let quizzes = snapshot.docs.map(doc => ({
            ...doc.data(),
            docId: doc.id,
        }));

        // Filter by bookId if provided
        if (bookId) {
            quizzes = quizzes.filter((q: any) => q.bookId === bookId);
        }

        return NextResponse.json(quizzes);
    } catch (error) {
        console.error('Failed to fetch quizzes:', error);
        return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { title, answer, hint, youtubeUrl, audioData, bookId, creatorId, creatorEmail } = body;

        if (!answer || !audioData) {
            return NextResponse.json({ error: 'Answer and audio are required' }, { status: 400 });
        }

        // Check audio size (Firestore document limit is ~1MB)
        const sizeInMB = audioData.length / (1024 * 1024);
        if (sizeInMB > 0.9) {
            return NextResponse.json({ error: 'Audio too large, keep under 30 seconds' }, { status: 400 });
        }

        const quizDoc = {
            id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: title || answer,
            answer,
            hint: hint || '',
            youtubeUrl,
            audioData,
            bookId: bookId || null,
            creatorId: creatorId || null,
            creatorEmail: creatorEmail || null,
            createdAt: new Date().toISOString(),
        };

        const docRef = await adminDb.collection(QUIZ_COLLECTION).add(quizDoc);

        return NextResponse.json({ ...quizDoc, docId: docRef.id });
    } catch (error) {
        console.error('Failed to create quiz:', error);
        return NextResponse.json({ error: 'Failed to create quiz' }, { status: 500 });
    }
}
