// Books API - GET (list) and POST (create)
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const BOOK_COLLECTION = 'quizBooks';

export async function GET() {
    try {
        const snapshot = await adminDb
            .collection(BOOK_COLLECTION)
            .orderBy('createdAt', 'desc')
            .get();

        const books = snapshot.docs.map(doc => ({
            ...doc.data(),
            docId: doc.id,
        }));

        return NextResponse.json(books);
    } catch (error) {
        console.error('Failed to fetch books:', error);
        return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { title, description, creatorId, creatorEmail, isPrivate } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const bookDoc = {
            id: `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title,
            description: description || '',
            quizIds: [],
            quizCount: 0,
            creatorId: creatorId || null,
            creatorEmail: creatorEmail || null,
            isPrivate: isPrivate || false,
            createdAt: new Date().toISOString(),
        };

        const docRef = await adminDb.collection(BOOK_COLLECTION).add(bookDoc);

        return NextResponse.json({ ...bookDoc, docId: docRef.id });
    } catch (error) {
        console.error('Failed to create book:', error);
        return NextResponse.json({ error: 'Failed to create book' }, { status: 500 });
    }
}
