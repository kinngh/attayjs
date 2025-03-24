import { withMiddleware } from "../../../index";
import logMethodMiddleware from "../../../middlewares/logMethodMiddleware";

/**
 * @param {Request} request
 */
async function handleGet(request) {
  console.log(request.newThing);
  return new Response(
    JSON.stringify({ message: "Hello from GET /api/example" }),
    { headers: { "Content-Type": "application/json" } }
  );
}

export default withMiddleware(logMethodMiddleware, handleGet);
