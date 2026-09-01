# Vox

Vox is the Tauri, React, and TypeScript interface for the Ethos runtime. It is
currently a test harness for exercising the complete Vox HTTP API.

## Run it

```sh
npm install
npm run dev
```

Enter any reachable Ethos HTTP(S) endpoint in the connection form. Vox remembers
the endpoint, but keeps the bearer token only in memory.

For browser access, Ethos must allow the Vox origin. A remotely accessible Ethos
instance also requires a bearer token:

```yaml
gateway:
  host: 0.0.0.0
  port: 8000
  bearer_token: choose-a-secret
  cors_origins:
    - http://localhost:1420
```

Use the exact origin serving Vox. Packaged Tauri builds may use
`tauri://localhost` or `http://tauri.localhost`, depending on the platform.

Run the desktop app with `npm run tauri dev`.
