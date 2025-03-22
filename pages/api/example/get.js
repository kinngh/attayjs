/**
 * @param {Request} request
 */
export default async function handleGet(request) {
  console.log(request);
  return new Response(
    JSON.stringify({ message: "Hello from GET /api/example" }),
    { headers: { "Content-Type": "application/json" } }
  );
}
