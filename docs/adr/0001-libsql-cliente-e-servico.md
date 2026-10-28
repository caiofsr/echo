# libSQL como cliente e serviço de banco

A conexão do Echo usa o cliente libSQL (`@libsql/client`) com o adaptador `drizzle-orm/libsql` em todos os ambientes, no lugar do driver nativo `bun:sqlite`. Em desenvolvimento e nos comandos locais o banco continua sendo um arquivo (`file:`) ou `:memory:` nos testes; em produção no Dokploy, o banco é o serviço libSQL da plataforma, acessado por URL (`http://usuario:senha@servico:8080` interno ou `libsql://` externo com `DATABASE_AUTH_TOKEN`). Alternativas consideradas: manter `bun:sqlite` (não fala com um servidor libSQL nem cabe num único adaptador) e o Turso Cloud (descartado em favor do serviço auto-hospedado no servidor do usuário). A decisão valeu também pelo custo da eventual reversão: o formato de `DATABASE_URL` em produção e a infraestrutura do Dokploy dependem dela.

## Considered options

- `bun:sqlite` nativo: rejeitado por não conectar a um servidor libSQL.
- Turso Cloud: rejeitado por exigir um serviço externo adicional.
- Serviço libSQL do Dokploy: escolhido, pois o deploy é gerenciado no mesmo servidor com credenciais internas e sem dependência de nuvem externa.

## Consequences

- `PRAGMA journal_mode = WAL` é aplicado apenas em conexões locais (`file:`/`:memory:`); o servidor libSQL rejeita esse pragma sobre HTTP e já roda em WAL. `PRAGMA foreign_keys = ON` é aplicado em todas as conexões, inclusive remotas.
- `openDatabase` é assíncrona e as migrações são aplicadas na inicialização do servidor (`src/db/index.ts`), de forma idempotente.
