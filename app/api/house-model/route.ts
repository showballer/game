const HOUSE_MODEL_URL =
  "https://mweb-showballer.oss-cn-shanghai.aliyuncs.com/%E6%96%87%E6%A1%A3/fangzi.glb"

type HeadersRecord = Record<string, string>

function createCorsHeaders(): HeadersRecord {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: createCorsHeaders(),
  })
}

export async function GET() {
  try {
    const upstreamResponse = await fetch(HOUSE_MODEL_URL, {
      // Always revalidate when requested from the client so updates propagate.
      cache: "no-store",
    })

    if (!upstreamResponse.ok) {
      return new Response("Failed to fetch model", {
        status: upstreamResponse.status,
        headers: createCorsHeaders(),
      })
    }

    const contentType =
      upstreamResponse.headers.get("content-type") ?? "model/gltf-binary"
    const body = await upstreamResponse.arrayBuffer()

    return new Response(body, {
      status: 200,
      headers: {
        ...createCorsHeaders(),
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    console.error("Failed to proxy house model", error)
    return new Response("Failed to fetch model", {
      status: 500,
      headers: createCorsHeaders(),
    })
  }
}
