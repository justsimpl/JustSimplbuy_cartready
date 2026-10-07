import { Container, getRandom } from "@cloudflare/containers";
import { env } from "cloudflare:workers";

const INSTANCE_COUNT = 3;

export class Backend extends Container {
  defaultPort = 8080;
  sleepAfter = "2h";
  envVars = {
    MONGO_URL: env.MONGO_URL,
    DB_NAME: env.DB_NAME,
    JWT_SECRET: env.JWT_SECRET,
    ENV: env.ENV ?? "production",
    CORS_ORIGINS: env.CORS_ORIGINS ?? "https://instabooks.digital,https://www.instabooks.digital",
    REDIS_URL: env.REDIS_URL ?? "",
    STRIPE_API_KEY: env.STRIPE_API_KEY ?? "",
    SHOPIFY_STORE_DOMAIN: env.SHOPIFY_STORE_DOMAIN ?? "",
    SHOPIFY_CLIENT_ID: env.SHOPIFY_CLIENT_ID ?? "",
    SHOPIFY_CLIENT_SECRET: env.SHOPIFY_CLIENT_SECRET ?? "",
    SHOPIFY_ADMIN_ACCESS_TOKEN: env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? "",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api")) {
      const container = await getRandom(env.BACKEND, INSTANCE_COUNT);
      return container.fetch(request);
    }

    return env.ASSETS.fetch(request);
  },
};

export interface Env {
  ASSETS: Fetcher;
  BACKEND: DurableObjectNamespace<Backend>;
}
