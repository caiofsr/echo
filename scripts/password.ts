import { isAPIError } from "better-auth/api";
import { closeDatabase } from "../src/db";
import { auth } from "../src/lib/auth";
import { setPassword } from "../src/server/password";

async function readPassword() {
  const stdin = process.stdin;
  if (!stdin.isTTY || !stdin.setRawMode) {
    // Keep stdin support for scripts and pipes; never pass the password as an argument.
    return (await Bun.stdin.text()).replace(/\r?\n$/, "");
  }

  process.stderr.write("Insira a nova senha e pressione Enter: ");
  stdin.setRawMode(true);
  stdin.resume();

  try {
    return await new Promise<string>((resolve, reject) => {
      let password = "";
      const cleanup = () => {
        stdin.off("data", onData);
        stdin.off("error", onError);
        stdin.setRawMode(false);
        stdin.pause();
        process.stderr.write("\n");
      };
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const onData = (chunk: Buffer) => {
        for (const character of chunk.toString("utf8")) {
          if (character === "\u0003") {
            cleanup();
            reject(new Error("Operação cancelada."));
            return;
          }
          if (character === "\r" || character === "\n") {
            cleanup();
            resolve(password);
            return;
          }
          if (character === "\u007f" || character === "\b") {
            password = Array.from(password).slice(0, -1).join("");
          } else {
            password += character;
          }
        }
      };
      stdin.on("data", onData);
      stdin.once("error", onError);
    });
  } catch (error) {
    if (stdin.isRaw) stdin.setRawMode(false);
    throw error;
  }
}

const password = await readPassword();
try {
  await setPassword(auth, password);
  console.log("Senha definida. Todas as sessões anteriores foram encerradas.");
} catch (error) {
  const code = isAPIError(error) ? error.body?.code : undefined;
  console.error(
    code === "PASSWORD_TOO_SHORT"
      ? "A senha deve ter pelo menos 15 caracteres."
      : code === "PASSWORD_TOO_LONG"
        ? "A senha deve ter no máximo 1024 caracteres."
        : error instanceof Error
          ? error.message
          : "Não foi possível definir a senha.",
  );
  process.exitCode = 1;
} finally {
  closeDatabase();
}
