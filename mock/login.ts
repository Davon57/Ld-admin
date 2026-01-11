// 根据角色动态生成路由
import { defineFakeRoute } from "vite-plugin-fake-server/client";

export default defineFakeRoute([
  {
    url: "/auth/login",
    method: "post",
    response: ({ body }) => {
      const account =
        typeof body.account === "string"
          ? body.account
          : typeof body.username === "string"
            ? body.username
            : typeof body.identifier === "string"
              ? body.identifier
              : "";

      const password = typeof body.password === "string" ? body.password : "";
      if (!account || !password) {
        return { error: "ValidationError" };
      }

      const isAdmin = account === "admin";
      return {
        token: isAdmin
          ? "eyJhbGciOiJIUzUxMiJ9.admin"
          : "eyJhbGciOiJIUzUxMiJ9.user",
        user: {
          id: isAdmin
            ? "550e8400-e29b-41d4-a716-446655440000"
            : "550e8400-e29b-41d4-a716-446655440111",
          username: isAdmin ? "admin" : account,
          nickname: isAdmin ? "" : "",
          avatar: isAdmin
            ? "https://avatars.githubusercontent.com/u/44761321"
            : "https://avatars.githubusercontent.com/u/52823142",
          carModel: "",
          city: "",
          email: isAdmin ? "admin@example.com" : "user@example.com",
          phone: null,
          role: isAdmin ? "admin" : "user",
          mustChangePassword: isAdmin
        }
      };
    }
  }
]);
