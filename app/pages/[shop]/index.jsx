import { useRouter } from "../../src/router";

const DynamicRoute = () => {
  const router = useRouter();
  return (
    <>
      <p>You're currently in {router?.params?.shop}</p>
      <button
        onClick={() => {
          router.push("/");
        }}
      >
        Go home
      </button>
    </>
  );
};

export default DynamicRoute;
