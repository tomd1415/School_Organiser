#!/usr/bin/env bash
# School Organiser — create a Debian 12 LXC on a Proxmox host and install everything inside it.
# Run this ON THE PROXMOX HOST (as root). It creates the container, enables the flags Docker needs,
# clones the repo, and runs deploy/install.sh inside — so the whole thing is one command on the host.
#
#   REPO_URL=https://github.com/tomd1415/School_Organiser.git SITE_ADDRESS=192.168.1.50 \
#        bash proxmox-lxc.sh
#   # or positionally:  bash proxmox-lxc.sh <REPO_URL> [SITE_ADDRESS]
#   # (you're root on the Proxmox host, so no sudo; from a full checkout use deploy/proxmox-lxc.sh)
#
# DOCKER-IN-LXC NOTE: this defaults to a PRIVILEGED container with nesting+keyctl, which is the
# reliable way to run Docker in an LXC (unprivileged Docker-in-LXC can break on recent kernels —
# runc's sysctl write + Docker's AppArmor probe). On a single-admin school host that's an acceptable
# trade-off, and the data is no more exposed than in a VM. Want the hardened path? Set UNPRIVILEGED=1
# (nesting+keyctl are still set) and, if Docker won't start, fall back to privileged or the VM
# installer (deploy/install.sh). The most isolated option remains a VM.
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "Run as root on the Proxmox host." >&2; exit 1; }
command -v pct >/dev/null || { echo "This must run on a Proxmox VE host (the 'pct' command is missing)." >&2; exit 1; }

# ── Config (override any via env) ───────────────────────────────────────────
REPO_URL="${REPO_URL:-${1:-}}"
SITE_ADDRESS="${SITE_ADDRESS:-${2:-}}"
[[ -n "$REPO_URL" ]] || { echo "REPO_URL is required (the git URL to clone). Usage: bash proxmox-lxc.sh <REPO_URL> [SITE_ADDRESS]" >&2; exit 1; }

CTID="${CTID:-$(pvesh get /cluster/nextid)}"
HOSTNAME="${HOSTNAME:-school-organiser}"
CORES="${CORES:-2}"
MEMORY="${MEMORY:-4096}"        # MB
DISK="${DISK:-20}"             # GB
STORAGE="${STORAGE:-local-lvm}"        # rootfs storage
TEMPLATE_STORAGE="${TEMPLATE_STORAGE:-local}"
BRIDGE="${BRIDGE:-vmbr0}"
IPCONF="${IPCONF:-dhcp}"        # or e.g. "192.168.1.50/24,gw=192.168.1.1"
UNPRIVILEGED="${UNPRIVILEGED:-0}"      # 0 = privileged (reliable Docker); 1 = unprivileged (hardened)
CT_PASSWORD="${CT_PASSWORD:-}"         # optional root password; otherwise use `pct enter $CTID` from the host

[[ -e "/etc/pve/lxc/$CTID.conf" ]] && { echo "CTID $CTID already exists. Set CTID=<free id>." >&2; exit 1; }

echo "→ Creating LXC $CTID ($HOSTNAME): ${CORES} cores / ${MEMORY}MB / ${DISK}GB on $STORAGE, net $BRIDGE ($IPCONF), $([[ $UNPRIVILEGED == 1 ]] && echo unprivileged || echo privileged)."

# ── 1. Ensure a Debian 12 template is available ─────────────────────────────
pveam update >/dev/null 2>&1 || true
TEMPLATE="$(pveam list "$TEMPLATE_STORAGE" 2>/dev/null | awk '/debian-12-standard/ {print $1}' | sort | tail -1)"
if [[ -z "$TEMPLATE" ]]; then
  AVAIL="$(pveam available --section system | awk '/debian-12-standard/ {print $2}' | sort | tail -1)"
  [[ -n "$AVAIL" ]] || { echo "No debian-12-standard template available via pveam." >&2; exit 1; }
  echo "→ downloading template $AVAIL …"
  pveam download "$TEMPLATE_STORAGE" "$AVAIL" >/dev/null
  TEMPLATE="$TEMPLATE_STORAGE:vztmpl/$AVAIL"
fi
echo "→ template: $TEMPLATE"

# ── 2. Create + start the container ─────────────────────────────────────────
CREATE=(pct create "$CTID" "$TEMPLATE"
  --hostname "$HOSTNAME" --cores "$CORES" --memory "$MEMORY" --swap "$MEMORY"
  --rootfs "$STORAGE:$DISK" --net0 "name=eth0,bridge=$BRIDGE,ip=$IPCONF"
  --features "nesting=1,keyctl=1" --unprivileged "$UNPRIVILEGED" --onboot 1 --ostype debian)
[[ -n "$CT_PASSWORD" ]] && CREATE+=(--password "$CT_PASSWORD")
"${CREATE[@]}"
pct start "$CTID"

# ── 3. Wait for networking ──────────────────────────────────────────────────
echo -n "→ waiting for the container's network "
for _ in $(seq 1 30); do
  if pct exec "$CTID" -- ip -4 addr show dev eth0 2>/dev/null | grep -q 'inet '; then break; fi
  echo -n "."; sleep 2
done
echo
if [[ -z "$SITE_ADDRESS" ]]; then
  SITE_ADDRESS="$(pct exec "$CTID" -- ip -4 -o addr show eth0 2>/dev/null | awk '{print $4}' | cut -d/ -f1 | head -1)"
  [[ -n "$SITE_ADDRESS" ]] || { echo "Could not detect the container IP — pass SITE_ADDRESS= explicitly." >&2; exit 1; }
  echo "→ no SITE_ADDRESS given; using the container's IP: $SITE_ADDRESS"
fi

# ── 4. Clone + run the in-VM installer inside the container ──────────────────
echo "→ installing inside the container (git clone + deploy/install.sh)…"
pct exec "$CTID" -- bash -lc "
  set -e
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq git ca-certificates curl >/dev/null
  if [ ! -d /opt/school-organiser/.git ]; then git clone --depth 1 '$REPO_URL' /opt/school-organiser; fi
  cd /opt/school-organiser
  bash deploy/install.sh '$SITE_ADDRESS'
"

# ── 5. Verify Docker actually came up (the LXC failure mode) ─────────────────
if pct exec "$CTID" -- docker info >/dev/null 2>&1; then
  DOCKER_OK="yes"
else
  DOCKER_OK="no"
fi

cat <<EOF

────────────────────────────────────────────────────────────────────────────
✅  LXC $CTID ($HOSTNAME) created and provisioned.
    Open:    https://$SITE_ADDRESS/        → onboarding wizard sets the password.
    Shell:   pct enter $CTID                (root shell from the Proxmox host)
    Manage:  pct enter $CTID; cd /opt/school-organiser/app; docker compose --profile proxy ps
EOF
if [[ "$DOCKER_OK" != "yes" ]]; then cat <<EOF

⚠  Docker did NOT start cleanly in this container — the known Docker-in-LXC issue. Either:
     • destroy it (pct stop $CTID; pct destroy $CTID) and re-run with the reliable default
       (privileged): leave UNPRIVILEGED unset / =0; or
     • use the VM installer instead (deploy/install.sh in a Debian VM) — the most robust option.
EOF
fi
echo "────────────────────────────────────────────────────────────────────────────"
