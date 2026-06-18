# Deployment scripts

The full, step-by-step deployment guide is **[../DEPLOYMENT.md](../DEPLOYMENT.md)** — start there.

This folder holds the two scripts it uses.

**`proxmox-lxc.sh`** — run on the **Proxmox host** to create a Debian 12 LXC and install everything
inside it in one command. The host usually has no checkout of this repo (or `git`), so fetch the one
script first — it clones the full repo into the container itself:

```bash
curl -fsSLO https://raw.githubusercontent.com/tomd1415/School_Organiser/main/deploy/proxmox-lxc.sh
REPO_URL=https://github.com/tomd1415/School_Organiser.git SITE_ADDRESS=192.168.1.50 bash proxmox-lxc.sh
```

**`install.sh`** — run **inside** a Debian 12 container or VM (idempotent; re-run to upgrade):

```bash
sudo bash deploy/install.sh <SITE_ADDRESS>
```

Both bring up **db + app + Caddy (HTTPS)** under Docker Compose, generate `app/.env` with random
secrets, run migrations on first boot, and schedule nightly **encrypted** backups. See
[../DEPLOYMENT.md](../DEPLOYMENT.md) for every step, the VM-vs-LXC trade-off, TLS, backups/restore,
upgrades and troubleshooting.
