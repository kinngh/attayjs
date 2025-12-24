import { useLocation, useRoute } from "preact-iso";

export interface RouterLike {
  push: (url: string, replace?: boolean) => void;
  query: Record<string, string>;
  params: Record<string, string>;
  currentPath: string;
  url: string;
}

export function useRouter(): RouterLike {
  const location = useLocation();
  const route = useRoute();

  return {
    push: (url, replace) => location.route(url, replace),
    query: route.query,
    params: route.params,
    currentPath: route.path,
    url: location.url,
  };
}

export default useRouter;
