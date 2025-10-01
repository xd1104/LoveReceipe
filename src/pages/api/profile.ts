import type { APIRoute } from 'astro';
import { ProfileService } from '../../lib/services';

// GET /api/profile - 取得個人資料
export const GET: APIRoute = async () => {
  try {
    const profile = await ProfileService.getProfile();

    return new Response(JSON.stringify({
      success: true,
      data: profile
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('API GET /api/profile error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error instanceof Error ? error.message : '取得個人資料失敗'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

// PUT /api/profile - 更新個人資料
export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { nickname, avatar_url } = body;

    const profile = await ProfileService.upsertProfile({
      nickname,
      avatar_url
    });

    return new Response(JSON.stringify({
      success: true,
      data: profile
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('API PUT /api/profile error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error instanceof Error ? error.message : '更新個人資料失敗'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
