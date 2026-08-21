import { NextRequest, NextResponse } from "next/server";

/**
 * Catch-all for unmatched API routes.
 *
 * Without this, a request to an unknown /api path falls through to the app
 * router and returns the HTML 404 page, which breaks any client expecting JSON.
 * Real route files (e.g. /api/v1/jobs/refresh) are more specific than this
 * optional catch-all, so they still win the match.
 */

/** Keep the echoed path bounded so a long URL cannot bloat the response. */
const MAX_PATH_LENGTH = 200;

function notFound(request: NextRequest, method: string) {
  const path = request.nextUrl.pathname.slice(0, MAX_PATH_LENGTH);

  return NextResponse.json(
    {
      error: "Not Found",
      message: `No API route matches ${method} ${path}.`,
      status: 404,
    },
    {
      status: 404,
      headers: {
        // Nothing to cache, and never let a 404 be stored as a real response
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET(request: NextRequest) {
  return notFound(request, "GET");
}

export async function POST(request: NextRequest) {
  return notFound(request, "POST");
}

export async function PUT(request: NextRequest) {
  return notFound(request, "PUT");
}

export async function PATCH(request: NextRequest) {
  return notFound(request, "PATCH");
}

export async function DELETE(request: NextRequest) {
  return notFound(request, "DELETE");
}

export async function OPTIONS(request: NextRequest) {
  return notFound(request, "OPTIONS");
}

/** HEAD responses must not carry a body, so this one is status-only. */
export async function HEAD() {
  return new NextResponse(null, {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}
