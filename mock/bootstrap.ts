import { defineFakeRoute } from "vite-plugin-fake-server/client";

type BootstrapStatusResponse = {
  bootstrapEnabled: boolean;
  adminExists: boolean;
  needsBootstrap: boolean;
};

type BootstrapInitBody = {
  token?: string | null;
  username: string;
  email?: string | null;
  password: string;
};

type BootstrapInitResponse = {
  id: string;
  username: string;
  email: string;
  role: "admin";
  mustChangePassword: boolean;
};

const bootstrapEnabled = true;
let adminExists = false;

export default defineFakeRoute([
  {
    url: "/system/bootstrap/status",
    method: "post",
    response: (): BootstrapStatusResponse => {
      return {
        bootstrapEnabled,
        adminExists,
        needsBootstrap: bootstrapEnabled && !adminExists
      };
    }
  },
  {
    url: "/system/bootstrap/init",
    method: "post",
    response: ({ body }): BootstrapInitResponse => {
      if (!bootstrapEnabled) {
        throw new Error("Bootstrap disabled");
      }

      if (adminExists) {
        throw new Error("Already initialized");
      }

      const payload = body as Partial<BootstrapInitBody>;
      const username = String(payload?.username || "").trim();
      const password = String(payload?.password || "");

      if (!username) throw new Error("username is required");
      if (password.length < 8) throw new Error("password too short");

      adminExists = true;

      const email =
        typeof payload.email === "string" && payload.email.trim()
          ? payload.email.trim()
          : `${username}@local.invalid`;

      return {
        id: "550e8400-e29b-41d4-a716-446655440000",
        username,
        email,
        role: "admin",
        mustChangePassword: true
      };
    }
  }
]);
