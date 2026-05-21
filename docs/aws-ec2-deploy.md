# AWS EC2 Single-Instance Demo Deploy

This guide deploys the whole demo stack on one EC2 instance:

- Caddy reverse proxy with automatic HTTPS
- Node/Express API serving the built React app
- PostgreSQL
- MinIO for uploaded files and generated documents

This is suitable for demo/test. It is not a high-availability production architecture.

## Option A: AWS CLI Resource Provisioning

To create EC2, security group, SSH key pair, and Elastic IP from PowerShell, use:

[aws-cli-provision.md](aws-cli-provision.md)

This is recommended if you want to avoid clicking through the AWS Console.

## Option B: Manual AWS Console Steps

1. Create an EC2 instance.
   - AMI: Ubuntu Server 24.04 LTS
   - Instance type: `t3.small` for safest compatibility, or `t4g.small` for cheaper ARM/Graviton
   - Storage: 30-50 GB gp3 EBS
   - Key pair: create or choose an SSH key

2. Security group inbound rules.
   - SSH `22`: your IP only
   - HTTP `80`: `0.0.0.0/0` and `::/0`
   - HTTPS `443`: `0.0.0.0/0` and `::/0`
   - Do not expose Postgres `5432` or MinIO `9000/9001`

3. Allocate and associate an Elastic IP.

4. Point DNS to the Elastic IP.
   - `A` record: `your-domain.com` -> Elastic IP
   - Wait until `nslookup your-domain.com` returns the Elastic IP

## Server Setup

SSH into the instance:

```bash
ssh -i /path/to/key.pem ubuntu@YOUR_ELASTIC_IP
```

Install Git first, then clone or copy the repository:

```bash
sudo apt-get update
sudo apt-get install -y git
git clone <YOUR_REPO_URL> proposal-management
cd proposal-management
```

Install Docker and firewall rules:

```bash
sudo sh scripts/aws-ec2-bootstrap.sh
```

Create production env:

```bash
cp .env.prod.example .env.prod
nano .env.prod
```

Fill at least:

- `APP_DOMAIN`
- `ACME_EMAIL`
- `POSTGRES_PASSWORD`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `SEED_ADMIN_PASSWORD`
- `SEED_SUPPLIER_PASSWORD`
- `MINIO_ROOT_USER`
- `MINIO_ROOT_PASSWORD`

Avoid `$` in `.env.prod` secrets unless you know how to escape it for Docker Compose interpolation. `openssl rand -base64 48` is fine, but if it outputs `$`, generate again or replace that character.

Generate secrets on the EC2 instance:

```bash
openssl rand -base64 48
```

Deploy:

```bash
sh scripts/deploy-prod.sh
```

Check:

```bash
curl -fsS https://YOUR_DOMAIN/api/health
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f app
```

After first successful seed, set this in `.env.prod` to avoid resetting seed passwords on every deploy:

```bash
RUN_DB_SEED="false"
```

Then redeploy:

```bash
sh scripts/deploy-prod.sh
```

## Backup

Run:

```bash
sh scripts/backup-prod.sh
```

The script writes:

- `backups/postgres-YYYYMMDD-HHMMSS.sql`
- `backups/minio-YYYYMMDD-HHMMSS.tgz`

For a real demo, copy backups off the EC2 instance:

```bash
scp -i /path/to/key.pem ubuntu@YOUR_ELASTIC_IP:/home/ubuntu/proposal-management/backups/*.sql .
scp -i /path/to/key.pem ubuntu@YOUR_ELASTIC_IP:/home/ubuntu/proposal-management/backups/*.tgz .
```

## Updating The App

```bash
git pull
sh scripts/deploy-prod.sh
```

## Troubleshooting

If HTTPS is not issued:

- Confirm DNS points to the Elastic IP
- Confirm security group allows 80 and 443
- Check Caddy logs:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f caddy
```

If login shows server error:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f postgres app
```

If uploaded images are missing:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f minio app
```
