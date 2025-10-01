import type { APIRoute } from 'astro';
import { ProfileService } from '../../../lib/services';

// GET /api/profile/stats - 取得使用者統計資料
export const GET: APIRoute = async () => {
  try {
    const stats = await ProfileService.getUserStats();

    return new Response(JSON.stringify({
      success: true,
      data: stats
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('API GET /api/profile/stats error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error instanceof Error ? error.message : '取得統計資料失敗'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
