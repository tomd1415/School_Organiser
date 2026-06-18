# Deployment scripts

The full, step-by-step deployment guide is **[../DEPLOYMENT.md](../DEPLOYMENT.md)** — start there.

This folder holds the two scripts it uses.

**`proxmox-lxc.sh`** — run on the **Proxmox host** to create a Debian 12 LXC and install everything
inside it in one command:

```bash
sudo REPO_URL=<git-url> SITE_ADDRESS=192.168.1.50 bash deploy/proxmox-lxc.sh
```

**`install.sh`** — run **inside** a Debian 12 container or VM (idempotent; re-run to upgrade):

```bash
sudo bash deploy/install.sh <SITE_ADDRESS>
```

Both bring up **db + app + Caddy (HTTPS)** under Docker Compose, generate `app/.env` with random
secrets, run migrations on first boot, and schedule nightly **encrypted** backups. See
[../DEPLOYMENT.md](../DEPLOYMENT.md) for every step, the VM-vs-LXC trade-off, TLS, backups/restore,
upgrades and troubleshooting.
