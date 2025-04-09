import React from "react";
import { useRouter } from "../src/router";

export default function Page2() {
  const router = useRouter();

  return (
    <div>
      <h1>Page 2</h1>
      <button onClick={() => router.push("/")}>Go Home</button>
    </div>
  );
}
