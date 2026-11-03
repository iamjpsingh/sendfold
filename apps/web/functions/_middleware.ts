interface Env {
  REDIRECT_HOST?: string;
  CANONICAL_ORIGIN?: string;
}
interface Context {
  request: Request;
  env: Env;
  next(): Promise<Response>;
}

// Only the configured legacy hostname redirects; previews and self-hosts pass through.
export function onRequest({ request, env, next }: Context) {
  const url = new URL(request.url);
  if (url.hostname !== env.REDIRECT_HOST || !env.CANONICAL_ORIGIN)
    return next();
  const destination = new URL(env.CANONICAL_ORIGIN);
  if (
    destination.protocol !== "https:" ||
    destination.username ||
    destination.password ||
    destination.hostname === url.hostname
  )
    return next();
  destination.pathname = url.pathname;
  destination.search = url.search;
  return Response.redirect(destination.href, 308);
}
