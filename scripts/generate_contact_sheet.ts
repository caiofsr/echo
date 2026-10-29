import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const iconNames = [
  "board",
  "hours",
  "invoices",
  "directory",
  "settings",
  "logout",
  "timer",
  "show",
  "hide",
  "login",
  "loading",
];

const svgs: Record<string, string> = {};
for (const name of iconNames) {
  svgs[name] = readFileSync(join("public", "icons", `${name}.svg`), "utf-8");
}

const sizes = [17, 18, 19, 20, 21, 32, 64, 128];
const backgrounds = [
  { name: "app", color: "#f5f5f0", border: "#d6dcd3", label: "Aplicação Echo (#f5f5f0)" },
  { name: "white", color: "#ffffff", border: "#e2e8f0", label: "Fundo Branco (#ffffff)" },
  { name: "gray", color: "#becbdd", border: "#94a3b8", label: "Fundo Cinza Neutro (#becbdd)" },
];

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Echo — Folha de Contato e Validação da Família de Ícones</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      padding: 40px;
    }
    .header {
      margin-bottom: 32px;
      border-bottom: 1px solid #334155;
      padding-bottom: 24px;
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .badge {
      font-size: 13px;
      font-weight: 600;
      background: #065f46;
      color: #6ee7b7;
      padding: 4px 10px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    p.desc {
      font-size: 15px;
      color: #94a3b8;
      max-width: 900px;
      line-height: 1.5;
    }
    .section-title {
      font-size: 20px;
      font-weight: 600;
      color: #a7f3d0;
      margin: 36px 0 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card-panel {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 32px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    }
    .family-grid {
      display: grid;
      grid-template-columns: repeat(11, 1fr);
      gap: 14px;
    }
    .icon-tile {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 8px 12px;
      border-radius: 12px;
      transition: transform 0.2s;
    }
    .icon-preview-wrap {
      width: 76px;
      height: 76px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon-tile-name {
      margin-top: 10px;
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
      letter-spacing: -0.01em;
    }

    /* Size Matrix */
    table.matrix {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #334155;
    }
    table.matrix th, table.matrix td {
      padding: 12px 14px;
      text-align: center;
      border-bottom: 1px solid #334155;
      border-right: 1px solid #334155;
      vertical-align: middle;
    }
    table.matrix th:last-child, table.matrix td:last-child {
      border-right: none;
    }
    table.matrix tr:last-child td {
      border-bottom: none;
    }
    table.matrix th {
      background: #0f172a;
      color: #94a3b8;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .icon-name-col {
      font-weight: 700;
      color: #6ee7b7;
      text-align: left !important;
      font-size: 14px;
      background: #1e293b;
    }
    .cell-box {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 6px;
      border-radius: 6px;
      background: #f5f5f0;
      box-shadow: inset 0 0 0 1px rgba(0,0,0,0.06);
    }

    /* Real Context Preview Panel */
    .context-row {
      display: flex;
      gap: 24px;
      margin-top: 16px;
    }
    .context-card {
      flex: 1;
      background: #f5f5f0;
      border-radius: 12px;
      padding: 20px;
      color: #252c29;
      border: 1px solid #d6dcd3;
    }
    .context-label {
      font-size: 12px;
      font-weight: 700;
      color: #59665b;
      margin-bottom: 14px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .navbar-demo {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid #d6dcd3;
    }
    .nav-item {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      color: #59665b;
    }
    .nav-item.active {
      background: #e6eddf;
      color: #284b30;
      font-weight: 600;
    }
    .nav-item svg {
      transform: scale(1.35);
      transform-origin: center;
    }
    .timer-demo {
      display: flex;
      align-items: center;
      gap: 16px;
      background: #fdfdf8;
      border: 1px solid #d6dcd3;
      padding: 16px;
      border-radius: 8px;
    }
    .timer-info strong { display: block; font-size: 14px; color: #252c29; }
    .timer-info p { font-size: 12px; color: #59665b; }
    .timer-digits { margin-left: auto; font-family: monospace; font-size: 18px; font-weight: 700; color: #365b3e; }

    .login-btn-demo {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #365b3e;
      color: #ffffff;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Echo — Nova Família Autoral de Ícones Soft 3D Isometric <span class="badge">11 Ícones Aprovados</span></h1>
    <p class="desc">
      Diretrizes: SKILL.md (soft-icons) &bull; Paleta verde suave aprovada (#365b3e, #7aa37d, #bad8bc, #eef6ec) &bull; Material matte &bull; Luz superior-esquerda &bull; Construção volumétrica própria de cada objeto sem repetição de discos de relógio ou extrusões planas.
    </p>
  </div>

  ${backgrounds.map(bg => `
    <div class="section-title">Família Completa em ${bg.label} (Visualização a 76px / Master 128px)</div>
    <div class="card-panel">
      <div class="family-grid">
        ${iconNames.map(name => `
          <div class="icon-tile" style="background: ${bg.color}; border: 1px solid ${bg.border};">
            <div class="icon-preview-wrap">
              ${svgs[name].replace('<svg ', '<svg width="76" height="76" ')}
            </div>
            <span class="icon-tile-name">${name}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `).join("")}

  <div class="section-title">Validação Estrutural e de Escala Óptica (17px, 18px, 19px, 20px, 21px, 32px, 64px, 128px)</div>
  <div class="card-panel">
    <table class="matrix">
      <thead>
        <tr>
          <th style="text-align: left; width: 140px;">Ícone</th>
          <th>17px (Navbar)</th>
          <th>18px (Form/Auth)</th>
          <th>19px (Settings)</th>
          <th>20px (Default)</th>
          <th>21px</th>
          <th>32px (Timer/Modal)</th>
          <th>64px</th>
          <th>128px (Canvas)</th>
        </tr>
      </thead>
      <tbody>
        ${iconNames.map(name => `
          <tr>
            <td class="icon-name-col">${name}</td>
            ${sizes.map(sz => `
              <td>
                <div class="cell-box">
                  ${svgs[name].replace('<svg ', `<svg width="${sz}" height="${sz}" `)}
                </div>
              </td>
            `).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>

  <div class="section-title">Validação em Contexto Real da Aplicação Echo</div>
  <div class="card-panel">
    <div class="context-row">
      <!-- Navbar Context -->
      <div class="context-card">
        <div class="context-label">1. Barra de Navegação (Navbar scale(1.35) a 17px e 19px)</div>
        <div class="navbar-demo">
          <span style="font-weight: 700; font-size: 16px; margin-right: 12px; color: #252c29;">echo<span style="color:#365b3e">.</span></span>
          <div class="nav-item active">
            ${svgs["board"].replace('<svg ', '<svg width="17" height="17" ')}
            Quadro
          </div>
          <div class="nav-item">
            ${svgs["hours"].replace('<svg ', '<svg width="17" height="17" ')}
            Horas
          </div>
          <div class="nav-item">
            ${svgs["invoices"].replace('<svg ', '<svg width="17" height="17" ')}
            Faturas
          </div>
          <div class="nav-item">
            ${svgs["directory"].replace('<svg ', '<svg width="17" height="17" ')}
            Cadastros
          </div>
          <div class="nav-item" style="margin-left: auto;">
            ${svgs["settings"].replace('<svg ', '<svg width="19" height="19" ')}
          </div>
          <div class="nav-item">
            ${svgs["logout"].replace('<svg ', '<svg width="17" height="17" ')}
            Sair
          </div>
        </div>
      </div>

      <!-- Timer Context -->
      <div class="context-card">
        <div class="context-label">2. Cronômetro Global do App (size={32})</div>
        <div class="timer-demo">
          ${svgs["timer"].replace('<svg ', '<svg width="32" height="32" ')}
          <div class="timer-info">
            <strong>Cronômetro global</strong>
            <p>Registro de horas ativo no Echo.</p>
          </div>
          <span class="timer-digits">01:42:18</span>
        </div>
      </div>

      <!-- Login Context -->
      <div class="context-card">
        <div class="context-label">3. Autenticação (Tamanhos 18px)</div>
        <div style="display: flex; gap: 12px; align-items: center; background: white; padding: 12px; border-radius: 8px; border: 1px solid #d6dcd3;">
          <div style="display: flex; align-items: center; gap: 6px; border: 1px solid #d6dcd3; padding: 6px 10px; border-radius: 6px;">
            <span style="font-size: 13px; color: #59665b;">••••••••</span>
            ${svgs["show"].replace('<svg ', '<svg width="18" height="18" ')}
            ${svgs["hide"].replace('<svg ', '<svg width="18" height="18" ')}
          </div>
          <div class="login-btn-demo">
            Entrar ${svgs["login"].replace('<svg ', '<svg width="18" height="18" ')}
          </div>
          <div style="display: inline-flex; align-items: center; justify-content: center; padding: 8px;">
            ${svgs["loading"].replace('<svg ', '<svg width="22" height="22" ')}
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

mkdirSync("scripts", { recursive: true });
const inspectionHtmlPath = join(process.cwd(), "public", "previews", "inspection.html");
writeFileSync(inspectionHtmlPath, html, "utf-8");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 2600 } });
await page.goto(`file://${inspectionHtmlPath}`);
await page.waitForLoadState("networkidle");

const artifactDir = "/Users/caio/.t3/userdata/providers/antigravity/ac0a3dfd6dddb20962cecff6ee5fe65e19d3923be20e52c5ab52ff877f7e4c32/antigravity-acp/brain/3c84e646-24b9-4c68-9b23-0accb010cdd5";
mkdirSync(artifactDir, { recursive: true });
const sheetPath = join(artifactDir, "echo_soft_icons_contact_sheet.png");
await page.screenshot({ path: sheetPath, fullPage: true });

const projectSheetPath = join(process.cwd(), "public", "previews", "echo_soft_icons_contact_sheet.png");
await page.screenshot({ path: projectSheetPath, fullPage: true });

console.log("Contact sheet PNG successfully generated at:");
console.log("1. Artifact path:", sheetPath);
console.log("2. Project path:", projectSheetPath);

await browser.close();
