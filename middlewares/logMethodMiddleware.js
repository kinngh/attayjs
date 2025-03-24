/**
 * Example middleware that logs the request method.
 * @param {Request} request
 * @returns {Promise<Request|Response>}
 */
async function logMethodMiddleware(request) {
  console.log("Middleware: request method is", request.method);
  request.newThing = "new thing";
  // return new Response(JSON.stringify({ message: "short circuit" }), {
  //   status: 418,
  // });
}

export default logMethodMiddleware;
