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
        'Accept-Language': 'en-US,en;q=0.5',
      },
      next: { revalidate: 3600 } // Cache por 1 hora
    });

    if (!response.ok) {
      throw new Error(`Error del servidor original: ${response.status}`);
    }

    let body = await response.text();
    
    // Inyectamos una base URL para que los scripts y estilos relativos funcionen
    const origin = new URL(url).origin;
    if (!body.includes('<base')) {
      body = body.replace('<head>', `<head><base href="${origin}/">`);
    }

    // Retornamos el contenido con cabeceras que permiten el iframe
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'X-Frame-Options': 'ALLOWALL', // Forzamos permiso
        'Content-Security-Policy': "frame-ancestors *; upgrade-insecure-requests",
        'Cache-Control': 'public, max-age=3600'
      },
    });
  } catch (error: any) {
    console.error('Proxy Error:', error.message);
    return new NextResponse(`Error al procesar el proxy: ${error.message}`, { status: 500 });
  }
}
