import { useRouter } from "../src/router";

const FourOhFour = () => {
  const router = useRouter();
  return (
    <>
      <p>404 page</p>
      <button onClick={() => router.push("/")}>Go home</button>
    </>
  );
};

export default FourOhFour;
