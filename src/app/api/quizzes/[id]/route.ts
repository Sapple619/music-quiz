// Quizzes API - PUT (update) and DELETE by ID
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const QUIZ_COLLECTION = 'quizzes';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { title, answer, hint } = body;

        const updates: any = {
            updatedAt: new Date().toISOString(),
        };

        if (title !== undefined) updates.title = title;
        if (answer !== undefined) updates.answer = answer;
        if (hint !== undefined) updates.hint = hint;

        await adminDb.collection(QUIZ_COLLECTION).doc(id).update(updates);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to update quiz:', error);
        return NextResponse.json({ error: 'Failed to update quiz' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await adminDb.collection(QUIZ_COLLECTION).doc(id).delete();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete quiz:', error);
        return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 });
    }
}
