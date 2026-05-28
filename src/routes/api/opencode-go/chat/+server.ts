import type { RequestHandler } from "./$types";

const OPENCODE_GO_CHAT_ENDPOINT =
  "https://opencode.ai/zen/go/v1/chat/completions";

export const POST: RequestHandler = async ({ request }) => {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return new Response(
      JSON.stringify({ error: { message: "Missing Authorization header" } }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const bodyText = await request.text();
  let isStream = false;
  try {
    isStream = JSON.parse(bodyText).stream === true;
  } catch {
    // ignore parse errors, treat as non-streaming
  }

  const upstream = await fetch(OPENCODE_GO_CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: bodyText,
  });

  if (isStream && upstream.body) {
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  return new Response(await upstream.text(), {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });
};
