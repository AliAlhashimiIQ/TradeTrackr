import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { createClient } from '@supabase/supabase-js';

// Allowed MIME types for video uploads
const ALLOWED_VIDEO_TYPES = [
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  'video/x-matroska', 'video/ogg',
];

// Max file size: 50 MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  // 1. Authenticate — reject unauthenticated requests
  const auth = await authenticateRequest(request);
  if ('error' in auth && auth.error) return auth.error;

  const userId = auth.user!.id;

  try {
    // 2. Parse the multipart form data
    const formData = await request.formData();
    
    // Extract the video file and trade data
    const videoFile = formData.get('video') as File;
    const tradeData = formData.get('tradeData') as string;
    
    if (!videoFile) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }
    
    if (!tradeData) {
      return NextResponse.json({ error: 'No trade data provided' }, { status: 400 });
    }

    // 3. Validate file type
    if (!ALLOWED_VIDEO_TYPES.includes(videoFile.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${videoFile.type}. Allowed: ${ALLOWED_VIDEO_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // 4. Validate file size
    if (videoFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }
    
    // 5. Parse and validate trade data
    let trade;
    try {
      trade = JSON.parse(tradeData);
    } catch {
      return NextResponse.json({ error: 'Invalid trade data JSON' }, { status: 400 });
    }

    // Ensure the trade belongs to the authenticated user
    trade.user_id = userId;
    
    // 6. Upload to Supabase Storage using the service role client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const timestamp = Date.now();
    const fileName = `${userId}/trade-video-${timestamp}-${videoFile.name}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('trade-videos')
      .upload(fileName, videoFile, {
        contentType: videoFile.type,
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload video' }, { status: 500 });
    }
    
    // Get the public URL for the uploaded video
    const { data: urlData } = supabase.storage
      .from('trade-videos')
      .getPublicUrl(fileName);
    
    const videoUrl = urlData.publicUrl;
    
    // Add the video URL to the trade data
    const tradeWithVideo = {
      ...trade,
      video_url: videoUrl
    };
    
    // 7. Save the trade to the database
    const { data: tradeResult, error: tradeError } = await supabase
      .from('trades')
      .insert([tradeWithVideo])
      .select()
      .single();
    
    if (tradeError) {
      console.error('Database error:', tradeError);
      return NextResponse.json({ error: 'Failed to save trade' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      trade: tradeResult,
      videoUrl: videoUrl 
    });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
