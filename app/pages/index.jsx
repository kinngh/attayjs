import React from "react";
import { useRouter } from "../src/router";

export default function HomePage() {
  const router = useRouter();

  return (
    <div>
      <h1>Welcome to Home</h1>
      <button onClick={() => router.push("/page2")}>Go to Page 2</button>
      <button onClick={() => router.push("/heu")}>Go to Dynamic Route</button>
    </div>
  );
}
