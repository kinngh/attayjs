/**
 * @param {Request} request
 */
async function handler(request) {
  console.log(request);
  return new Response(
    JSON.stringify({ message: "Hello from GET /api/example" }),
    { headers: { "Content-Type": "application/json" } }
  );
}

export default handler;
