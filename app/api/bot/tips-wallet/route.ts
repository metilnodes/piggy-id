export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return new Response(
    JSON.stringify({ ok: true, msg: "POST tips-wallet reached" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

export async function GET() {
  return new Response(
    JSON.stringify({ ok: true, msg: "GET tips-wallet reached" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
