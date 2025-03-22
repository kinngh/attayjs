const response = await (
  await fetch("localhost:3000/api/example", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: "Hello" }),
  })
).json();

console.log(response);
