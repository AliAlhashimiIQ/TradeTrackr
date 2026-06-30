import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  // 1. Authenticate request
  let auth = await authenticateRequest(request);
  
  if ('error' in auth && auth.error) {
    // Fallback: Support token in query parameter for browser <img> requests
    const { searchParams } = new URL(request.url);
    const queryToken = searchParams.get('token');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (queryToken && supabaseUrl && supabaseServiceKey) {
      const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
      const { data: { user }, error } = await supabaseClient.auth.getUser(queryToken);
      if (!error && user) {
        auth = { user, supabase: supabaseClient };
      }
    }
  }

  if ('error' in auth && auth.error) return auth.error;
  
  const userId = auth.user!.id;
  const supabase = auth.supabase!;

  // 2. Extract media URL
  const { searchParams } = new URL(request.url);
  const mediaUrl = searchParams.get('url');

  if (!mediaUrl) {
    return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
  }

  try {
    // 3. Extract bucket and path from Supabase storage URL
    // e.g. .../storage/v1/object/public/trade-screenshots/userId/path/to/file.png
    const match = mediaUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid Supabase storage URL format' }, { status: 400 });
    }

    const bucket = match[1];
    const path = match[2];

    // Ensure we only serve allowed buckets
    if (bucket !== 'trade-screenshots' && bucket !== 'trade-videos') {
      return NextResponse.json({ error: 'Access to bucket not allowed' }, { status: 403 });
    }

    // Ensure user only accesses their own directory
    if (!path.startsWith(`${userId}/`)) {
      return NextResponse.json({ error: 'Access denied: Unauthorized file owner' }, { status: 403 });
    }

    // 4. Generate signed URL (expires in 60 seconds)
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60);

    if (error || !data?.signedUrl) {
      console.error('Error generating signed URL:', error);
      return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
    }

    // 5. Redirect the client to the temporary signed URL
    return NextResponse.redirect(data.signedUrl);
  } catch (err: any) {
    console.error('Media proxy error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
