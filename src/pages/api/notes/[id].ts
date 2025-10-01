import type { APIRoute } from 'astro';
import { NoteService } from '../../../lib/services';

// GET /api/notes/[id] - 取得單一心得
export const GET: APIRoute = async ({ params }) => {
  try {
    const { id } = params;
    
    if (!id) {
      return new Response(JSON.stringify({
        success: false,
        message: '缺少心得 ID'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    const note = await NoteService.getNote(id);

    if (!note) {
      return new Response(JSON.stringify({
        success: false,
        message: '找不到心得'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: note
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('API GET /api/notes/[id] error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error instanceof Error ? error.message : '取得心得失敗'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

// PUT /api/notes/[id] - 更新心得
export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const { id } = params;
    const body = await request.json();
    const { content, rating, images } = body;

    if (!id) {
      return new Response(JSON.stringify({
        success: false,
        message: '缺少心得 ID'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // 驗證評分範圍
    if (rating && (rating < 1 || rating > 5)) {
      return new Response(JSON.stringify({
        success: false,
        message: '評分必須在 1-5 之間'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    const updateData: any = {};
    if (content !== undefined) updateData.content = content;
    if (rating !== undefined) updateData.rating = rating;
    if (images !== undefined) updateData.images = images;

    const note = await NoteService.updateNote(id, updateData);

    return new Response(JSON.stringify({
      success: true,
      data: note
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('API PUT /api/notes/[id] error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error instanceof Error ? error.message : '更新心得失敗'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

// DELETE /api/notes/[id] - 刪除心得
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({
        success: false,
        message: '缺少心得 ID'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    await NoteService.deleteNote(id);

    return new Response(JSON.stringify({
      success: true,
      message: '心得已刪除'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('API DELETE /api/notes/[id] error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error instanceof Error ? error.message : '刪除心得失敗'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
