import type { APIRoute } from 'astro';
import { NoteService } from '../../lib/services';

// GET /api/notes - 取得心得列表
export const GET: APIRoute = async ({ request, url }) => {
  try {
    const searchParams = url.searchParams;
    const filters = {
      recipe_id: searchParams.get('recipe_id') || undefined,
      author_id: searchParams.get('author_id') || undefined,
      rating: searchParams.get('rating') ? parseInt(searchParams.get('rating')!) : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    };

    const result = await NoteService.getNotes(filters);

    return new Response(JSON.stringify({
      success: true,
      data: result.data,
      hasMore: result.hasMore
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('API GET /api/notes error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error instanceof Error ? error.message : '取得心得列表失敗'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

// POST /api/notes - 新增心得
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { recipe_id, content, rating, images } = body;

    // 驗證必要欄位
    if (!recipe_id || !content || !rating) {
      return new Response(JSON.stringify({
        success: false,
        message: '缺少必要欄位：recipe_id, content, rating'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // 驗證評分範圍
    if (rating < 1 || rating > 5) {
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

    const note = await NoteService.createNote({
      recipe_id,
      content,
      rating,
      images: images || []
    });

    return new Response(JSON.stringify({
      success: true,
      data: note
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('API POST /api/notes error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error instanceof Error ? error.message : '新增心得失敗'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
