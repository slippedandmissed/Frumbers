import type { Prettify } from "./prettify";

type Var = string | { anyOf: Var[][] };
type WithVar<V extends Var> = V extends string
  ? { [K in V]: string }
  : V extends { anyOf: infer Arr }
    ? Arr extends Var[][]
      ? Arr extends [infer First, ...infer Rest]
        ? First extends Var[]
          ? Rest extends Var[][]
            ? WithVars<First> | WithVar<{ anyOf: Rest }>
            : WithVars<First>
          : never
        : never
      : never
    : never;

type WithVars<Vars extends Var[]> = Vars extends [infer First, ...infer Rest]
  ? First extends Var
    ? Rest extends Var[]
      ? WithVar<First> & WithVars<Rest>
      : WithVar<First>
    : object
  : object;

const REQUIRED_VARS = [
  "PORT",

  "POSTGRES_HOST",
  "POSTGRES_PORT",
  "POSTGRES_DB_NAME",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "POSTGRES_SSL",

  "PUSHER_APP_ID",
  "PUSHER_KEY",
  "PUSHER_SECRET",

  "ALLOWED_CORS_ORIGINS",
  {
    anyOf: [
      ["PUSHER_HOST", "PUSHER_PORT"] as const,
      ["PUSHER_CLUSTER"] as const,
    ] as const,
  },
] as const satisfies Var[];

type EnvWithRequiredVars = Prettify<WithVars<typeof REQUIRED_VARS>>;

function parseEnvironment(): EnvWithRequiredVars {
  for (const varName of REQUIRED_VARS) {
    if (typeof varName === "string") {
      if (!process.env[varName]) {
        throw new Error(`Missing required environment variable: ${varName}`);
      }
    } else {
      const options = varName.anyOf;
      const isAnyOptionSatisfied = options.some((option) =>
        option.every((name) => !!process.env[name]),
      );

      if (!isAnyOptionSatisfied) {
        const optionStrings = options
          .map((option) => option.join(" and "))
          .join(" or ");
        throw new Error(
          `Missing required environment variables. Please provide either: ${optionStrings}`,
        );
      }
    }
  }

  return process.env as EnvWithRequiredVars;
}

function parsePusherConfig({ env }: { env: EnvWithRequiredVars }): {
  appId: string;
  key: string;
  secret: string;
} & (
  | { type: "cluster"; cluster: string }
  | { type: "host"; host: string; port: number }
) {
  const common = {
    appId: env.PUSHER_APP_ID,
    key: env.PUSHER_KEY,
    secret: env.PUSHER_SECRET,
  };
  if ("PUSHER_CLUSTER" in env) {
    return {
      type: "cluster",
      cluster: env.PUSHER_CLUSTER,
      ...common,
    };
  } else {
    return {
      type: "host",
      host: env.PUSHER_HOST,
      port: +env.PUSHER_PORT,
      ...common,
    };
  }
}

function parseConfig({ env }: { env: EnvWithRequiredVars }) {
  return {
    server: {
      port: +env.PORT,
      allowedCorsOrigins: env.ALLOWED_CORS_ORIGINS.split(";"),
    },
    db: {
      host: env.POSTGRES_HOST,
      port: +env.POSTGRES_PORT,
      database: env.POSTGRES_DB_NAME,
      username: env.POSTGRES_USER,
      password: env.POSTGRES_PASSWORD,
      ssl: env.POSTGRES_SSL === "true",
    },
    pusher: parsePusherConfig({ env }),
  };
}

export const config = parseConfig({ env: parseEnvironment() });
