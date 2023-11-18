import { hydrate, prerender as ssr } from "preact-iso";
import App from "./components/app";


hydrate(<App />);

export async function prerender(data: object) {
  return await ssr(<App {...data} />);
}
