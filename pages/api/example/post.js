/**
 * @param {Request} request
 */
export default async function handlePOST(request) {
  console.log("Hit POST");

  // Fetch API: read and parse JSON like this
  const parsed = await request.json();
  console.log(parsed);

  return new Response(JSON.stringify(parsed), {
    headers: { "Content-Type": "application/json" },
  });
}
