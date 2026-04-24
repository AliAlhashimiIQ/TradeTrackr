import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    // Parse the multipart form data
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
    
    // Parse the trade data
    const trade = JSON.parse(tradeData);
    
    // Generate a unique filename for the video
    const timestamp = Date.now();
    const fileName = `trade-video-${timestamp}-${videoFile.name}`;
    
    // Upload the video to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('trade-videos') // Make sure this bucket exists in your Supabase
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
    
    // Save the trade to the database
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
