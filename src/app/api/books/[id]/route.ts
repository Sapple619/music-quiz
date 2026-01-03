// Books API - DELETE by ID
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const BOOK_COLLECTION = 'quizBooks';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await adminDb.collection(BOOK_COLLECTION).doc(id).delete();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete book:', error);
        return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 });
    }
}
