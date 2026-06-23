# 6502 Playground Deployment

This app deploys as a standalone Blazor WebAssembly static site.

The default production shape is:

- public path: `/6502/`
- remote web root: `/var/www/ben-rush.net/6502/`
- nginx: static `alias` with SPA fallback to `/6502/index.html`
- no systemd service
- no Kestrel process

## One-Command Deploy

From `C:\repos\6502Playground\Playground`:

```powershell
.\tools\deploy-6502-playground.ps1 -RemoteTarget user@www.ben-rush.net
```

The script:

1. publishes `Playground.Client/Playground.Client.csproj`
2. stages the published `wwwroot` assets under `artifacts/deploy/stage/site`
3. rewrites `<base href="/">` to `<base href="/6502/">` in the staged `index.html`
4. uploads the stage with `rsync` through WSL
5. syncs the staged site to `/var/www/ben-rush.net/6502/`
6. reloads nginx when available

Useful options:

```powershell
.\tools\deploy-6502-playground.ps1 -RemoteTarget user@www.ben-rush.net -PublicPath /6502/ -RemoteWebRoot /var/www/ben-rush.net/6502
.\tools\deploy-6502-playground.ps1 -RemoteTarget user@www.ben-rush.net -NoSudo
.\tools\deploy-6502-playground.ps1 -RemoteTarget user@www.ben-rush.net -SkipNginxReload
.\tools\deploy-6502-playground.ps1 -RemoteTarget user@www.ben-rush.net -WslDistro Ubuntu-24.04
```

Use `-NoSudo` only if the remote user can write directly to the target web root.

## Nginx

Add the locations from:

```text
deploy/nginx/6502playground.conf.example
```

to the `www.ben-rush.net` server block:

```nginx
location = /6502 {
    return 301 /6502/;
}

location /6502/ {
    alias /var/www/ben-rush.net/6502/;
    index index.html;
    try_files $uri $uri/ /6502/index.html;
}
```

Then test and reload nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Remote Requirements

- `nginx`
- `rsync`
- `sudo` for writing to `/var/www/ben-rush.net/6502/`, unless using `-NoSudo`

## Local Requirements

- .NET SDK
- WSL distro with `ssh` and `rsync`
