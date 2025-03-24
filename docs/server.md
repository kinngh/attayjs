# Server Side

## Creating API routes

- Create routes by putting them in `pages/api`. Each folder is a route that includes HTTP verbs `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS` as a filename to denote the method.

## Using Middlewares

- Middlewares are exported as part of your function using `withMiddleware()`

```js
export default withMiddleware(middleware1, middleware2, handler);
```

This runs functions in sequence as middleware.
