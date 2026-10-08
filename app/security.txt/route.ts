export function GET(request: Request) {
  return Response.redirect(
    new URL("/.well-known/security.txt", request.url),
    308,
  );
}
