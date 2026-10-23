import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";

const image = process.argv[2] ?? "echo-issue-8";
const dir = await mkdtemp(join(tmpdir(), "echo-image-"));
const name = `echo-smoke-${crypto.randomUUID().slice(0, 8)}`;
const origin = "https://echo.test";
const password = "senha temporaria do teste de imagem";
const envPath = join(dir, "runtime.env");
await writeFile(
  envPath,
  `NODE_ENV=production\nBETTER_AUTH_URL=${origin}\nBETTER_AUTH_SECRET=${crypto.randomUUID()}${crypto.randomUUID()}\nDATABASE_URL=file:/data/echo.db\n`,
  { mode: 0o600 },
);
async function docker(args: string[], input?: string) {
  const child = Bun.spawn(["docker", ...args], {
    stdin: input === undefined ? "ignore" : new Blob([input]),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code !== 0) throw new Error(`Docker falhou: ${stderr}`);
  return (stdout + (args[0] === "logs" ? stderr : "")).trim();
}
const options = ["--env-file", envPath, "-v", `${dir}:/data`];
let baseURL = "";
async function ready() {
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(`${baseURL}/api/auth/get-session`)).status === 200)
        return;
    } catch {}
    await Bun.sleep(250);
  }
  throw new Error("A imagem não iniciou a aplicação.");
}
try {
  await docker([
    "run",
    "--rm",
    "--entrypoint",
    "bun",
    ...options,
    image,
    "scripts/migrate.ts",
  ]);
  await docker(
    [
      "run",
      "--rm",
      "--entrypoint",
      "bun",
      "-i",
      ...options,
      image,
      "scripts/password.ts",
    ],
    `${password}\n`,
  );
  await docker([
    "run",
    "-d",
    "--name",
    name,
    ...options,
    "-p",
    "127.0.0.1::3000",
    image,
  ]);
  const port = (await docker(["port", name, "3000/tcp"])).split(":").at(-1);
  baseURL = `http://127.0.0.1:${port}`;
  await ready();
  assert.equal(
    (await fetch(`${baseURL}/horas`, { redirect: "manual" })).status,
    307,
  );
  const login = await fetch(`${baseURL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "owner@echo.invalid", password }),
  });
  assert.equal(login.status, 200);
  assert.match(login.headers.get("set-cookie") ?? "", /Secure/);
  const cookie = login.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  const page = await fetch(`${baseURL}/horas`, { headers: { cookie } });
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, />Horas</);
  const asset = html.match(/href="(\/assets\/[^ ]+\.css)"/)?.[1];
  assert.ok(asset);
  assert.equal((await fetch(`${baseURL}${asset}`)).status, 200);
  await docker(["restart", name]);
  const restartedPort = (await docker(["port", name, "3000/tcp"]))
    .split(":")
    .at(-1);
  baseURL = `http://127.0.0.1:${restartedPort}`;
  await ready();
  assert.equal(
    (await fetch(`${baseURL}/api/auth/get-session`, { headers: { cookie } }))
      .status,
    200,
  );
  assert.equal(
    (
      await fetch(`${baseURL}/api/auth/sign-out`, {
        method: "POST",
        headers: { cookie, Origin: origin },
      })
    ).status,
    200,
  );
  const expired = await fetch(`${baseURL}/api/auth/get-session`, {
    headers: { cookie },
  });
  assert.equal(expired.status, 200);
  assert.equal(await expired.json(), null);
  console.log(
    "Imagem validada: migrações, Bun, entrada, cookie seguro, SSR protegido, assets, sessão após reinício e saída.",
  );
} catch (error) {
  console.error(await docker(["logs", name]).catch(() => ""));
  throw error;
} finally {
  await docker(["rm", "-f", name]).catch(() => {});
  await rm(dir, { recursive: true, force: true });
}
