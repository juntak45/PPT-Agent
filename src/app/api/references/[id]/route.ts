import { NextRequest } from 'next/server';
import { getReference, removeReference } from '@/lib/reference/store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ref = await getReference(id);
    if (!ref) {
      return Response.json({ error: '레퍼런스를 찾을 수 없습니다' }, { status: 404 });
    }
    return Response.json(ref);
  } catch (error) {
    console.error('Reference GET error:', error);
    return Response.json({ error: '레퍼런스를 불러올 수 없습니다' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const removed = await removeReference(id);
    if (!removed) {
      return Response.json({ error: '레퍼런스를 찾을 수 없습니다' }, { status: 404 });
    }
    return Response.json({ success: true });
  } catch (error) {
    console.error('Reference DELETE error:', error);
    return Response.json({ error: '레퍼런스 삭제에 실패했습니다' }, { status: 500 });
  }
}
