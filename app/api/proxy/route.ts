import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  
  if (!url) {
    return new NextResponse('URL faltante', { status: 400 });
  }

  try {
    // Intentamos obtener el contenido del embed
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Referer': new URL(url).origin,
      },
      next: { revalidate: 3600 } 
    });

    if (!response.ok) {
      return new NextResponse(`Error del servidor remoto: ${response.status}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'text/html';
    
    // Si no es HTML, lo servimos tal cual
    if (!contentType.includes('text/html')) {
        const blob = await response.blob();
        return new NextResponse(blob, {
            headers: {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'X-Frame-Options': 'ALLOWALL',
                'Content-Security-Policy': "frame-ancestors *",
            }
        });
    }

    let body = await response.text();

    // Intentamos inyectar un <base> tag para resolver paths relativos
    const urlObj = new URL(url);
    const origin = urlObj.origin;
    
    if (!body.includes('<base')) {
      if (body.includes('<head>')) {
        body = body.replace('<head>', `<head><base href="${origin}/">`);
      } else if (body.includes('<html>')) {
        body = body.replace('<html>', `<html><head><base href="${origin}/"></head>`);
      }
    }

    // Retornamos el contenido con cabeceras que permiten el iframe
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'X-Frame-Options': 'ALLOWALL', 
        'Content-Security-Policy': "frame-ancestors *; upgrade-insecure-requests",
        'Cache-Control': 'public, max-age=3600'
      },
    });
  } catch (error: any) {
    console.error('Proxy Error:', error.message);
    return new NextResponse(`Error al procesar el proxy: ${error.message}`, { status: 500 });
  }
}
