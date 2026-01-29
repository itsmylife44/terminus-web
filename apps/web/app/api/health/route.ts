export async function GET() {
  return Response.json({
    status: 'ok',
    timestamp: Date.now(),
    version: process.env.npm_package_version || 'unknown',
  });
}
